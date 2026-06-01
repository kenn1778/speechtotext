# SpeechWeb App Plan

## Overview

SpeechWeb is a web application built with React.js, Tailwind CSS, and modern animation tooling. The app records audio from the user, converts speech to text, and generates printable output in PDF or slide format. The interface uses a refined monochrome palette with black, white, gray, dust, glow, and scratch textures, combined with smooth motion and animation transitions.

## Project Goals

- Capture audio reliably in the browser.
- Convert recorded speech to accurate text using speech recognition or transcription API.
- Provide downloadable output as a styled PDF or presentation-style slide deck.
- Maintain a polished visual identity using dark/neutral tones and animated interface elements.
- Follow strong ethical standards for privacy, accessibility, and responsible use.

## Architecture

1. **Frontend**
   - React.js application.
   - Tailwind CSS for utility-first styling and responsive layout.
   - Animation library such as `react-reanimate` or an equivalent modern animation plugin.
   - Optional animation toolkits: Framer Motion, Lottie, React Spring, GSAP.

2. **Speech Capture**
   - Browser Web Audio API or MediaRecorder API for audio recording.
   - Offline-first recording flow with visual feedback.

3. **Transcription**
   - Client-side speech recognition if supported by the browser.
   - Alternatively, send audio to a transcription service / speech-to-text API.
   - Display live or post-recording transcript results.

4. **Output Generation**
   - Generate styled PDF using a library such as `jspdf`, `pdf-lib`, or `html-to-pdf`.
   - Generate slide output using HTML/CSS page templates or frameworks like `reveal.js` for export preview.
   - Provide download links for PDF and slide packages.

## User Flow

1. **Welcome Screen**
   - Dark monochrome landing page with subtle dust, glow, and scratch textures.
   - Primary call-to-action to start recording.

2. **Record Session**
   - Request microphone permission.
   - Show recording indicator and real-time waveform or pulse animation.
   - Allow pause/resume and finalize recording.

3. **Transcription**
   - Show a loading state while the audio is transcribed.
   - Display the converted text with editing controls.
   - Allow users to correct text before export.

4. **Export**
   - Provide buttons for `Download PDF` and `Create Slides`.
   - Offer a preview of the PDF or slide deck before download.
   - Maintain visual styling in the exported output.

## UI / Visual Theme

- Primary palette: black, white, gray.
- Texture design: dust, glow, scratches, subtle noise.
- Animations: smooth transitions, fade-ins, parallax micro-interactions.
- Layout: minimal, legible, with strong contrast and refined typography.
- Motion style: elegant and deliberate, not overwhelming.

## Recommended Packages & Dependencies

- `react` — core UI framework.
- `react-dom` — DOM renderer.
- `tailwindcss` — styling and utility classes.
- `autoprefixer` / `postcss` — Tailwind build tooling.
- `react-reanimate` — primary animation library, if available.
- `framer-motion` — advanced motion and gesture animations.
- `lottie-react` — vector and JSON-based animation playback.
- `react-spring` — physics-based motion for smooth interactions.
- `gsap` — advanced timeline animation plugin.
- `jspdf` or `pdf-lib` — PDF generation.
- `html2canvas` — convert DOM sections into canvas for PDF output.
- `reveal.js` or custom slide template library — slide generation.
- `axios` or `fetch` — API communication.

### Optional supporting dependencies

- `zustand` or `jotai` — lightweight state management.
- `clsx` or `classnames` — conditional className utilities.
- `@heroicons/react` — clean iconography.
- `usehooks-ts` — reusable hooks for browser APIs.

## Best Animation Plugins

- `Framer Motion` — best for UI transitions, layout animations, and motion design.
- `Lottie` — best for animated vector assets and high-quality effects.
- `GSAP` — best for timeline control, scroll-based motion, and advanced performance.
- `React Spring` — best for fluid, physics-based interactions.
- `React Reanimate` (or `react-reanimate`) — if the project specifically requires this library for custom transitions.

## Updated Features to Include

- Responsive and accessible interface.
- Real-time recording status and progress indicators.
- Editable transcription output.
- Export options: PDF, slide deck, text file.
- Dark-mode-inspired black/white/gray theme with glow and texture overlays.
- Smooth motion and animated transitions across the app.
- Micro-interactions for buttons and list items.
- Offline-aware recording experience.

## Technical Steps

1. **Set up the React app**
   - Create app with Vite or Create React App.
   - Install Tailwind CSS and configure.
   - Add core dependencies for recording and export.

2. **Build the recording module**
   - Implement microphone access.
   - Record audio into memory or blob.
   - Provide user controls for start, pause, stop.

3. **Implement transcription**
   - Connect to browser speech recognition or external API.
   - Handle transcript results and error states.
   - Show transcript editing and confirmation.

4. **Build export workflows**
   - Create PDF generator and slide generator modules.
   - Ensure exports preserve dark theme and typography.
   - Attach downloads to UI controls.

5. **Apply styling and animation**
   - Use Tailwind utilities and custom CSS for texture effects.
   - Add animations with `react-reanimate` / Framer Motion.
   - Create overlay dust, glow, and scratch effects.

6. **Validate and test**
   - Test microphone permissions across browsers.
   - Validate PDF export on desktop and mobile.
   - Check readability and accessibility.

## Ethics and Responsible Use

### Privacy

- Only record audio with explicit user consent.
- Clearly disclose what data is captured.
- Do not store recordings or transcripts without permission.
- Use secure transport (HTTPS) for any external API requests.
- Allow users to delete recordings and transcripts immediately.

### Transparency

- Explain how transcription works.
- Indicate when audio is sent to a remote service.
- Provide a privacy notice if any data leaves the browser.

### Accessibility

- Ensure keyboard navigation and focus states.
- Use high contrast text on dark backgrounds.
- Provide captions and readable transcript text.
- Avoid motion that causes discomfort; offer reduced-motion mode.

### Responsible Design

- Resist using misleading or aggressive UI patterns.
- Do not auto-record without clear user action.
- Respect user control over sharing and exporting content.
- Make the app usable for people with different abilities.

## Suggested Folder Structure

- `/src`
  - `App.jsx`
  - `index.jsx`
  - `styles.css`
  - `/components`
    - `Recorder.jsx`
    - `TranscriptEditor.jsx`
    - `ExportControls.jsx`
    - `ThemeOverlay.jsx`
  - `/lib`
    - `speechService.js`
    - `pdfService.js`
    - `slideService.js`
    - `animationConfig.js`

## Design Notes

- Use layered backgrounds with noise and scratch textures.
- Keep the layout minimal and centered.
- Let animation guide the user without distracting from the task.
- Use muted gray tones for surfaces and high-contrast white for text.
- Add subtle glow to active controls, and dusty overlays to reinforce the aesthetic.

## Conclusion

SpeechWeb should be a visually striking yet functional React application that turns recorded speech into text, then exports that text as a PDF or slide deck. By combining React, Tailwind, modern animation libraries, and careful ethical design, the app can deliver both polish and user trust.
