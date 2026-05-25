import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import * as express from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false })

  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))

  app.enableCors({ origin: 'http://localhost:5173', credentials: true })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  app.setGlobalPrefix('api')

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
