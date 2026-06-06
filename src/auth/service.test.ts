import { describe, it, expect, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { register, login, AuthError } from './service.js'
import { db } from '../shared/db.js'
import { config } from '../config.js'

beforeEach(() => {
  db.exec('DELETE FROM users')
})

describe('register', () => {
  it('returns a valid JWT on success', async () => {
    const { token } = await register('alice@example.com', 'password123', 'Alice')

    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload
    expect(payload).toHaveProperty('sub')
    expect(payload.exp).toBeDefined()
  })

  it('JWT expires in ~24 hours', async () => {
    const { token } = await register('alice@example.com', 'password123', 'Alice')

    const payload = jwt.decode(token) as jwt.JwtPayload
    const ttlSeconds = payload.exp! - payload.iat!
    expect(ttlSeconds).toBe(24 * 60 * 60)
  })

  it('throws EMAIL_TAKEN when the email is already registered', async () => {
    await register('alice@example.com', 'password123', 'Alice')

    await expect(
      register('alice@example.com', 'other-password', 'Alice 2'),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' })
  })

  it('email duplicates are caught regardless of case', async () => {
    await register('alice@example.com', 'password123', 'Alice')

    await expect(
      register('Alice@Example.COM', 'password123', 'Alice'),
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' })
  })
})

describe('login', () => {
  beforeEach(async () => {
    await register('alice@example.com', 'password123', 'Alice')
  })

  it('returns a valid JWT with correct credentials', async () => {
    const { token } = await login('alice@example.com', 'password123')

    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload
    expect(payload).toHaveProperty('sub')
  })

  it('accepts email in any case', async () => {
    const { token } = await login('ALICE@EXAMPLE.COM', 'password123')

    expect(() => jwt.verify(token, config.jwtSecret)).not.toThrow()
  })

  it('throws INVALID_CREDENTIALS with wrong password', async () => {
    await expect(
      login('alice@example.com', 'wrong-password'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('throws INVALID_CREDENTIALS with unknown email', async () => {
    await expect(
      login('nobody@example.com', 'password123'),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('unknown email and wrong password return the same error code', async () => {
    const unknownEmail = login('nobody@example.com', 'x').catch((e: AuthError) => e.code)
    const wrongPassword = login('alice@example.com', 'x').catch((e: AuthError) => e.code)

    expect(await unknownEmail).toBe(await wrongPassword)
  })
})
