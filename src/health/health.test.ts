import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app.js'

describe('GET /health', () => {
  it('responds 200 with { status: "ok" }', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)

    expect(response.body).toEqual({ status: 'ok' })
  })
})
