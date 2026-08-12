import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from '../entities/budget.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { TariffsModule } from '../tariffs/tariff.module';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Meter, Reading]), TariffsModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetsModule {}
