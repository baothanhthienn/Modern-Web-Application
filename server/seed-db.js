import { closeDatabase, seedDatabase } from './db.js'

try {
  await seedDatabase()
  console.log('Development seed data loaded from server/seed.sql')
} catch (error) {
  console.error('[Database seed failed]', error.message)
  process.exitCode = 1
} finally {
  await closeDatabase()
}
