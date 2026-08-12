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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMeterDto, CreateReadingDto, UpdateMeterDto } from '../dto/api.dto';
import { MeterService } from './meter.service';

@ApiTags('meters')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MeterController {
  constructor(private readonly meterService: MeterService) {}

  @Get('meters')
  list(@CurrentUser('id') userId: string) {
    return this.meterService.list(userId);
  }

  @Post('meters')
  create(@CurrentUser('id') userId: string, @Body() dto: CreateMeterDto) {
    return this.meterService.create(userId, dto);
  }

  @Get('meters/:id')
  getDetail(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.meterService.getDetail(userId, id);
  }

  @Patch('meters/:id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateMeterDto) {
    return this.meterService.update(userId, id, dto);
  }

  @Delete('meters/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.meterService.remove(userId, id);
  }

  @Get('meters/:id/readings')
  listReadings(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.meterService.listReadings(userId, id, Number(page || 1), Number(limit || 25), from, to);
  }

  @Post('meters/:id/readings')
  createReading(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: CreateReadingDto) {
    return this.meterService.createReading(userId, id, dto);
  }

  @Post('meters/:id/readings/bulk')
  @UseInterceptors(FileInterceptor('file'))
  bulkImport(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
    if (!file) throw new Error('CSV_FILE_REQUIRED');
    const csv = file.buffer.toString('utf8');
    return this.meterService.bulkImportCsv(userId, id, csv);
  }

  @Delete('readings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeReading(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.meterService.removeReading(userId, id);
  }

  @Get('meters/:id/series')
  series(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('bucket') bucket?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const b = (['day', 'week', 'month', 'year'] as const).includes(bucket as any)
      ? (bucket as 'day' | 'week' | 'month' | 'year')
      : 'day';
    return this.meterService.series(userId, id, b, from || '', to || '');
  }

  @Get('meters/:id/stats')
  stats(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('period') period?: string,
  ) {
    const p = period || new Date().toISOString().slice(0, 7);
    return this.meterService.stats(userId, id, p);
  }
}
