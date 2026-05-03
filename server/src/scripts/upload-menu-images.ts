/**
 * Upload menu images to S3 with deterministic keys (no timestamp prefix).
 *
 * Usage:
 *   pnpm tsx server/src/scripts/upload-menu-images.ts <local-dir> [--prefix demo-003]
 *
 * Behavior:
 *   - Uploads every supported image file in <local-dir> to
 *     s3://<AWS_S3_BUCKET>/menu-images/<prefix>/<original-filename>
 *   - Filename used as-is (no timestamp/hash) — matches seed.ts URLs
 *   - Skips files that aren't images
 *   - Prints public URL for each upload + final list
 *
 * Env (loaded from server/.env or process env):
 *   - AWS_REGION             (default: us-east-1)
 *   - AWS_S3_BUCKET          (default: qr-restaurant-images)
 *   - AWS_ACCESS_KEY_ID      (required)
 *   - AWS_SECRET_ACCESS_KEY  (required)
 */
import 'dotenv/config'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const REGION = process.env.AWS_REGION || 'us-east-1'
const BUCKET = process.env.AWS_S3_BUCKET || 'qr-restaurant-images'

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY missing in env.')
  console.error('   Run from server/ dir so dotenv finds .env, or export the vars.')
  process.exit(1)
}

const args = process.argv.slice(2)
const localDir = args[0]
const prefixArgIdx = args.indexOf('--prefix')
const prefix = prefixArgIdx >= 0 ? args[prefixArgIdx + 1] : 'demo-003'

if (!localDir) {
  console.error('Usage: tsx upload-menu-images.ts <local-dir> [--prefix demo-003]')
  process.exit(1)
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

async function main() {
  let files: string[]
  try {
    files = readdirSync(localDir).filter(f => {
      const path = join(localDir, f)
      if (!statSync(path).isFile()) return false
      return CONTENT_TYPES[extname(f).toLowerCase()] !== undefined
    })
  } catch (err) {
    console.error(`❌ Cannot read dir: ${localDir}`)
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log(`No supported images (${Object.keys(CONTENT_TYPES).join(', ')}) found in ${localDir}`)
    return
  }

  console.log(`Uploading ${files.length} image(s) to s3://${BUCKET}/menu-images/${prefix}/\n`)

  const urls: string[] = []
  for (const file of files) {
    const localPath = join(localDir, file)
    const ext = extname(file).toLowerCase()
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
    const key = `menu-images/${prefix}/${file}`

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: readFileSync(localPath),
        ContentType: contentType,
        CacheControl: 'public, max-age=43200',
      }))
      const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
      urls.push(url)
      console.log(`✅ ${file.padEnd(40)} → ${url}`)
    } catch (err) {
      console.error(`❌ ${file}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nDone. ${urls.length}/${files.length} uploaded.`)
}

main().catch(err => {
  console.error('❌ Fatal:', err)
  process.exit(1)
})
