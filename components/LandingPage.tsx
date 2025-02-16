import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
      <header className="container mx-auto px-4 py-8">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Jive</h1>
        </nav>
      </header>
      <main className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Jive: Generate Tunes with RNNs and Deep Learning
        </h2>
        <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
          Create and combine unique compositions using advanced generative
          models.
        </p>
        <div className="relative w-full max-w-2xl mx-auto aspect-video mb-12">
          <Image
            src="/music-generation.png"
            alt="AI Music Generation"
            width="672"
            height="378"
            objectFit="cover"
            className="rounded-lg shadow-2xl"
          />
        </div>
        <div className="mb-12 text-left max-w-2xl mx-auto">
          <h3 className="text-4xl font-bold mb-4 text-gray-800 dark:text-gray-100">
            How to?
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
            <li className="text-xl">
              Choose the two pairs of chords and keys you want to interpolate
              between
            </li>
            <li className="text-xl">
              Combine audio outputs from 100s of interpolations by just clicking
              on the audio visualizations
            </li>
            <li className="text-xl">
              Mess around and make tunes powered by Magenta JS's Deep Learning
              and RNNs models hosted on the cloud. Just for you
            </li>
          </ol>
        </div>
        <Button asChild size="lg" className="text-lg px-8 py-6">
          <Link href="/generate">Get Started</Link>
        </Button>
      </main>
    </div>
  );
}
