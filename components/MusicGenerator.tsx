"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import * as Tone from "tone";
import * as mm from "@magenta/music/es6";
import _ from "lodash";
import styles from "./MusicGenerator.module.css";

// Constants
const MIN_NOTE = 48;
const MAX_NOTE = 83;
const SEQ_LENGTH = 32;
const HUMANIZE_TIMING = 0.0085;
const N_INTERPOLATIONS = 10;
const CHORD_SYMBOLS = {
  major: "M",
  minor: "m",
  major7th: "M7",
  minor7th: "m7",
  dominant7th: "7",
  sus2: "Msus2",
  sus4: "Msus4",
} as const;

const SAMPLE_SCALE = [
  "C3",
  "D#3",
  "F#3",
  "A3",
  "C4",
  "D#4",
  "F#4",
  "A4",
  "C5",
  "D#5",
  "F#5",
  "A5",
] as const;

const TONICS = [
  "C",
  "C♯ / D♭",
  "D",
  "D♯ / E♭",
  "E",
  "F",
  "F♯ / G♭",
  "G",
  "G♯ / A♭",
  "A",
  "A♯ / B♭",
  "B",
];

// New mapping for root notes to MIDI pitch values
const ROOT_PITCH_MAP: { [key: string]: number } = {
  C: 60,
  "C#": 61,
  Db: 61,
  D: 62,
  "D#": 63,
  Eb: 63,
  E: 64,
  F: 65,
  "F#": 66,
  Gb: 66,
  G: 67,
  "G#": 68,
  Ab: 68,
  A: 69,
  "A#": 70,
  Bb: 70,
  B: 71,
};

type ChordSymbol = keyof typeof CHORD_SYMBOLS;

interface Note {
  pitch: number;
  quantizedStartStep: number | null;
  quantizedEndStep: number | null;
  velocity?: number;
}

interface Sequence extends mm.INoteSequence {}

interface SequenceState {
  notes: Map<
    number,
    {
      pitch: number;
      path: SVGPathElement;
      halo: SVGElement;
    }
  >;
  group: SVGGElement;
  on: boolean;
  sequence: mm.INoteSequence;
}

