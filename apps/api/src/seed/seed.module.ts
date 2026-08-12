import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Budget } from '../entities/budget.entity';
import { Device } from '../entities/device.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { Tariff } from '../entities/tariff.entity';
import { User } from '../entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Meter, Reading, Tariff, Budget, Anomaly, Device])],
  providers: [SeedService],
})
export class SeedModule {}
