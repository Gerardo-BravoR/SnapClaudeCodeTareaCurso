import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../shared/db.js'

beforeEach(() => {
  db.exec('DELETE FROM users')
})

describe('POST /auth/register', () => {
  it('returns 201 with token and user on success', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' })
      .expect(201)

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        id: expect.any(Number),
        email: 'alice@example.com',
        name: 'Alice',
      },
    })
  })

  it('normalizes email to lowercase in the response', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'Alice@Example.COM', password: 'password123', name: 'Alice' })
      .expect(201)

    expect(response.body.user.email).toBe('alice@example.com')
  })

  it('returns 400 for missing email', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ password: 'password123', name: 'Alice' })
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 400 for invalid email format', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'password123', name: 'Alice' })
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'short', name: 'Alice' })
      .expect(400)

    expect(response.body.error).toMatch(/8/)
  })

  it('returns 400 when name is missing', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' })
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 409 when email is already registered', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' })

    const response = await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'other-pass', name: 'Alice 2' })
      .expect(409)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 409 for duplicate email regardless of case', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' })

    await request(app)
      .post('/auth/register')
      .send({ email: 'ALICE@EXAMPLE.COM', password: 'password123', name: 'Alice' })
      .expect(409)
  })
})

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'alice@example.com', password: 'password123', name: 'Alice' })
  })

  it('returns 200 with token and user on success', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'password123' })
      .expect(200)

    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: {
        id: expect.any(Number),
        email: 'alice@example.com',
        name: 'Alice',
      },
    })
  })

  it('accepts email in any case', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'ALICE@EXAMPLE.COM', password: 'password123' })
      .expect(200)

    expect(response.body).toHaveProperty('token')
  })

  it('returns 401 for wrong password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com', password: 'wrong-password' })
      .expect(401)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 401 for unknown email', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' })
      .expect(401)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 400 when email is missing', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ password: 'password123' })
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })

  it('returns 400 when password is missing', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'alice@example.com' })
      .expect(400)

    expect(response.body).toHaveProperty('error')
  })
})