const MusicGenerator: React.FC = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sequences, setSequences] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [tonicLeft, setTonicLeft] = useState(0);
  const [tonicRight, setTonicRight] = useState(0);
  const [chordLeft, setChordLeft] = useState<ChordSymbol>("major");
  const [chordRight, setChordRight] = useState<ChordSymbol>("major");
  const [tempo, setTempo] = useState(90);
  const [visualSequences, setVisualSequences] = useState<SequenceState[]>([]);
  const [mouseDown, setMouseDown] = useState(false);
  const [activeSequences, setActiveSequences] = useState<Set<number>>(
    new Set()
  );

  // Refs
  const vaeRef = useRef<mm.MusicVAE | null>(null);
  const rnnRef = useRef<mm.MusicRNN | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const samplersRef = useRef<any[]>([]);
  const containerRef = useRef<SVGSVGElement>(null);
  const haloContainerRef = useRef<SVGGElement>(null);
  const toneSequencesRef = useRef<Map<number, Tone.Sequence>>(new Map());

  // Initialize models and audio
  useEffect(() => {
    const initializeModels = async () => {
      try {
        vaeRef.current = new mm.MusicVAE(
          "https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_vae/mel_2bar_small"
        );
        rnnRef.current = new mm.MusicRNN(
          "https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/chord_pitches_improv"
        );

        await vaeRef.current.initialize();
        await rnnRef.current.initialize();

        reverbRef.current = new Tone.Reverb({
          decay: 2.5,
          preDelay: 0.1,
        }).toDestination();
        reverbRef.current.wet.value = 0.2;
        await reverbRef.current.generate();

        samplersRef.current = [buildSamplers(-0.4), buildSamplers(0.4)];

        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing models:", error);
        setIsLoading(false);
      }
    };

    initializeModels();
  }, []);

  const buildSamplers = (pan: number) => {
    const marimbaSamplers = {
      high: buildSampler(
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/marimba-classic-"
      ),
      mid: buildSampler(
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/marimba-classic-mid-"
      ),
      low: buildSampler(
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/marimba-classic-low-"
      ),
    };

    const xylophoneSamplers = {
      high: buildSampler(
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/xylophone-dark-"
      ),
      mid: buildSampler(
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/xylophone-dark-mid-"
      ),
      low: buildSampler(
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/xylophone-dark-low-"
      ),
    };

    const delay = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.2,
      wet: 0.1,
    }).connect(reverbRef.current!);

    Object.values(marimbaSamplers).forEach((sampler) => {
      if (reverbRef.current) {
        sampler.chain(new Tone.Panner(pan), delay, reverbRef.current);
      } else {
        sampler.connect(new Tone.Panner(pan).toDestination());
      }
    });
    // Connect xylophone samplers to reverb, delay and panner
    Object.values(xylophoneSamplers).forEach((sampler) => {
      if (reverbRef.current) {
        sampler.chain(new Tone.Panner(pan), delay, reverbRef.current);
      } else {
        sampler.connect(new Tone.Panner(pan).toDestination());
      }
    });

    return { marimba: marimbaSamplers, xylophone: xylophoneSamplers };
  };

  const buildSampler = (urlPrefix: string) => {
    return new Tone.Sampler(
      _.fromPairs(
        SAMPLE_SCALE.map((n) => [
          n,
          `${urlPrefix}${n.toLowerCase().replace("#", "s")}.mp3`,
        ])
      )
    ).toDestination();
  };

  const generateSpace = useCallback(async () => {
    setIsGenerating(true);

    // Stop all active sequences
    stopAllPlayback();

    if (!vaeRef.current || !rnnRef.current) {
      console.warn("Models not ready");
      setIsGenerating(false);
      return;
    }

    try {
      const chords = [
        mountChord(octaveShift(MIN_NOTE + tonicLeft), chordLeft),
        mountChord(MIN_NOTE + tonicLeft, chordLeft),
        mountChord(octaveShift(MIN_NOTE + tonicRight), chordRight),
        mountChord(MIN_NOTE + tonicRight, chordRight),
      ];

      // Generate sequences for the four corners
      const cornerSequences = await Promise.all([
        generateSeq(chords[0], buildSeed(chords[0])),
        generateSeq(chords[1], buildSeed(chords[1])),
        generateSeq(chords[2], buildSeed(chords[2])),
        generateSeq(chords[3], buildSeed(chords[3])),
      ]);

      // Generate interpolations
      const interpolations = await vaeRef.current.interpolate(
        cornerSequences,
        N_INTERPOLATIONS
      );

      if (containerRef.current && haloContainerRef.current) {
        // Clear existing visualizations
        containerRef.current.innerHTML = "";
        haloContainerRef.current.innerHTML = "";

        const cellSize = 1000 / N_INTERPOLATIONS;
        const margin = cellSize / 30;

        // Create new visualizations
        const newSequences = interpolations.map((noteSeq, idx) => {
          const row = Math.floor(idx / N_INTERPOLATIONS);
          const col = idx - row * N_INTERPOLATIONS;
          const centerX = (col + 0.5) * cellSize + margin;
          const centerY = (row + 0.5) * cellSize + margin;
          const maxRadius = cellSize / 2 - 2 * margin;

          return createVisualization(
            noteSeq,
            centerX,
            centerY,
            maxRadius,
            cellSize,
            col,
            row
          );
        });

        setVisualSequences(newSequences);
      }
    } catch (error) {
      console.error("Error generating space:", error);
    }

    setIsGenerating(false);
  }, [tonicLeft, tonicRight, chordLeft, chordRight]);

  useEffect(() => {
    if (!isLoading) {
      generateSpace();
    }
  }, [isLoading, generateSpace]);

  useEffect(() => {
    if (!isLoading) {
      Tone.Transport.bpm.value = tempo; // Update transport bpm when tempo changes
    }
  }, [tempo, isLoading]);

  // Add mouse event handlers
  useEffect(() => {
    const handleMouseDown = () => setMouseDown(true);
    const handleMouseUp = () => setMouseDown(false);

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      toneSequencesRef.current.forEach((sequence) => {
        sequence.stop();
        sequence.dispose();
      });
      Tone.Transport.stop();
    };
  }, []);

  // Functions

  const buildSlice = (
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number
  ): string => {
    const startX = centerX + Math.cos(startAngle) * radius;
    const startY = centerY + Math.sin(startAngle) * radius;
    const endX = centerX + Math.cos(endAngle) * radius;
    const endY = centerY + Math.sin(endAngle) * radius;
    return `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY} Z`;
  };

  const createVisualization = (
    noteSeq: mm.INoteSequence,
    centerX: number,
    centerY: number,
    maxRadius: number,
    cellSize: number,
    col: number,
    row: number
  ): SequenceState => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const notes = new Map();

    // Create note segments
    noteSeq.notes?.forEach(
      ({ pitch, quantizedStartStep, quantizedEndStep }) => {
        if (!pitch || !isValidNote(pitch, 4)) return;

        const relPitch = (MAX_NOTE - (pitch - MIN_NOTE)) / MAX_NOTE;
        const radius = relPitch * maxRadius;
        const startAngle =
          ((quantizedStartStep ?? 0) / SEQ_LENGTH) * Math.PI * 2;
        const endAngle =
          ((quantizedEndStep ?? SEQ_LENGTH) / SEQ_LENGTH) * Math.PI * 2;

        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        path.setAttribute(
          "d",
          buildSlice(centerX, centerY, startAngle, endAngle, radius)
        );
        path.setAttribute("class", styles.note);
        group.appendChild(path);

        // Create halo effect
        const halo = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        halo.setAttribute("class", styles.halo);
        halo.setAttribute("cx", centerX.toString());
        halo.setAttribute("cy", centerY.toString());
        halo.setAttribute("r", (maxRadius + 2).toString());
        haloContainerRef.current?.appendChild(halo);

        notes.set(quantizedStartStep ?? 0, { pitch, path, halo });
      }
    );

    // Add interaction area
    const pointerArea = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    pointerArea.setAttribute("x", (col * cellSize).toString());
    pointerArea.setAttribute("y", (row * cellSize).toString());
    pointerArea.setAttribute("width", cellSize.toString());
    pointerArea.setAttribute("height", cellSize.toString());
    pointerArea.setAttribute("class", styles.pointerArea);
    group.appendChild(pointerArea);

    // Add event listeners
    const seqState: SequenceState = {
      notes,
      group,
      on: false,
      sequence: noteSeq,
    };
    pointerArea.addEventListener("mousedown", () =>
      toggleSeq(seqState, row * N_INTERPOLATIONS + col)
    );
    pointerArea.addEventListener("mouseover", () => {
      toggleHover(seqState, true);
      mouseDown && toggleSeq(seqState, row * N_INTERPOLATIONS + col);
    });
    pointerArea.addEventListener("mouseout", () =>
      toggleHover(seqState, false)
    );

    containerRef.current?.appendChild(group);
    return seqState;
  };

  // Helper functions
  const isValidNote = (note: number, forgive = 0): boolean => {
    return note <= MAX_NOTE + forgive && note >= MIN_NOTE - forgive;
  };

  const octaveShift = (note: number): number => {
    const shift = MAX_NOTE - note > note - MIN_NOTE ? 12 : -12;
    let delta = 0;
    while (isValidNote(note + delta + shift)) {
      delta += shift;
    }
    return note + delta;
  };

  const mountChord = (tonic: number, chord: ChordSymbol): string => {
    const noteName = Tone.Frequency(tonic, "midi").toNote().replace(/\d+$/, "");
    return noteName + CHORD_SYMBOLS[chord];
  };

  const toggleSeq = (seqObj: SequenceState, index: number) => {
    seqObj.on = !seqObj.on;
    seqObj.group.setAttribute("class", seqObj.on ? styles.on : "");

    if (seqObj.on) {
      startPlayback(seqObj.sequence, index);
      setActiveSequences((prev) => new Set(prev).add(index));
    } else {
      stopPlayback(index);
      setActiveSequences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  const toggleHover = (seqObj: SequenceState, on: boolean) => {
    const cls = seqObj.group.getAttribute("class") || "";
    if (on && !cls.includes(styles.hover)) {
      seqObj.group.setAttribute("class", `${cls} ${styles.hover}`.trim());
    } else if (!on && cls.includes(styles.hover)) {
      seqObj.group.setAttribute("class", cls.replace(styles.hover, "").trim());
    }
  };

  const generateSeq = async (
    chord: string,
    seed: mm.INoteSequence
  ): Promise<mm.INoteSequence> => {
    const generated = await rnnRef.current?.continueSequence(
      seed,
      SEQ_LENGTH,
      tempo / 60,
      [chord]
    );
    if (generated) {
      generated.tempos = [{ time: 0, qpm: tempo }];
      return generated;
    }
    return {
      notes: [],
      totalTime: SEQ_LENGTH / 4,
      tempos: [{ time: 0, qpm: tempo }],
    };
  };

  const buildSeed = (chord: string): mm.INoteSequence => {
    const rootMatch = chord.match(/^([A-G][#b]?)/);
    const root = rootMatch ? rootMatch[1] : "C";
    let pitch = ROOT_PITCH_MAP[root] || 60;

    while (pitch < MIN_NOTE) pitch += 12;
    while (pitch > MAX_NOTE) pitch -= 12;

    const noteDuration = 60 / tempo; // Duration of a quarter note in seconds
    const seedDuration = (SEQ_LENGTH / 4) * noteDuration; // Total duration of the seed in seconds
    const numNotes = Math.max(1, Math.floor(seedDuration / (noteDuration / 2))); // Number of eighth notes that fit in the seed duration

    const notes = [];
    for (let i = 0; i < numNotes; i++) {
      notes.push({
        pitch: pitch,
        startTime: i * (noteDuration / 2),
        endTime: (i + 1) * (noteDuration / 2),
        velocity: 100,
      });
    }

    return mm.sequences.quantizeNoteSequence(
      {
        notes: notes,
        totalTime: seedDuration,
        tempos: [{ time: 0, qpm: tempo }],
        timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
      },
      4
    );
  };

  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  const startPlayback = (sequence: mm.INoteSequence, index: number) => {
    const notes = sequence.notes || [];
    const toneNotes = notes.map((note) => ({
      time: (note.quantizedStartStep ?? 0) * Tone.Time("4n").toSeconds(),
      note: note.pitch ? Tone.Frequency(note.pitch, "midi").toNote() : "C4",
      velocity: note.velocity ? note.velocity / 100 : 0.7,
      duration: Math.min(
        ((note.quantizedEndStep ?? SEQ_LENGTH) -
          (note.quantizedStartStep ?? 0)) *
          Tone.Time("4n").toSeconds(),
        0.5
      ),
    }));

    const newSequence = new Tone.Sequence((time, event) => {
      if (event.note) {
        // Add humanization
        const delay = Math.random() * HUMANIZE_TIMING;
        const durationVariation = 0.95 + Math.random() * 0.1;

        // Alternate between marimba and xylophone
        const samplerGroup =
          Math.random() > 0.5
            ? samplersRef.current[0].marimba
            : samplersRef.current[0].xylophone;

        // Select sampler based on pitch
        let sampler;
        if (Tone.Frequency(event.note).toMidi() >= 72) {
          sampler = samplerGroup.high;
        } else if (Tone.Frequency(event.note).toMidi() >= 60) {
          sampler = samplerGroup.mid;
        } else {
          sampler = samplerGroup.low;
        }

        sampler.triggerAttackRelease(
          event.note,
          event.duration * durationVariation,
          time + delay,
          event.velocity
        );
      }
    }, toneNotes).start(0);

    newSequence.playbackRate = tempo / 120; // Adjust playback rate based on tempo
    toneSequencesRef.current.set(index, newSequence);

    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  };

  const stopPlayback = (index: number) => {
    if (toneSequencesRef.current.has(index)) {
      toneSequencesRef.current.get(index)?.stop();
      toneSequencesRef.current.get(index)?.dispose();
      toneSequencesRef.current.delete(index);
    }

    if (toneSequencesRef.current.size === 0) {
      Tone.Transport.stop();
    }
  };

  const stopAllPlayback = () => {
    toneSequencesRef.current.forEach((sequence, index) => {
      sequence.stop();
      sequence.dispose();
    });
    toneSequencesRef.current.clear();
    setActiveSequences(new Set());
    Tone.Transport.stop();
  };

  const renderControlButtons = (side: "left" | "right") => {
    const tonic = side === "left" ? tonicLeft : tonicRight;
    const setTonic = side === "left" ? setTonicLeft : setTonicRight;
    const chord = side === "left" ? chordLeft : chordRight;
    const setChord = side === "left" ? setChordLeft : setChordRight;

    return (
      <div className={styles.controlGroup}>
        <div className={styles.tonicButtons}>
          {TONICS.map((tonicName, index) => (
            <button
              key={index}
              className={`${styles.tonicButton} ${
                styles[`tonic${side.charAt(0).toUpperCase() + side.slice(1)}`]
              } ${tonic === index ? styles.active : ""}`}
              onClick={() => setTonic(index)}
            >
              {tonicName}
            </button>
          ))}
        </div>
        <div className={styles.chordButtons}>
          {Object.keys(CHORD_SYMBOLS).map((chordType) => (
            <button
              key={chordType}
              className={`${styles.chordButton} ${
                styles[`chord${side.charAt(0).toUpperCase() + side.slice(1)}`]
              } ${chord === chordType ? styles.active : ""}`}
              onClick={() => setChord(chordType as ChordSymbol)}
            >
              {chordType}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render
  if (isLoading) {
    return <div className={styles.loading}>Loading models...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>{renderControlButtons("left")}</div>
      <div className={styles.mainContent}>
        <svg className={styles.vis} viewBox="0 0 1000 1000" ref={containerRef}>
          <defs>
            <radialGradient id="halo">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.5)" />
              <stop offset="95%" stopColor="rgba(255, 255, 255, 0.5)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
          </defs>
          <g id="vis-halos" ref={haloContainerRef}></g>
          <g id="vis-elements"></g>
        </svg>
        <div className={styles.outputControls}>
          <div className={`${styles.outputControl} ${styles.midiRequired}`}>
            <label htmlFor="output-selector">Output</label>
            <select id="output-selector"></select>
          </div>
          <div className={styles.outputControl}>
            <label htmlFor="tempo-source-selector">Tempo</label>
            <select
              id="tempo-source-selector"
              className={styles.midiRequired}
            ></select>
            <div className={styles.tempoControl}>
              <input
                id="tempo-selector"
                type="range"
                min="10"
                max="200"
                step="1"
                value={tempo}
                onChange={(e) => {
                  const newTempo = Number.parseInt(e.target.value);
                  setTempo(newTempo);
                  Tone.Transport.bpm.value = newTempo;
                  toneSequencesRef.current.forEach((seq) => {
                    seq.playbackRate = newTempo / 120;
                  });
                }}
              />

              <span className={styles.tempoLabel}>{tempo}</span>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.controls}>{renderControlButtons("right")}</div>
      {isGenerating && <div className={styles.generating}>Generating...</div>}
    </div>
  );
};

export default MusicGenerator;
