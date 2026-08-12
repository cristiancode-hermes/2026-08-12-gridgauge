import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { TariffsModule } from '../tariffs/tariff.module';
import { AnomalyDetectorService } from '../anomalies/anomaly-detector.service';
import { MeterController } from './meter.controller';
import { MeterService } from './meter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meter, Reading, Tariff, Anomaly]),
    TariffsModule,
  ],
  controllers: [MeterController],
  providers: [MeterService, AnomalyDetectorService],
  exports: [MeterService, AnomalyDetectorService],
})
export class MetersModule {}
