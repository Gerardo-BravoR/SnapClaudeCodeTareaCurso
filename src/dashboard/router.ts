import { Router } from 'express'
import type { Request, Response } from 'express'
import { db } from '../shared/db.js'
import { requireAuth } from '../auth/middleware.js'

const dashboardRouter = Router()

interface TotalsRow {
  total_urls: number
  total_clicks: number
}

interface ClicksByDayRow {
  date: string
  clicks: number
}

interface TopUrlRow {
  code: string
  original_url: string
  clicks: number
}

const queryTotals = db.prepare<[number], TotalsRow>(`
  SELECT
    COUNT(DISTINCT u.id) AS total_urls,
    COUNT(c.id)          AS total_clicks
  FROM urls u
  LEFT JOIN clicks c ON c.url_id = u.id
  WHERE u.user_id = ?
`)

const queryClicksByDay = db.prepare<[number], ClicksByDayRow>(`
  SELECT
    DATE(c.clicked_at, 'unixepoch') AS date,
    COUNT(*)                         AS clicks
  FROM clicks c
  JOIN urls u ON u.id = c.url_id
  WHERE u.user_id = ?
    AND c.clicked_at >= unixepoch('now', '-30 days')
  GROUP BY date
  ORDER BY date ASC
`)

const queryTopUrls = db.prepare<[number], TopUrlRow>(`
  SELECT
    u.code,
    u.original_url,
    COUNT(c.id) AS clicks
  FROM urls u
  LEFT JOIN clicks c ON c.url_id = u.id
  WHERE u.user_id = ?
  GROUP BY u.id
  ORDER BY clicks DESC
  LIMIT 5
`)

// GET /dashboard — protegido: resumen de URLs y clicks del usuario
dashboardRouter.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id

  const totalsRow = queryTotals.get(userId) ?? { total_urls: 0, total_clicks: 0 }
  const avgClicks =
    totalsRow.total_urls > 0
      ? Math.round((totalsRow.total_clicks / totalsRow.total_urls) * 100) / 100
      : 0

  res.json({
    totals: {
      urls: totalsRow.total_urls,
      clicks: totalsRow.total_clicks,
      avg_clicks_per_url: avgClicks,
    },
    clicks_by_day: queryClicksByDay.all(userId),
    top_urls: queryTopUrls.all(userId),
  })
})

export { dashboardRouter }
