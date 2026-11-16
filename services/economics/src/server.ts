import { buildApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = buildApp(config, undefined, true)
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => { void app.close().then(() => { process.exitCode = 0 }) })
}
try { await app.listen({ host: config.host, port: config.port }) }
catch { app.log.error('Service startup failed'); process.exitCode = 1; await app.close() }
