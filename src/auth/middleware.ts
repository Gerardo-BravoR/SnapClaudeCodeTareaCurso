import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// Augment Express Request so downstream handlers see req.user typed
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: number }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload
    req.user = { id: Number(payload.sub) }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
