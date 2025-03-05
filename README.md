Jive: Generate Tunes with Generative AI - RNNs and Deep Learning - NSBE Hacks 2025
Deployed at: [jive-nsbe.firebaseapp.com](https://jive-nsbe.firebaseapp.com/)

![Screen shot of Jive AI in action](https://raw.githubusercontent.com/MadhavKanna/Jive.ai/refs/heads/main/public/jive-ss.png)

Have you ever wondered what tunes you could spin up exploring specific frequencies? 
Jive.ai looks at exploring the interpolation of sounds between two chord-key pairs. Based off the interpolation between frequency pairs, a two-step generative AI process is followed, using a combination of VAEs(Variational auto encoders) and RNNs(Recurrent Neural Nets) to generate tunes that sound real and beautiful. 

Find the code here: https://github.com/MadhavKanna/Jive.ai

The generative models are provided by Majenta.js, and I've taken heavy very heavy inspiration from the ideas at https://magenta.tensorflow.org/js-announce


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
If you want to run this app locally, do the following:
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
