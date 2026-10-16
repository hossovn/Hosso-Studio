import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }))
  return app
}

async function bootstrap() {
  const app = await createApp()
  const port = Number(process.env.MOCK_WIM_PORT || 4010)
  await app.listen(port)
  console.log(`Mock WIM chạy tại http://localhost:${port}/v1 (X-API-Key mặc định: mock-wim-key)`)
}

if (require.main === module) bootstrap()
