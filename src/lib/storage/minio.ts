import { randomUUID } from 'crypto';

export function isMinioConfigured(): boolean {
  return Boolean(
    process.env.MINIO_ENDPOINT &&
      process.env.MINIO_ACCESS_KEY &&
      process.env.MINIO_SECRET_KEY &&
      process.env.MINIO_BUCKET
  );
}

export async function uploadChatObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const endpoint = process.env.MINIO_ENDPOINT!;
  const bucket = process.env.MINIO_BUCKET!;
  const accessKey = process.env.MINIO_ACCESS_KEY!;
  const secretKey = process.env.MINIO_SECRET_KEY!;
  const publicBase =
    process.env.MINIO_PUBLIC_URL?.replace(/\/$/, '') ||
    `${endpoint.replace(/\/$/, '')}/${bucket}`;

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.MINIO_REGION || 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `${publicBase}/${key}`;
}

export function chatObjectKey(userId: string, ext: string): string {
  return `chat/${userId}/${randomUUID()}${ext}`;
}
