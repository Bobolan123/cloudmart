import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import * as authService from '../services/auth.service'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = registerSchema.parse(req.body)
    const user = await authService.register(email, password, name)
    res.status(201).json({ message: 'Registration successful. Please verify your email.', user })
  } catch (err) { next(err) }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.query
    if (typeof token !== 'string') return res.status(400).json({ error: 'Token required' })
    // await authService.verifyEmail(token)
    res.json({ message: 'Email verified successfully' })
  } catch (err) { next(err) }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await authService.login(email, password)
    res.json(result)
  } catch (err) { next(err) }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' })
    const tokens = await authService.refresh(refreshToken)
    res.json(tokens)
  } catch (err) { next(err) }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body
    if (refreshToken) await authService.logout(refreshToken)
    res.json({ message: 'Logged out' })
  } catch (err) { next(err) }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'email required' })
    await authService.forgotPassword(email)
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) { next(err) }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword required' })
    await authService.resetPassword(token, newPassword)
    res.json({ message: 'Password reset successful' })
  } catch (err) { next(err) }
}
