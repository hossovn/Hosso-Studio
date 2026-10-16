import {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { Observable, from, switchMap } from 'rxjs'
import { Store } from './store'

/** Lỗi theo hợp đồng: { error: { code, message, productId? } }. */
export class ApiError extends HttpException {
  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super({ error: { code, message, ...extra } }, status)
  }
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()
    if (e instanceof HttpException) {
      const body = e.getResponse() as any
      if (body?.error) return res.status(e.getStatus()).json(body)
      const message = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? e.message)
      const status = e.getStatus()
      const code = status === 404 ? 'not_found' : status === 401 ? 'unauthorized' : 'bad_request'
      return res.status(status).json({ error: { code, message } })
    }
    console.error(e)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: { code: 'internal', message: 'Lỗi máy chủ' } })
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>()
    const expected = process.env.MOCK_WIM_API_KEY || 'mock-wim-key'
    if (req.header('x-api-key') !== expected) throw new ApiError(401, 'unauthorized', 'Khóa API không hợp lệ')
    return true
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Mô phỏng WIM chậm, treo hoặc lỗi theo chế độ đặt bằng lệnh `mock chaos <mode>`. */
@Injectable()
export class ChaosInterceptor implements NestInterceptor {
  constructor(private readonly store: Store) {}

  intercept(_: ExecutionContext, next: CallHandler): Observable<unknown> {
    const mode = this.store.get().chaos
    const delay = mode === 'slow' ? Number(process.env.MOCK_WIM_SLOW_MS || 6000) : mode === 'timeout' ? 60_000 : 0
    return from(sleep(delay)).pipe(
      switchMap(() => {
        if (mode === 'error') throw new ApiError(503, 'unavailable', 'WIM tạm thời không khả dụng')
        return next.handle()
      }),
    )
  }
}
