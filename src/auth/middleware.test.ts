import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import { requireAuth } from './middleware.js'
import { config } from '../config.js'

// Mini-app con una ruta protegida para probar el middleware en aislamiento
const testApp = express()
testApp.get('/protected', requireAuth, (req, res) => {
  res.json({ userId: req.user?.id })
})

function validToken(userId = 1): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '1h' })
}

function expiredToken(): string {
  // exp en el pasado → jwt.verify lanza TokenExpiredError
  return jwt.sign(
    { sub: 1, exp: Math.floor(Date.now() / 1000) - 3600 },
    config.jwtSecret,
  )
}

describe('requireAuth middleware', () => {
  describe('token válido', () => {
    it('pasa la request y adjunta req.user con el id del token', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken(42)}`)
        .expect(200)

      expect(response.body).toEqual({ userId: 42 })
    })

    it('funciona con cualquier userId numérico', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${validToken(99)}`)
        .expect(200)

      expect(response.body.userId).toBe(99)
    })
  })

  describe('sin token', () => {
    it('devuelve 401 cuando no hay header Authorization', async () => {
      const response = await request(testApp).get('/protected').expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('devuelve 401 cuando el header no tiene prefijo Bearer', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', validToken())
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('token inválido o expirado', () => {
    it('devuelve 401 con token expirado', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken()}`)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('devuelve 401 con token firmado con secret diferente', async () => {
      const wrongToken = jwt.sign({ sub: 1 }, 'wrong-secret', { expiresIn: '1h' })

      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongToken}`)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('devuelve 401 con token malformado', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('devuelve 401 con string vacío tras Bearer', async () => {
      const response = await request(testApp)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })
  })
})
