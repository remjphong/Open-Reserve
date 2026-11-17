import { readFile } from 'node:fs/promises'
import { withCatalogDatabase } from '../dist/domain/readiness.js'

const sql = await readFile(new URL('../migrations/001-evidence-records.sql', import.meta.url), 'utf8')
const result = await withCatalogDatabase(process.env.DATABASE_URL, client => client.query(sql))
if (result.ok) console.log('Catalog evidence migration applied.')
else {
  console.error('Catalog migration failed: ' + result.reason)
  process.exitCode = 1
}
