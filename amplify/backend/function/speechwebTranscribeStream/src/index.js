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
const BUCKET = process.env.STORAGE_BUCKET;
const s3 = new S3Client({ region: REGION });
const transcribe = new TranscribeClient({ region: REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

exports.handler = async (event) => {
  const routeKey = event.requestContext?.routeKey;
  const connectionId = event.requestContext?.connectionId;
  const domainName = event.requestContext?.domainName;
  const stage = event.requestContext?.stage;

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
        await sendMessage({ type: 'error', text: 'Authentication required' });
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
    try {
      await sendMessage({ type: 'error', text: err.message });
    } catch {}
    return { statusCode: 500, headers: corsHeaders, body: err.message };
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
