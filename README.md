# SpeechWeb

Record speech, transcribe it, and export as PDF or slides.

**Live site:** https://text2speech.duckdns.org  
**CloudFront fallback:** https://d139i2fhyuv4er.cloudfront.net  
**GitHub:** https://github.com/kenn1778/speechtotextkennedy

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion, Lottie React |
| PDF export | jsPDF |
| Audio capture | MediaRecorder + Web Speech API |
| Auth | AWS Cognito (via Amplify) |
| Backend | AWS Lambda + API Gateway + S3 (via Amplify) |
| Hosting | S3 + CloudFront (via Amplify) |
| SSL | Let's Encrypt (imported to ACM) |
| DNS | DuckDNS (free dynamic DNS) |

---

## Local Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
# Install dependencies
npm install

# Start dev server (hot reload at http://localhost:5173)
npm run dev
```

### Build for production

```bash
npm run build        # outputs to dist/
npm run preview      # preview the build locally
```

---

## Deployment — Full Pipeline

### 1. Prerequisites (one-time)

Install and configure the Amplify CLI:

```bash
npm install -g @aws-amplify/cli
amplify configure
```

### 2. Deploy frontend + backend to AWS

```bash
# Push any backend changes (Cognito, API, Lambda, S3)
amplify push --yes

# Build and publish frontend to S3 + CloudFront
amplify publish --yes
```

After publish, the app is live at the CloudFront URL shown in the output (e.g. `https://d139i2fhyuv4er.cloudfront.net`).

### 3. Quick deploy (code changes only)

If only frontend code changed (no Amplify infrastructure changes):

```bash
amplify publish --yes
```

This runs `npm run build` then uploads `dist/` to S3 and invalidates the CloudFront cache.

---

## Custom Domain — DuckDNS + Let's Encrypt

The app uses a free DuckDNS subdomain with a Let's Encrypt SSL certificate imported into AWS ACM.

### How it was set up

```
User types https://text2speech.duckdns.org
  → DuckDNS A record resolves to a CloudFront IP
  → CloudFront accepts the Host header (configured as alternate domain)
  → CloudFront terminates TLS using the ACM-imported Let's Encrypt cert
  → CloudFront serves files from the S3 bucket
```

### If you need to do it again (new DuckDNS domain)

#### 1. Register a DuckDNS domain

1. Go to https://duckdns.org
2. Sign in (GitHub / Google / Twitter)
3. Register a subdomain (e.g. `myapp.duckdns.org`)
4. Copy your **token**

#### 2. Point DuckDNS to CloudFront

```bash
# Resolve one of the CloudFront IPs
Resolve-DnsName d139i2fhyuv4er.cloudfront.net -Type A

# Update DuckDNS A record with that IP
curl.exe -sL "https://duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN&ip=CLOUDFRONT_IP"
```

> Note: DuckDNS only supports A records (single IPv4). CloudFront has multiple edge IPs, so this is a best-effort setup. For production, use Route53 or any DNS that supports CNAME records.

#### 3. Get an SSL certificate (Let's Encrypt)

```bash
# Clone acme.sh
git clone https://github.com/acmesh-official/acme.sh.git

# Issue certificate via DuckDNS DNS-01 challenge
export DuckDNS_Token="YOUR_DUCK_DNS_TOKEN"
bash acme.sh --issue --dns dns_duckdns -d myapp.duckdns.org --server letsencrypt --keylength 2048
```

The certificate files will be at `~/.acme.sh/myapp.duckdns.org/`:
- `fullchain.cer` — server cert + intermediate chain
- `myapp.duckdns.org.key` — private key

#### 4. Import certificate into AWS ACM

```bash
aws acm import-certificate \
  --region us-east-1 \
  --certificate fileb://~/.acme.sh/myapp.duckdns.org/myapp.duckdns.org.cer \
  --private-key fileb://~/.acme.sh/myapp.duckdns.org/myapp.duckdns.org.key \
  --certificate-chain fileb://~/.acme.sh/myapp.duckdns.org/ca.cer
```

> ACM region **must be `us-east-1`** — CloudFront only accepts certificates from this region.

#### 5. Add the domain to CloudFront

