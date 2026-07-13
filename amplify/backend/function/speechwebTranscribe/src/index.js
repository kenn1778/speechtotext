const jwt = require('jsonwebtoken');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const crypto = require('crypto');

const REGION = process.env.REGION || 'us-east-1';
const USER_POOL_ID = process.env.USER_POOL_ID || 'us-east-1_g2QvSscNA';
const s3 = new S3Client({ region: REGION });

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

function isAuthorized(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  return verifyToken(authHeader.slice(7)).then(payload => payload !== null);
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

function getCorsHeaders(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const allowed = origin && ALL_ORIGINS.includes(origin) ? origin : ALL_ORIGINS[0] || '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
  };
}

exports.handler = async (event) => {
  const corsHeaders = getCorsHeaders(event);

  try {
    const authorized = await isAuthorized(event);
    if (!authorized) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const method = event.httpMethod;
    const path = event.path;

    if (method === 'POST' && path === '/transcribe') {
      return await handleTranscribe(event, corsHeaders);
    }
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function handleTranscribe(event, corsHeaders) {
  const audioBase64 = event.body;
  if (!audioBase64) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No audio data' }),
    };
  }

  if (typeof audioBase64 !== 'string' || audioBase64.length > 10 * 1024 * 1024) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid audio data' }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Transcription service unavailable' }),
    };
  }

  const contentType = event.headers['content-type'] || 'audio/webm';
  const jobName = `transcribe-${crypto.randomUUID()}`;
  const bucketName = process.env.STORAGE_BUCKET;
  const key = `audio/${jobName}.webm`;

  const audioBuffer = Buffer.from(audioBase64, 'base64');
  if (audioBuffer.length === 0 || audioBuffer.length > 10 * 1024 * 1024) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid audio data' }),
    };
  }

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: audioBuffer,
    ContentType: contentType,
  }));

  const whisperText = await transcribeWithWhisper(audioBuffer, apiKey);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      status: 'COMPLETED',
      transcript: whisperText,
      audioFile: key,
      jobName,
    }),
  };
}

function transcribeWithWhisper(audioBuffer, apiKey) {
  const boundary = `----FormBoundary${crypto.randomUUID()}`;
  const bodyParts = [];
  bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`));
  bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n`));
  bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\ntext\r\n`));
  bodyParts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n`));
  bodyParts.push(audioBuffer);
  bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  const body = Buffer.concat(bodyParts);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data.trim());
        } else {
          reject(new Error('Transcription failed'));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
