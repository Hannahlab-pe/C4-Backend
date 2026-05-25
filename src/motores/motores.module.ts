import { Module } from '@nestjs/common'
import { MotoresService } from './motores.service'

@Module({
  providers: [MotoresService],
  exports: [MotoresService],
})
export class MotoresModule {}
