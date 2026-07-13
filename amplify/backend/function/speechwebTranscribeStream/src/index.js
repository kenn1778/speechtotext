const jwt = require('jsonwebtoken');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} = require('@aws-sdk/client-transcribe');
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require('@aws-sdk/client-apigatewaymanagementapi');

const REGION = process.env.REGION || 'us-east-1';
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_g2QvSscNA';
const BUCKET = process.env.STORAGE_BUCKET;
const s3 = new S3Client({ region: REGION });
const transcribe = new TranscribeClient({ region: REGION });

const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;
const ISS = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

let jwksCache = null;
let jwksCacheTime = 0;
const CACHE_TTL = 3600000;

async function getJwks() {
  const now = Date.now();
  if (jwksCache && now - jwksCacheTime < CACHE_TTL) return jwksCache;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  const { keys } = await res.json();
  jwksCache = keys;
  jwksCacheTime = now;
  return keys;
}

function getKey(keys, kid) {
  const key = keys.find(k => k.kid === kid);
  if (!key) return null;
  const { kty, n, e, alg } = key;
  return { key: { kty, n, e }, alg };
}

async function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) return null;
  const keys = await getJwks();
  const { key, alg } = getKey(keys, decoded.header.kid);
  if (!key) return null;
  try {
    return jwt.verify(token, key, { algorithms: [alg || 'RS256'], issuer: ISS });
  } catch {
    return null;
  }
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://d139i2fhyuv4er.cloudfront.net',
  'https://text2speech.duckdns.org',
];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [];
const ALL_ORIGINS = [...new Set([...allowedOrigins, ...envOrigins])];

function getCorsHeaders(origin) {
  const allowed = origin && ALL_ORIGINS.includes(origin) ? origin : ALL_ORIGINS[0] || '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

exports.handler = async (event) => {
  const routeKey = event.requestContext?.routeKey;
  const connectionId = event.requestContext?.connectionId;
  const domainName = event.requestContext?.domainName;
  const stage = event.requestContext?.stage;
  const origin = event.headers?.origin || event.headers?.Origin || '';

  const corsHeaders = getCorsHeaders(origin);

  if (!connectionId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No connection ID' }) };
  }

  const apiGw = new ApiGatewayManagementApiClient({
    region: REGION,
    endpoint: `https://${domainName}/${stage}`,
  });

  const sendMessage = async (data) => {
    try {
      await apiGw.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data)),
      }));
    } catch (err) {
      if (err.name === 'GoneException') {
        console.log(`Connection ${connectionId} is gone`);
      }
    }
  };

  try {
    if (routeKey === '$connect') {
      const token = event.queryStringParameters?.token;
      if (!token) {
        return { statusCode: 401, headers: corsHeaders, body: 'Unauthorized' };
      }
      const payload = await verifyToken(token);
      if (!payload) {
        return { statusCode: 401, headers: corsHeaders, body: 'Unauthorized' };
      }
      return { statusCode: 200, headers: corsHeaders, body: 'OK' };
    }

    if (routeKey === '$disconnect') {
      const text = await processTranscription(connectionId);
      if (text) {
        await sendMessage({ type: 'final', text });
      }
      await sendMessage({ type: 'end', text: text || '' });
      return { statusCode: 200, headers: corsHeaders, body: 'OK' };
    }

    if (routeKey === '$default') {
      const body = event.body;
      if (body) {
        const buffer = Buffer.from(body, 'base64');
        const key = `stream/${connectionId}.pcm`;
        try {
          const existing = await s3.send(new GetObjectCommand({
            Bucket: BUCKET,
            Key: key,
          }));
          const existingData = await streamToBuffer(existing.Body);
          const combined = Buffer.concat([existingData, buffer]);
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: combined,
            ContentType: 'application/octet-stream',
          }));
        } catch (err) {
          if (err.name === 'NoSuchKey') {
            await s3.send(new PutObjectCommand({
              Bucket: BUCKET,
              Key: key,
              Body: buffer,
              ContentType: 'application/octet-stream',
            }));
          } else {
            throw err;
          }
        }
      }
      return { statusCode: 200, headers: corsHeaders, body: 'OK' };
    }

    return { statusCode: 400, headers: corsHeaders, body: 'Unknown route' };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function processTranscription(connectionId) {
  const key = `stream/${connectionId}.pcm`;
  const jobName = `stream-${connectionId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  try {
    const startCmd = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: `s3://${BUCKET}/${key}` },
      MediaFormat: 'pcm',
      MediaSampleRateHertz: 16000,
      LanguageCode: 'en-US',
      OutputBucketName: BUCKET,
      OutputKey: `transcripts/${jobName}.json`,
    });

    await transcribe.send(startCmd);

    let transcriptText = '';
    let completed = false;
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const job = await transcribe.send(new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      }));

      const status = job.TranscriptionJob?.TranscriptionJobStatus;

      if (status === 'COMPLETED') {
        const result = await s3.send(new GetObjectCommand({
          Bucket: BUCKET,
          Key: `transcripts/${jobName}.json`,
        }));
        const body = await streamToBuffer(result.Body);
        const data = JSON.parse(body.toString());
        transcriptText = (data.results?.transcripts || [])
          .map((t) => t.transcript)
          .join(' ');
        completed = true;
        break;
      } else if (status === 'FAILED') {
        throw new Error('Transcription job failed');
      }
    }

    if (!completed) {
      throw new Error('Transcription job timed out');
    }

    return transcriptText;
  } catch (err) {
    console.error('Transcription error:', err);
    throw err;
  } finally {
    try {
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }));
      await s3.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: `transcripts/${jobName}.json`,
      }));
    } catch {}
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
