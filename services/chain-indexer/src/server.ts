import Fastify from 'fastify'

const app = Fastify({ logger: true })
const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 3002)

await app.listen({ host, port })
