import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ── Local storage (dev fallback) ──────────────────────────
const uploadDir = process.env.UPLOAD_DIR ?? 'uploads'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// ── Upload handler: S3 in production, disk in dev ─────────
export async function uploadFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase()
  const filename = `${crypto.randomUUID()}${ext}`

  if (process.env.S3_BUCKET) {
    const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
    const key = `products/${filename}`

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }))

    return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION ?? 'ap-southeast-1'}.amazonaws.com/${key}`
  }

  // Dev: lưu local disk
  const localPath = path.join(uploadDir, filename)
  fs.writeFileSync(localPath, file.buffer)
  return `/uploads/${filename}`
}
