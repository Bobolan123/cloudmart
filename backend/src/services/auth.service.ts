import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'
import { sendEmail } from '../lib/email'
import { AppError } from '../middlewares/errorHandler'

export async function register(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError(409, 'Email already in use')

  const passwordHash = await bcrypt.hash(password, 10)
  const verifyToken = crypto.randomBytes(32).toString('hex')

  const user = await prisma.user.create({
    data: { email, passwordHash, name, verifyToken },
    select: { id: true, email: true, name: true, role: true },
  })

  await sendEmail({
    to: email,
    subject: 'Verify your CloudMart account',
    html: `<p>Click to verify: <a href="${process.env.CLIENT_URL}/verify-email?token=${verifyToken}">Verify Email</a></p>`,
  })

  return user
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { verifyToken: token } })
  if (!user) throw new AppError(400, 'Invalid verification token')

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verifyToken: null },
  })
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new AppError(401, 'Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError(401, 'Invalid credentials')

  // if (!user.isVerified) throw new AppError(403, 'Please verify your email first')

  const payload = { userId: user.id, role: user.role }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } })

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  }
}

export async function refresh(token: string) {
  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw new AppError(401, 'Invalid refresh token')
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } })
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Refresh token expired or not found')
  }

  await prisma.refreshToken.delete({ where: { token } })

  const newPayload = { userId: payload.userId, role: payload.role }
  const accessToken = signAccessToken(newPayload)
  const refreshToken = signRefreshToken(newPayload)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  await prisma.refreshToken.create({ data: { userId: payload.userId, token: refreshToken, expiresAt } })

  return { accessToken, refreshToken }
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } })
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return // silent — don't leak user existence

  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenExp = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExp } })

  await sendEmail({
    to: email,
    subject: 'Reset your CloudMart password',
    html: `<p>Click to reset: <a href="${process.env.CLIENT_URL}/reset-password?token=${resetToken}">Reset Password</a></p><p>Expires in 1 hour.</p>`,
  })
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
  })
  if (!user) throw new AppError(400, 'Invalid or expired reset token')

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  })

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } })
}
