import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBudgetDto, UpdateBudgetDto } from '../dto/api.dto';
import { BudgetService } from './budget.service';

@ApiTags('budgets')
@Controller('budgets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('period') period?: string) {
    const p = period || new Date().toISOString().slice(0, 7);
    return this.budgetService.list(userId, p);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBudgetDto) {
    return this.budgetService.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.budgetService.remove(userId, id);
  }
}
