"use client";

import dynamic from "next/dynamic";

const MusicGenerator = dynamic(() => import("./MusicGenerator"), {
  ssr: false,
});

export default function ClientMusicGenerator() {
  return <MusicGenerator />;
}
