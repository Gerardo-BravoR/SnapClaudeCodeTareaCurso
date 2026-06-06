import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../shared/db.js'
import { config } from '../config.js'

const SALT_ROUNDS = 10
const JWT_TTL = '24h'

interface UserRow {
  id: number
  email: string
  password_hash: string
  name: string
}

export interface AuthUser {
  id: number
  email: string
  name: string
}

export interface AuthResult {
  token: string
  user: AuthUser
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS',
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

const insertUser = db.prepare<[string, string, string]>(
  'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
)
const findByEmail = db.prepare<[string], UserRow>(
  'SELECT id, email, password_hash, name FROM users WHERE email = ?',
)

function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: JWT_TTL })
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const normalized = email.toLowerCase().trim()

  if (findByEmail.get(normalized)) {
    throw new AuthError('Email already registered', 'EMAIL_TAKEN')
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const { lastInsertRowid } = insertUser.run(normalized, passwordHash, name)
  const id = lastInsertRowid as number

  return { token: signToken(id), user: { id, email: normalized, name } }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const normalized = email.toLowerCase().trim()
  const row = findByEmail.get(normalized)

  if (!row) {
    throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
  }

  const match = await bcrypt.compare(password, row.password_hash)
  if (!match) {
    throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS')
  }

  return {
    token: signToken(row.id),
    user: { id: row.id, email: row.email, name: row.name },
  }
}
