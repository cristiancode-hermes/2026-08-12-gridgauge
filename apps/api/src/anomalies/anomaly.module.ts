import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { AnomalyController } from './anomaly.controller';
import { AnomalyDetectorService } from './anomaly-detector.service';
import { AnomalyService } from './anomaly.service';

@Module({
  imports: [TypeOrmModule.forFeature([Anomaly, Meter, Reading])],
  controllers: [AnomalyController],
  providers: [AnomalyService, AnomalyDetectorService],
  exports: [AnomalyService, AnomalyDetectorService],
})
export class AnomaliesModule {}
