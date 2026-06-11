import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'

export interface TokenPayload {
  userId: string
  role: string
}

export const signAccessToken = (payload: TokenPayload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions)

export const signRefreshToken = (payload: TokenPayload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, ACCESS_SECRET) as TokenPayload

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, REFRESH_SECRET) as TokenPayload
