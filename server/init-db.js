import { closeDatabase, initializeDatabase } from './db.js'

try {
  await initializeDatabase()
  console.log('Database tables initialized from server/schema.sql')
} catch (error) {
  console.error('[Database initialization failed]', error.message)
  process.exitCode = 1
} finally {
  await closeDatabase()
}
