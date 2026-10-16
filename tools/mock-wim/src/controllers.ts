import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { Response } from 'express'
import type { components } from './api/schema'
import { CatalogService } from './catalog.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { ProductQueryDto } from './dto/product-query.dto'
import { ApiError } from './http'
import { Store } from './store'

type Order = components['schemas']['Order']

@Controller('v1/vehicles')
export class VehiclesController {
  constructor(private readonly catalog: CatalogService) {}

  private data() {
    const v = this.catalog.vehicles()
    if (!v) throw new ApiError(404, 'not_available', 'WIM chưa cung cấp dữ liệu xe')
    return v
  }

  @Get('makes') makes() {
    return { items: this.data().makes }
  }

  @Get('makes/:make/models') models(@Param('make') make: string) {
    const items = this.data().models[make]
    if (!items) throw new ApiError(404, 'not_found', `Không có hãng ${make}`)
    return { items }
  }

  @Get('models/:model/years') years(@Param('model') model: string) {
    const items = this.data().years[model]
    if (!items) throw new ApiError(404, 'not_found', `Không có dòng xe ${model}`)
    return { items }
  }
}

@Controller('v1')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products') products(@Query() q: ProductQueryDto) {
    return this.catalog.list(q)
  }

  @Get('products/:id') product(@Param('id') id: string) {
    const p = this.catalog.product(id)
    if (!p) throw new ApiError(404, 'not_found', `Không có sản phẩm ${id}`)
    return p
  }

  @Get('products/:id/availability') availability(@Param('id') id: string) {
    const p = this.catalog.product(id)
    if (!p) throw new ApiError(404, 'not_found', `Không có sản phẩm ${id}`)
    const stock = this.catalog.stock(id)
    return { productId: id, price: p.price, branches: Object.entries(stock).map(([branchId, available]) => ({ branchId, available })) }
  }

  @Get('categories') categories() {
    return { items: this.catalog.categories() }
  }

  @Get('branches') branches() {
    return { items: this.catalog.branches() }
  }
}

@Controller('v1/orders')
export class OrdersController {
  constructor(
    private readonly store: Store,
    private readonly catalog: CatalogService,
  ) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateOrderDto, @Headers('idempotency-key') key: string | undefined, @Res({ passthrough: true }) res: Response): Order {
    if (!key || key.length < 8 || key.length > 128) throw new ApiError(400, 'bad_request', 'Thiếu hoặc sai header Idempotency-Key')
    const state = this.store.get()

    // Cùng key + cùng nội dung: trả lại đơn cũ, không tạo đơn mới.
    const fingerprint = createHash('sha256').update(JSON.stringify(dto)).digest('hex')
    const seen = state.idempotency[key]
    if (seen) {
      if (seen.fingerprint !== fingerprint) throw new ApiError(422, 'idempotency_conflict', 'Idempotency-Key đã dùng cho nội dung khác')
      res.status(200)
      return state.orders[seen.orderId]
    }

    const { fulfillment } = dto
    if (fulfillment.type === 'pickup') {
      if (!fulfillment.branchId || !this.catalog.branches().some((b) => b.id === fulfillment.branchId))
        throw new ApiError(400, 'bad_request', 'Nhận tại chi nhánh cần branchId hợp lệ')
    } else if (!dto.customer.address) {
      throw new ApiError(400, 'bad_request', 'Giao tận nơi cần địa chỉ')
    }

    const lines: components['schemas']['OrderLine'][] = []
    let total = 0
    for (const line of dto.items) {
      const p = this.catalog.product(line.productId)
      if (!p) throw new ApiError(404, 'not_found', `Không có sản phẩm ${line.productId}`)
      const stock = this.catalog.stock(line.productId)
      const available = fulfillment.type === 'pickup' ? (stock[fulfillment.branchId!] ?? 0) : Object.values(stock).reduce((a, b) => a + b, 0)
      if (available < line.quantity)
        throw new ApiError(409, 'out_of_stock', `Không đủ hàng: ${p.name}`, { productId: p.id })
      lines.push({ productId: p.id, quantity: line.quantity, name: p.name, unitPrice: p.price })
      total += p.price * line.quantity
    }

    // Trừ tồn: nhận tại chi nhánh thì trừ chi nhánh đó; giao tận nơi trừ lần lượt các chi nhánh.
    for (const line of dto.items) {
      const stock = { ...this.catalog.stock(line.productId) }
      let need = line.quantity
      const order = fulfillment.type === 'pickup' ? [fulfillment.branchId!] : Object.keys(stock)
      for (const b of order) {
        const take = Math.min(stock[b], need)
        stock[b] -= take
        need -= take
      }
      state.stockOverrides[line.productId] = stock
    }

    const id = `WO-${String(++state.seq).padStart(6, '0')}`
    const order: Order = {
      id,
      status: 'new',
      items: lines,
      total,
      customer: dto.customer,
      fulfillment,
      createdAt: new Date().toISOString(),
    }
    state.orders[id] = order
    state.idempotency[key] = { fingerprint, orderId: id }
    this.store.save()
    return order
  }

  @Get(':id')
  get(@Param('id') id: string): Order {
    const o = this.store.get().orders[id]
    if (!o) throw new ApiError(404, 'not_found', `Không có đơn ${id}`)
    return o
  }
}
