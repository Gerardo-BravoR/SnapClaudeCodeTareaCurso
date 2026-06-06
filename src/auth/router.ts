import { Router } from 'express'
import type { Request, Response } from 'express'
import { register, login, AuthError } from './service.js'

const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body as {
    email?: unknown
    password?: unknown
    name?: unknown
  }

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'A valid email address is required' })
    return
  }
  if (!password || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
    return
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' })
    return
  }

  try {
    const result = await register(email, password, name.trim())
    res.status(201).json(result)
  } catch (err) {
    if (err instanceof AuthError && err.code === 'EMAIL_TAKEN') {
      res.status(409).json({ error: 'Email already registered' })
      return
    }
    throw err
  }
})

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: unknown; password?: unknown }

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' })
    return
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Password is required' })
    return
  }

  try {
    const result = await login(email, password)
    res.json(result)
  } catch (err) {
    if (err instanceof AuthError && err.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }
    throw err
  }
})

export { authRouter }
