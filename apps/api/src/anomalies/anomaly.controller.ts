import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResolveAnomalyDto } from '../dto/api.dto';
import { AnomalyService } from './anomaly.service';

@ApiTags('anomalies')
@Controller('anomalies')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnomalyController {
  constructor(private readonly anomalyService: AnomalyService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.anomalyService.list(userId, type, severity, status, Number(page || 1), Number(limit || 25));
  }

  @Patch(':id/resolve')
  resolve(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: ResolveAnomalyDto) {
    return this.anomalyService.resolve(userId, id, dto.note);
  }

  @Patch(':id/dismiss')
  dismiss(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.anomalyService.dismiss(userId, id);
  }

  @Post('detect')
  detect(@CurrentUser('id') userId: string) {
    return this.anomalyService.detect(userId);
  }
}
