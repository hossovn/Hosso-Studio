import { createHmac, randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
import { ChaosMode, Store, stateFile } from './store'

// Lệnh điều khiển mock từ ngoài (không mở thêm endpoint HTTP). Ví dụ:
//   pnpm --filter @hosso/mock-wim mock chaos slow|timeout|error|out_of_stock|no-compat|order-timeout|off
//   pnpm --filter @hosso/mock-wim mock price P001 900000
//   pnpm --filter @hosso/mock-wim mock stock P001 hn 3
//   pnpm --filter @hosso/mock-wim mock order-status WO-000001 confirmed
//   pnpm --filter @hosso/mock-wim mock webhook stock.changed P001 [--bad-signature] [--old-timestamp]
//   pnpm --filter @hosso/mock-wim mock orders | reset
const [cmd, ...args] = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const pos = args.filter((a) => !a.startsWith('--'))
const store = new Store()
const state = store.get()

const MODES: ChaosMode[] = ['off', 'slow', 'timeout', 'error', 'out_of_stock', 'no-compat', 'order-timeout']

async function webhook(type: string, id: string) {
  const url = process.env.MOCK_WIM_WEBHOOK_URL || 'http://localhost:3000/api/plugins/wim/webhook'
  const secret = process.env.MOCK_WIM_WEBHOOK_SECRET || 'mock-webhook-secret'
  const data = type === 'order.status_changed' ? { orderId: id, status: state.orders[id]?.status ?? 'confirmed' } : { productId: id }
  const body = JSON.stringify({ id: randomUUID(), type, occurredAt: new Date().toISOString(), data })
  const ts = String(Math.floor(Date.now() / 1000) - (flag('old-timestamp') ? 3600 : 0))
  let sig = createHmac('sha256', flag('bad-signature') ? 'sai-bi-mat' : secret).update(`${ts}.${body}`).digest('hex')
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hosso-Timestamp': ts, 'X-Hosso-Signature': sig },
    body,
  })
  console.log(`webhook ${type} ${id} -> ${res.status} ${await res.text()}`)
}

async function main() {
  switch (cmd) {
    case 'chaos': {
      const mode = pos[0] as ChaosMode
      if (!MODES.includes(mode)) throw new Error(`chế độ: ${MODES.join(' | ')}`)
      state.chaos = mode
      store.save()
      return console.log(`chaos = ${mode}`)
    }
    case 'price':
      state.priceOverrides[pos[0]] = Number(pos[1])
      store.save()
      return console.log(`giá ${pos[0]} = ${pos[1]}`)
    case 'stock': {
      const [id, branch, qty] = pos
      const base = store.seed<Record<string, Record<string, number>>>('stock.json')[id] ?? {}
      state.stockOverrides[id] = { ...base, ...state.stockOverrides[id], [branch]: Number(qty) }
      store.save()
      return console.log(`tồn ${id}@${branch} = ${qty}`)
    }
    case 'order-status': {
      const o = state.orders[pos[0]]
      if (!o) throw new Error('không có đơn')
      o.status = pos[1] as typeof o.status
      store.save()
      return console.log(`đơn ${o.id} -> ${o.status}`)
    }
    case 'webhook':
      return webhook(pos[0], pos[1])
    case 'orders':
      return console.log(JSON.stringify(Object.values(state.orders), null, 2))
    case 'reset':
      if (existsSync(stateFile())) rmSync(stateFile())
      return console.log('đã xóa trạng thái mock')
    default:
      console.log('Lệnh: chaos <mode> | price <id> <vnd> | stock <id> <branch> <qty> | order-status <id> <status> | webhook <event> <id> [--bad-signature|--old-timestamp] | orders | reset')
  }
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
