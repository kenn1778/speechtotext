# SpeechWeb

SpeechWeb is a React.js application using Tailwind CSS and motion animation libraries. The app records audio, converts speech to text, and exports results as PDF or slide output.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```

## Features

- Browser-based audio recording using MediaRecorder
- Speech transcription flow
- Export to PDF and slide deck placeholders
- Dark monochrome theme with dust/glow texture and smooth animations

## Stack

- React
- Vite
- Tailwind CSS
- Framer Motion
- jsPDF
- Lottie React
- React Reanimate

## Mobile responsiveness

- The app is built with Tailwind CSS responsive utilities and tested to adapt across small screens.
- Interactive controls are full-width on small screens for easy tapping; layouts stack vertically where appropriate.
- Keep responsiveness in mind: all future UI changes should include `sm`, `md`, and `lg` responsive checks and manual testing on device sizes before deployment.

Run the dev server and test on mobile browsers or emulators:

```bash
npm run dev
```

To run automated visual breakpoint checks (requires Playwright):

```bash
npm run visual:check
```

This script captures screenshots at mobile, tablet, and desktop viewports and writes them to the `visual-checks/` folder.
