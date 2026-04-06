import { PrismaClient } from '@prisma/client'
import logger from './logger.js'

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

prisma.$on('query', (e) => {
  logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'prisma:query')
})

prisma.$on('error', (e) => {
  logger.error({ target: e.target }, e.message)
})

prisma.$on('warn', (e) => {
  logger.warn({ target: e.target }, e.message)
})

export default prisma
