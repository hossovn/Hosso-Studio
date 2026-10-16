import { Injectable } from '@nestjs/common'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { components } from './api/schema'

type Order = components['schemas']['Order']

export type ChaosMode = 'off' | 'slow' | 'timeout' | 'error' | 'out_of_stock' | 'no-compat'

export type MockState = {
  chaos: ChaosMode
  priceOverrides: Record<string, number>
  stockOverrides: Record<string, Record<string, number>>
  orders: Record<string, Order>
  idempotency: Record<string, { fingerprint: string; orderId: string }>
  seq: number
}

const empty = (): MockState => ({ chaos: 'off', priceOverrides: {}, stockOverrides: {}, orders: {}, idempotency: {}, seq: 0 })

export const stateFile = () => resolve(process.env.MOCK_WIM_STATE || resolve(__dirname, '../data/state.json'))
export const seedDir = () => resolve(process.env.MOCK_WIM_SEED_DIR || resolve(__dirname, '../../../seed/wim'))

/**
 * Tầng dữ liệu của mock: một file JSON (đọc lại khi file đổi, để lệnh `mock` bên ngoài sửa được trạng thái).
 * Server WIM thật thay lớp này bằng truy vấn ERPNext; controller và DTO giữ nguyên.
 */
@Injectable()
export class Store {
  private state: MockState = empty()
  private mtime = -1

  get(): MockState {
    const file = stateFile()
    const m = existsSync(file) ? statSync(file).mtimeMs : 0
    if (m !== this.mtime) {
      this.state = existsSync(file) ? { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) } : empty()
      this.mtime = m
    }
    return this.state
  }

  save() {
    const file = stateFile()
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(this.state, null, 2))
    this.mtime = statSync(file).mtimeMs
  }

  seed<T>(name: string): T {
    return JSON.parse(readFileSync(resolve(seedDir(), name), 'utf8')) as T
  }
}
