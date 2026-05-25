import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '.env')
const schemaPath = path.join(__dirname, 'schema.sql')

function loadLocalEnvironment() {
  console.log('[db] loadLocalEnvironment started')
  if (!fs.existsSync(envPath)) {
    console.log('[db] local environment file not found')
    return
  }

  const envText = fs.readFileSync(envPath, 'utf8')
  for (const line of envText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [key, ...valueParts] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = valueParts.join('=').trim()
  }

  console.log('[db] local environment file loaded')
}

// take var from local env
function requiredEnvironmentValue(name) {
  console.log(`[db] reading required setting: ${name}`)
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}. Create server/.env with your database connection settings.`)
  }
  return value
}

function integerEnvironmentValue(name, defaultValue, minimum = 0) {
  console.log(`[db] reading numeric setting: ${name}`)
  const rawValue = process.env[name]
  if (!rawValue) return defaultValue

  const value = Number(rawValue)
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`)
  }
  return value
}

loadLocalEnvironment()

const databaseConfig = {
  host: requiredEnvironmentValue('DB_HOST'),
  port: integerEnvironmentValue('DB_PORT', 3306, 1),
  user: requiredEnvironmentValue('DB_USER'),
  password: requiredEnvironmentValue('DB_PASSWORD'),
  database: requiredEnvironmentValue('DB_NAME'),
  charset: 'utf8mb4',
}

export const pool = mysql.createPool({
  ...databaseConfig,
  waitForConnections: true,
  connectionLimit: integerEnvironmentValue('DB_CONNECTION_LIMIT', 10, 1),
  queueLimit: integerEnvironmentValue('DB_QUEUE_LIMIT', 0),
})

export async function verifyDatabaseConnection() {
  console.log('[db] verifying database connection')
  const connection = await pool.getConnection()
  try {
    await connection.ping()
    console.log('[db] database connection verified')
  } finally {
    connection.release()
  }
}

export async function closeDatabase() {
  console.log('[db] closing database pool')
  await pool.end()
  console.log('[db] database pool closed')
}

export async function initializeDatabase() {
  console.log('[db] initializing tables from schema.sql')
  await runSqlFile(schemaPath)
  console.log('[db] table initialization complete')
}

export async function seedDatabase() {
  console.log('[db] loading development seed data')
  await runSqlFile(path.join(__dirname, 'seed.sql'))
  console.log('[db] development seed data loaded')
}

async function runSqlFile(filePath) {
  console.log(`[db] executing SQL file: ${path.basename(filePath)}`)
  const sql = fs.readFileSync(filePath, 'utf8')
  const connection = await mysql.createConnection({
    ...databaseConfig,
    multipleStatements: true,
  })

  try {
    await connection.query(sql)
    console.log(`[db] SQL file executed: ${path.basename(filePath)}`)
  } finally {
    await connection.end()
  }
}
