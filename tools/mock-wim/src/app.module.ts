import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { CatalogService } from './catalog.service'
import { CatalogController, OrdersController, VehiclesController } from './controllers'
import { ApiKeyGuard, ChaosInterceptor, ErrorFilter } from './http'
import { Store } from './store'

@Module({
  controllers: [VehiclesController, CatalogController, OrdersController],
  providers: [
    Store,
    CatalogService,
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_INTERCEPTOR, useClass: ChaosInterceptor },
    { provide: APP_FILTER, useClass: ErrorFilter },
  ],
})
export class AppModule {}
