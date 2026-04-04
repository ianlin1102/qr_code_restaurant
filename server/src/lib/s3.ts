import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION || 'us-east-1'
const bucket = process.env.AWS_S3_BUCKET || 'qr-restaurant-images'

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  // Sanitize filename — strip path traversal and special chars
  const safe = filename.replace(/[/\\:*?"<>|]/g, '-').replace(/\.\./g, '').slice(0, 100)
  const key = `menu-images/${Date.now()}-${safe}`

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  )

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}
