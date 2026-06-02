const {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} = require('@aws-sdk/client-transcribe');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const transcribe = new TranscribeClient({ region: process.env.REGION || 'us-east-1' });
const s3 = new S3Client({ region: process.env.REGION || 'us-east-1' });

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const path = event.path;

    if (method === 'POST' && path === '/transcribe') {
      return await handleUpload(event);
    }
    if (method === 'GET' && path.startsWith('/transcribe/')) {
      const jobName = path.split('/')[2];
      return await handleGetTranscription(jobName);
    }
    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

async function handleUpload(event) {
  const audioBase64 = event.body;
  if (!audioBase64) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No audio data' }) };
  }

  const contentType = event.headers['content-type'] || 'audio/webm';
  const jobName = `transcribe-${uuidv4()}`;
  const bucketName = process.env.STORAGE_BUCKET;
  const key = `audio/${jobName}.webm`;

  const audioBuffer = Buffer.from(audioBase64, 'base64');

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: audioBuffer,
    ContentType: contentType,
  }));

  const mediaUri = `s3://${bucketName}/${key}`;
  await transcribe.send(new StartTranscriptionJobCommand({
    TranscriptionJobName: jobName,
    LanguageCode: 'en-US',
    MediaFormat: 'webm',
    Media: { MediaFileUri: mediaUri },
    OutputBucketName: bucketName,
    OutputKey: `transcripts/${jobName}.json`,
    Settings: {
      ShowSpeakerLabels: false,
      MaxSpeakerLabels: 1,
    },
  }));

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ jobName }),
  };
}

async function handleGetTranscription(jobName) {
  const response = await transcribe.send(new GetTranscriptionJobCommand({
    TranscriptionJobName: jobName,
  }));

  const job = response.TranscriptionJob;
  const status = job.TranscriptionJobStatus;

  if (status !== 'COMPLETED') {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status, transcript: null }),
    };
  }

  const transcriptUri = job.Transcript.TranscriptFileUri;
  const transcriptData = await fetchTranscriptFromUri(transcriptUri);
  const transcriptText = transcriptData?.results?.transcripts?.[0]?.transcript || '';

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ status: 'COMPLETED', transcript: transcriptText }),
  };
}

async function fetchTranscriptFromUri(uri) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(uri, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Failed to parse transcript JSON'));
        }
      });
    }).on('error', reject);
  });
}