```bash
# Get current CloudFront distribution config
aws cloudfront get-distribution-config --id DISTRIBUTION_ID > cf-config.json

# Edit cf-config.json:
#   1. Add "myapp.duckdns.org" to Aliases.Items
#   2. Set ViewerCertificate to use the ACM certificate ARN
#   3. Set SSLSupportMethod to "sni-only"

# Apply the change
aws cloudfront update-distribution \
  --id DISTRIBUTION_ID \
  --if-match ETAG_FROM_GET \
  --distribution-config file://cf-update.json
```

Wait ~5 minutes for CloudFront deployment (`Deployed` status).

#### 6. Verify

```bash
curl -sI https://myapp.duckdns.org
# Should return HTTP/1.1 200 OK with X-Cache: Hit from cloudfront
```

---

## SSL Certificate Renewal

Let's Encrypt certificates are valid for **90 days**. To renew:

```bash
export DuckDNS_Token="YOUR_DUCK_DNS_TOKEN"
bash acme.sh --renew --dns dns_duckdns -d myapp.duckdns.org --server letsencrypt
```

Then re-import into ACM (step 4 above) and optionally create an IAM server certificate as backup:

```bash
aws iam upload-server-certificate \
  --server-certificate-name text2speech-YYYYMMDD \
  --certificate-body fileb://~/.acme.sh/myapp.duckdns.org/myapp.duckdns.org.cer \
  --private-key fileb://~/.acme.sh/myapp.duckdns.org/myapp.duckdns.org.key \
  --certificate-chain fileb://~/.acme.sh/myapp.duckdns.org/fullchain.cer
```

> Note: ACM-imported certificates must be re-imported before expiry. There is no auto-renewal. Consider setting a calendar reminder for day 60.

---

## AWS Resources

| Resource | Name / ID |
|----------|-----------|
| Amplify App ID | `d1571gurmhoepz` |
| CloudFront Distribution | `E1YG4114575KZ4` |
| S3 Bucket (hosting) | `kenn-text-speech-dev-...` (via Amplify) |
| S3 Bucket (deployment) | `amplify-speechweb-dev-45acd-deployment` |
| Cognito User Pool | `speechwebAuth` |
| Lambda Function | `speechwebTranscribe` |
| ACM Certificate | `arn:aws:acm:us-east-1:352206182975:certificate/...` |
| IAM Certificate | `text2speech-duckdns-org` |

---

## Architecture

```
Browser ──https──▶ CloudFront ──▶ S3 (static files)
                     │
                     └── ACM (Let's Encrypt SSL cert)
                     │
                     └── DuckDNS (A record → CloudFront IP)

Recording flow:
  MediaRecorder captures audio
  → SpeechRecognition API transcribes live (browser-native)
  → Transcript appears in editor in real-time

Transcription flow (API):
  Recorded blob → REST API → Lambda → S3 → OpenAI Whisper → Transcript returned
```

---

## Setup

### 1. OpenAI API Key (required for transcription)

The Lambda function uses OpenAI Whisper to transcribe audio. You need to set your API key:

```bash
aws lambda update-function-configuration \
  --function-name speechweb-transcribe-dev \
  --environment "Variables={REGION=us-east-1,STORAGE_BUCKET=speechweb-audio-dev-352206182975,OPENAI_API_KEY=sk-your-key-here}"
```

### 2. Local development

```bash
# Start both frontend + proxy server
npm run dev-all

# Or separately:
npm run dev           # Vite frontend on :5173
npm run start-server  # Express proxy on :5174
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `amplify publish` fails "Cannot find distribution folder" | Check `amplify/.config/project-config.json` has `DistributionDir: "dist"` (not "build") |
| Custom domain returns 403/502 | CloudFront deployment still in progress — wait 5-10 min |
| SSL certificate error on custom domain | Cert expired — renew via acme.sh and re-import to ACM |
| Record button does nothing | Browser may block microphone — check permissions; or try Chrome/Edge (SpeechRecognition not supported in all browsers) |
| Amplify CLI "Cannot prompt in non-interactive shell" | Run the command directly in a terminal instead of via the tool |


Awesome! Record → Whisper → transcript flow is working end-to-end through AWS.
The audio files are being saved to S3 too — you can list them anytime with:
aws s3 ls s3://speechweb-audio-dev-352206182975/audio/
