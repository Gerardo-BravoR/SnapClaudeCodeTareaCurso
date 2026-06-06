import { describe, it, expect } from 'vitest'
import { buildConfig } from './config.js'

describe('buildConfig', () => {
  it('returns defaults when no env vars are set', () => {
    const config = buildConfig({})

    expect(config.port).toBe(3000)
    expect(config.env).toBe('development')
    expect(config.dbName).toBe('snap.db')
  })

  it('reads values from environment variables', () => {
    const config = buildConfig({
      PORT: '4000',
      NODE_ENV: 'production',
      DB_NAME: 'mydb.db',
      JWT_SECRET: 'supersecret',
    })

    expect(config.port).toBe(4000)
    expect(config.env).toBe('production')
    expect(config.dbName).toBe('mydb.db')
    expect(config.jwtSecret).toBe('supersecret')
  })

  it('throws in production if PORT is not set', () => {
    expect(() => buildConfig({ NODE_ENV: 'production', JWT_SECRET: 'x' })).toThrow(
      'Missing required environment variable in production: PORT',
    )
  })

  it('throws in production if JWT_SECRET is not set', () => {
    expect(() => buildConfig({ NODE_ENV: 'production', PORT: '3000' })).toThrow(
      'Missing required environment variable in production: JWT_SECRET',
    )
  })

  it('does not throw in development without PORT', () => {
    expect(() => buildConfig({ NODE_ENV: 'development' })).not.toThrow()
  })
})
