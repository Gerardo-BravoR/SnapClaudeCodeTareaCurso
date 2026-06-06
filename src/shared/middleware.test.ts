import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { notFoundHandler, errorHandler } from './middleware.js'
import { app } from '../app.js'

describe('404 handler', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const response = await request(app)
      .get('/this-route-does-not-exist')
      .expect(404)

    expect(response.body).toEqual({ error: 'Route not found' })
  })
})

describe('error handler', () => {
  const errApp = express()
  errApp.get('/throw', (_req, _res) => {
    throw new Error('oops')
  })
  errApp.use(notFoundHandler)
  errApp.use(errorHandler)

  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('returns 500 on unhandled error without crashing', async () => {
    const response = await request(errApp).get('/throw').expect(500)

    expect(response.body).toHaveProperty('error', 'Internal server error')
  })

  it('includes error message outside of production', async () => {
    process.env.NODE_ENV = 'development'

    const response = await request(errApp).get('/throw').expect(500)

    expect(response.body).toHaveProperty('message', 'oops')
  })

  it('hides error message in production', async () => {
    process.env.NODE_ENV = 'production'

    const response = await request(errApp).get('/throw').expect(500)

    expect(response.body).not.toHaveProperty('message')
  })
})
