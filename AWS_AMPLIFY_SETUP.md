# AWS Amplify Integration Guide — SpeechWeb

This guide walks through connecting SpeechWeb to **AWS Amplify** for cloud hosting and backend services, and integrating **Amazon Transcribe** for real speech-to-text.

---

## Prerequisites

- Node.js >= 18
- npm
- An AWS account with admin access
- AWS CLI installed and configured (`aws configure`)
- Amplify CLI installed (`npm install -g @aws-amplify/cli`)

---

## Steps

### 1. Initialize Amplify in the project

```bash
# From the project root
amplify init
```

- Name: `speechweb`
- Environment: `dev`
- Default editor: your choice
- App type: `javascript`
- Framework: `react`
- Source path: `src`
- Distribution dir: `dist`
- Build command: `npm run build`
- Start command: `npm run dev`

### 2. Add Authentication

```bash
amplify add auth
```

Choose **Default configuration** with email-based sign-in. This protects your API and recording endpoints.

### 3. Add REST API for transcription

```bash
amplify add api
```

- Service: **REST**
- Name: `transcribeapi`
- Path: `/transcribe`
- Lambda source: **Create a new Lambda function**
- Function name: `transcribeFunction`
- Runtime: **Node.js 18**
- Template: **Serverless express function**
- Permissions: allow `transcribe:StartStreamTranscription` and `transcribe:StartTranscriptionJob`

Edit the generated Lambda function (`amplify/backend/function/transcribeFunction/src/app.js`) to accept an audio file and call **Amazon Transcribe**.

### 4. Lambda function logic

The Lambda receives the audio blob via the REST API. It either:

- **Option A (real-time):** Uses `StartStreamTranscription` via WebSocket (preferred for live recording).
- **Option B (batch):** Saves the audio to S3 and calls `StartTranscriptionJob`, then polls for completion.

The guide uses **Option B** for simplicity.

```javascript
// amplify/backend/function/transcribeFunction/src/app.js (key parts)
import { TranscribeClient, StartTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// On POST /transcribe:
// 1. Save the uploaded audio to an S3 bucket
// 2. Start a Transcribe job targeting that S3 file
// 3. Return the job name
// 4. Client polls GET /transcribe/:jobName for the result
```

### 5. Add storage (S3) for audio

```bash
amplify add storage
```

- Name: `audiobucket`
- Authorization: `Auth users only`

### 6. Update the Lambda function policy

Amplify automatically generates a CloudFormation template for the Lambda. Add these permissions to `amplify/backend/function/transcribeFunction/transcribeFunction-cloudformation-template.json`:

```json
{
  "Effect": "Allow",
  "Action": [
    "transcribe:StartTranscriptionJob",
    "transcribe:GetTranscriptionJob",
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": "*"
}
```

### 7. Push the backend

```bash
amplify push
```

This provisions all AWS resources (Cognito, API Gateway, Lambda, S3).

### 8. Install Amplify libraries in the frontend

```bash
npm install aws-amplify @aws-amplify/ui-react
```

### 9. Configure Amplify in the frontend

Edit `src/main.jsx`:

```javascript
import { Amplify } from 'aws-amplify';
import config from './aws-exports';
Amplify.configure(config);
```

### 10. Update the Recorder component

Replace the existing `fetch('/api/transcribe')` call with the Amplify REST API call:

```javascript
import { API } from 'aws-amplify';

// In handleTranscribe:
const data = await API.post('transcribeapi', '/transcribe', {
  body: audioBlob,
  headers: { 'Content-Type': 'audio/webm' }
});
```

### 11. Update vite.config.js for Amplify

```javascript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { './runtimeConfig': './runtimeConfig.browser' }
  }
});
```

### 12. Deploy the frontend to Amplify Hosting

```bash
amplify add hosting
```

- Plugin: **Amazon CloudFront + S3** (for full control) or **Amplify Console** (simpler)

Then deploy:

```bash
amplify publish
```

---

## Transcription Flow Summary

```text
User clicks Record → MediaRecorder captures audio → Blob stored in state
User clicks "Transcribe" → Amplify REST API → API Gateway → Lambda
Lambda uploads to S3 → Starts Amazon Transcribe job → Returns job ID
Client polls for job completion → Lambda fetches transcript from S3
Transcript returned to client → Displayed in TranscriptEditor
```

---

## File Changes Summary

| File | Action |
| --- | --- |
| `src/main.jsx` | Add Amplify.configure() |
| `src/lib/speechClient.js` | Replace fetch with API.post() |
| `src/components/Recorder.jsx` | No changes needed (uses speechClient) |
| `vite.config.js` | Add Amplify alias |
| `amplify/backend/function/transcribeFunction/src/app.js` | Implement Transcribe integration |
| `amplify/backend/storage/` | Auto-generated S3 config |

---

## Environment Variables (for Lambda)

Set these in the Lambda environment or in `amplify/backend/function/transcribeFunction/custom-policies.json`:

- `TRANSCRIBE_BUCKET` — the S3 bucket name (auto-created by Amplify)
