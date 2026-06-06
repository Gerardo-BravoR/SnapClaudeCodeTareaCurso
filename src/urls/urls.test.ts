import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'
import { db } from '../shared/db.js'

// --- helpers ---

async function registerAndLogin(
  email = 'user@example.com',
  password = 'password123',
  name = 'Test User',
): Promise<string> {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password, name })
  return res.body.token as string
}

function authPost(token: string) {
  return request(app).post('/urls').set('Authorization', `Bearer ${token}`)
}

// --- setup ---

beforeEach(() => {
  // FK order: clicks → urls → users
  db.exec('DELETE FROM clicks')
  db.exec('DELETE FROM urls')
  db.exec('DELETE FROM users')
})

// --- POST /urls ---

describe('POST /urls', () => {
  it('returns 401 without a token', async () => {
    await request(app).post('/urls').send({ url: 'https://example.com' }).expect(401)
  })

  it('creates a short URL and returns 201 with code and shortUrl', async () => {
    const token = await registerAndLogin()

    const response = await authPost(token).send({ url: 'https://example.com' }).expect(201)

    expect(response.body).toMatchObject({
      url: 'https://example.com',
      code: expect.stringMatching(/^[A-Za-z0-9]{6}$/),
      shortUrl: expect.stringMatching(/^\/[A-Za-z0-9]{6}$/),
    })
  })

  it('returns 400 when url is missing', async () => {
    const token = await registerAndLogin()

    await authPost(token).send({}).expect(400)
  })

  it('returns 400 when url is not a string', async () => {
    const token = await registerAndLogin()

    await authPost(token).send({ url: 42 }).expect(400)
  })

  it('generates different codes for the same URL', async () => {
    const token = await registerAndLogin()

    const a = await authPost(token).send({ url: 'https://example.com' })
    const b = await authPost(token).send({ url: 'https://example.com' })

    expect(a.body.code).not.toBe(b.body.code)
  })
})

// --- GET /urls (público) ---

describe('GET /urls', () => {
  it('returns empty array when no URLs exist', async () => {
    const response = await request(app).get('/urls').expect(200)

    expect(response.body).toEqual([])
  })

  it('lists all created URLs with code, url and created_at', async () => {
    const token = await registerAndLogin()
    await authPost(token).send({ url: 'https://a.com' })
    await authPost(token).send({ url: 'https://b.com' })

    const response = await request(app).get('/urls').expect(200)

    expect(response.body).toHaveLength(2)
    expect(response.body[0]).toMatchObject({
      code: expect.stringMatching(/^[A-Za-z0-9]{6}$/),
      url: expect.stringContaining('https://'),
      created_at: expect.any(Number),
    })
  })

  it('returns URLs in descending order of creation', async () => {
    const token = await registerAndLogin()
    await authPost(token).send({ url: 'https://first.com' })
    await authPost(token).send({ url: 'https://last.com' })

    const response = await request(app).get('/urls').expect(200)

    expect(response.body[0].url).toBe('https://last.com')
    expect(response.body[1].url).toBe('https://first.com')
  })
})

// --- GET /:code (público) ---

describe('GET /:code', () => {
  it('redirects 302 to the original URL', async () => {
    const token = await registerAndLogin()
    const create = await authPost(token).send({ url: 'https://example.com' })
    const { code } = create.body as { code: string }

    await request(app)
      .get(`/${code}`)
      .expect(302)
      .expect('Location', 'https://example.com')
  })

  it('returns 404 for an unknown code', async () => {
    await request(app).get('/xxxxxx').expect(404)
  })
})

// --- DELETE /urls/:code ---

describe('DELETE /urls/:code', () => {
  it('returns 401 without a token', async () => {
    const token = await registerAndLogin()
    const { body } = await authPost(token).send({ url: 'https://example.com' })

    await request(app).delete(`/urls/${body.code}`).expect(401)
  })

  it('deletes own URL and returns 204', async () => {
    const token = await registerAndLogin()
    const { body } = await authPost(token).send({ url: 'https://example.com' })

    await request(app)
      .delete(`/urls/${body.code}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    // Confirmar que ya no existe
    await request(app).get(`/${body.code}`).expect(404)
  })

  it('returns 403 when trying to delete another user URL', async () => {
    const ownerToken = await registerAndLogin('owner@example.com')
    const otherToken = await registerAndLogin('other@example.com', 'password123', 'Other')

    const { body } = await authPost(ownerToken).send({ url: 'https://example.com' })

    await request(app)
      .delete(`/urls/${body.code}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403)
  })

  it('returns 404 when the code does not exist', async () => {
    const token = await registerAndLogin()

    await request(app)
      .delete('/urls/xxxxxx')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })
})
