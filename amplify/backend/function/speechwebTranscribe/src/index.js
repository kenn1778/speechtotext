const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');
const crypto = require('crypto');

const s3 = new S3Client({ region: process.env.REGION || 'us-east-1' });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
  'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
};

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const path = event.path;

    if (method === 'POST' && path === '/transcribe') {
      return await handleTranscribe(event);
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
      body: JSON.stringify({ error: err.message }),
    };
  }
};

async function handleTranscribe(event) {
  const audioBase64 = event.body;
  if (!audioBase64) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No audio data' }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
    };
  }

  const contentType = event.headers['content-type'] || 'audio/webm';
  const jobName = `transcribe-${crypto.randomUUID()}`;
  const bucketName = process.env.STORAGE_BUCKET;
  const key = `audio/${jobName}.webm`;

  const audioBuffer = Buffer.from(audioBase64, 'base64');

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
          try {
            const err = JSON.parse(data);
            reject(new Error(err.error?.message || data));
          } catch {
            reject(new Error(`Whisper API error ${res.statusCode}: ${data}`));
          }
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}
