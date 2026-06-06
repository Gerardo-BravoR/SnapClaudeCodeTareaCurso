import express from 'express'
import { healthRouter } from './health/router.js'
import { urlsRouter, redirectHandler } from './urls/router.js'
import { authRouter } from './auth/router.js'
import { dashboardRouter } from './dashboard/router.js'
import { requestLogger, notFoundHandler, errorHandler } from './shared/middleware.js'

const app = express()

app.use(requestLogger)
app.use(express.json())
app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/urls', urlsRouter)
app.use('/dashboard', dashboardRouter)
app.get('/:code', redirectHandler)
app.use(notFoundHandler)
app.use(errorHandler)

export { app }
