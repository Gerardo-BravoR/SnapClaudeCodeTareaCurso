import { app } from './app.js'
import { config } from './config.js'

app.listen(config.port, () => {
  console.log(`Snap server listening on port ${config.port}`)
})
