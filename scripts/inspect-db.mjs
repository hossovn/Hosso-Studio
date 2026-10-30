import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync('apps/studio/data/studio-test.db')
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all()
  .map((t) => t.name)
console.log('Total tables:', tables.length)
console.log('Cross-sell tables:', tables.filter((t) => t.includes('cross_sell')))
console.log(
  'Core tables:',
  tables.filter((t) => ['users', 'pages', 'posts'].includes(t))
)
