export interface Config {
  port: number
  env: string
  dbName: string
  jwtSecret: string
}

export function buildConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const environment = env.NODE_ENV ?? 'development'
  const isProduction = environment === 'production'

  if (isProduction && !env.PORT) {
    throw new Error(
      'Missing required environment variable in production: PORT',
    )
  }
  if (isProduction && !env.JWT_SECRET) {
    throw new Error(
      'Missing required environment variable in production: JWT_SECRET',
    )
  }

  return {
    port: env.PORT ? parseInt(env.PORT, 10) : 3000,
    env: environment,
    dbName: env.DB_NAME ?? 'snap.db',
    jwtSecret: env.JWT_SECRET ?? 'dev-secret-change-in-production',
  }
}

export const config = buildConfig()
