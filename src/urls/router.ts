import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { db } from '../shared/db.js'
import { requireAuth } from '../auth/middleware.js'

const urlsRouter = Router()

function generateCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

const insertUrl = db.prepare(
  'INSERT INTO urls (code, original_url, user_id) VALUES (?, ?, ?)',
)
const findByCode = db.prepare<[string], { id: number; original_url: string }>(
  'SELECT id, original_url FROM urls WHERE code = ?',
)
const insertClick = db.prepare(
  'INSERT INTO clicks (url_id, referrer, user_agent) VALUES (?, ?, ?)',
)
const findCode = db.prepare<[string], { code: string }>(
  'SELECT code FROM urls WHERE code = ?',
)
const findUrlOwner = db.prepare<[string], { user_id: number }>(
  'SELECT user_id FROM urls WHERE code = ?',
)
const deleteUrl = db.prepare('DELETE FROM urls WHERE code = ?')
const listUrls = db.prepare<[], { code: string; url: string; created_at: number }>(
  'SELECT code, original_url AS url, created_at FROM urls ORDER BY created_at DESC, id DESC',
)

// POST /urls — protegido: crea una URL corta asociada al usuario autenticado
urlsRouter.post('/', requireAuth, (req: Request, res: Response) => {
  const { url } = req.body as { url?: unknown }
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required and must be a string' })
    return
  }

  let code: string
  let attempts = 0
  do {
    code = generateCode()
    if (++attempts > 10) {
      res.status(500).json({ error: 'Could not generate a unique code' })
      return
    }
  } while (findCode.get(code))

  insertUrl.run(code, url, req.user!.id)
  res.status(201).json({ code, url, shortUrl: `/${code}` })
})

// DELETE /urls/:code — protegido: solo el propietario puede borrar
urlsRouter.delete('/:code', requireAuth, (req: Request, res: Response) => {
  const code = req.params['code'] as string
  const row = findUrlOwner.get(code)

  if (!row) {
    res.status(404).json({ error: 'URL not found' })
    return
  }
  if (row.user_id !== req.user!.id) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  deleteUrl.run(code)
  res.status(204).send()
})

// GET /urls — público: lista todas las URLs
urlsRouter.get('/', (_req: Request, res: Response) => {
  res.json(listUrls.all())
})

// GET /:code — público: redirige a la URL original (registrado en app.ts al nivel raíz)
function redirectHandler(req: Request, res: Response, next: NextFunction): void {
  const row = findByCode.get(req.params['code'] as string)
  if (!row) {
    next()
    return
  }
  try {
    const referrer = req.headers['referer'] ?? null
    const userAgent = req.headers['user-agent'] ?? null
    insertClick.run(row.id, referrer, userAgent)
  } catch {
    // click no es crítico — el redirect ocurre siempre
  }
  res.redirect(302, row.original_url)
}

export { urlsRouter, redirectHandler }
