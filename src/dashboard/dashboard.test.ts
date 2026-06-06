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
  const res = await request(app).post('/auth/register').send({ email, password, name })
  return res.body.token as string
}

async function createUrl(token: string, url = 'https://example.com'): Promise<string> {
  const res = await request(app)
    .post('/urls')
    .set('Authorization', `Bearer ${token}`)
    .send({ url })
  return res.body.code as string
}

function simulateClick(code: string): void {
  const row = db.prepare<[string], { id: number }>('SELECT id FROM urls WHERE code = ?').get(code)
  if (!row) throw new Error(`URL not found: ${code}`)
  db.prepare('INSERT INTO clicks (url_id) VALUES (?)').run(row.id)
}

// --- setup ---

beforeEach(() => {
  db.exec('DELETE FROM clicks')
  db.exec('DELETE FROM urls')
  db.exec('DELETE FROM users')
})

// --- tests ---

describe('GET /dashboard', () => {
  it('requiere autenticación', async () => {
    await request(app).get('/dashboard').expect(401)
  })

  it('devuelve zeros cuando el usuario no tiene URLs', async () => {
    const token = await registerAndLogin()

    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.totals).toEqual({
      urls: 0,
      clicks: 0,
      avg_clicks_per_url: 0,
    })
    expect(res.body.clicks_by_day).toEqual([])
    expect(res.body.top_urls).toEqual([])
  })

  it('devuelve totales correctos con URLs y clicks', async () => {
    const token = await registerAndLogin()
    const codeA = await createUrl(token, 'https://a.com')
    const codeB = await createUrl(token, 'https://b.com')

    simulateClick(codeA)
    simulateClick(codeA)
    simulateClick(codeA)
    simulateClick(codeB)

    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.totals).toEqual({
      urls: 2,
      clicks: 4,
      avg_clicks_per_url: 2,
    })
  })

  it('top_urls ordena por clicks descendente y limita a 5', async () => {
    const token = await registerAndLogin()

    // Crear 6 URLs con distinto número de clicks
    const codes: string[] = []
    for (let i = 0; i < 6; i++) {
      codes.push(await createUrl(token, `https://url${i}.com`))
    }

    // clicks: url0=0, url1=1, url2=2, url3=3, url4=4, url5=5
    for (let i = 0; i < codes.length; i++) {
      for (let j = 0; j < i; j++) simulateClick(codes[i])
    }

    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.top_urls).toHaveLength(5)
    // El primero debe ser el que más clicks tiene
    expect(res.body.top_urls[0].clicks).toBe(5)
    expect(res.body.top_urls[0].original_url).toBe('https://url5.com')
    // El segundo
    expect(res.body.top_urls[1].clicks).toBe(4)
  })

  it('clicks_by_day agrupa clicks por fecha', async () => {
    const token = await registerAndLogin()
    const code = await createUrl(token)

    // Simular 3 clicks (todos caen en la fecha de hoy en SQLite)
    simulateClick(code)
    simulateClick(code)
    simulateClick(code)

    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.clicks_by_day).toHaveLength(1)
    expect(res.body.clicks_by_day[0].clicks).toBe(3)
    expect(res.body.clicks_by_day[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('aísla datos entre usuarios: cada usuario solo ve los suyos', async () => {
    const tokenA = await registerAndLogin('a@example.com')
    const tokenB = await registerAndLogin('b@example.com', 'password123', 'User B')

    const codeA = await createUrl(tokenA, 'https://a.com')
    await createUrl(tokenB, 'https://b.com')

    simulateClick(codeA)
    simulateClick(codeA)

    const resA = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200)

    const resB = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200)

    expect(resA.body.totals).toEqual({ urls: 1, clicks: 2, avg_clicks_per_url: 2 })
    expect(resB.body.totals).toEqual({ urls: 1, clicks: 0, avg_clicks_per_url: 0 })
  })

  it('avg_clicks_per_url se redondea a 2 decimales', async () => {
    const token = await registerAndLogin()
    const codeA = await createUrl(token, 'https://a.com')
    const codeB = await createUrl(token, 'https://b.com')
    const codeC = await createUrl(token, 'https://c.com')

    // 1 click total, 3 URLs → 0.33
    simulateClick(codeA)

    const res = await request(app)
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.totals.avg_clicks_per_url).toBe(0.33)
    // Sin usar codeB/codeC directamente en el assertion, pero sí creadas
    expect(codeB).toBeTruthy()
    expect(codeC).toBeTruthy()
  })
})
