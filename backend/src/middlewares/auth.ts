import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { AppError } from './errorHandler'

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string }
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new AppError(401, 'Unauthorized')

  try {
    req.user = verifyAccessToken(header.slice(7))
    next()
  } catch {
    throw new AppError(401, 'Invalid or expired token')
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') throw new AppError(403, 'Forbidden')
  next()
}
