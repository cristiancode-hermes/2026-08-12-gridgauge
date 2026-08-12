import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { User } from '../entities/user.entity';
import { TariffsModule } from '../tariffs/tariff.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([Meter, Reading, User]), TariffsModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportsModule {}
