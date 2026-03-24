import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { findUserByUsername } from '../repositories/auth.repository.js'
import type { JwtPayload, LoginResponse } from '@qr-order/shared'
import logger from '../lib/logger.js'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

export async function login(
  storeId: string,
  username: string,
  password: string
): Promise<{ data: LoginResponse } | { error: string; status: number }> {
  const user = await findUserByUsername(storeId, username)
  if (!user) {
    logger.warn({ storeId, username }, 'login failed: user not found')
    return { error: 'Invalid username or password', status: 401 }
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    logger.warn({ storeId, username }, 'login failed: wrong password')
    return { error: 'Invalid username or password', status: 401 }
  }

  const payload: JwtPayload = {
    userId: user.id,
    storeId: user.storeId,
    role: user.role as JwtPayload['role'],
  }

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })

  logger.info({ storeId, username, role: user.role }, 'login successful')

  return {
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        storeId: user.storeId,
      },
    },
  }
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}
