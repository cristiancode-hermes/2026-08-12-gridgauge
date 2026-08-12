import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meter } from '../entities/meter.entity';
import { Tariff } from '../entities/tariff.entity';
import { TariffController } from './tariff.controller';
import { TariffService } from './tariff.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff, Meter])],
  controllers: [TariffController],
  providers: [TariffService],
  exports: [TariffService],
})
export class TariffsModule {}
