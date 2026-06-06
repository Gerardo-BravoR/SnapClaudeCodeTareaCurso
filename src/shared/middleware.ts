import type { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const { method, originalUrl } = req
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`${method} ${originalUrl} → ${res.statusCode} (${ms}ms)`)
  })
  next()
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' })
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isDev = process.env.NODE_ENV !== 'production'
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev ? { message: err.message } : {}),
  })
}
