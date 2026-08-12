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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTariffDto, UpdateTariffDto } from '../dto/api.dto';
import { TariffService } from './tariff.service';

@ApiTags('tariffs')
@Controller('tariffs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TariffController {
  constructor(private readonly tariffService: TariffService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.tariffService.list(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTariffDto) {
    return this.tariffService.create(userId, dto);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tariffService.findOne(userId, id);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateTariffDto) {
    return this.tariffService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.tariffService.remove(userId, id);
  }

  @Post(':id/duplicate')
  duplicate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tariffService.duplicate(userId, id);
  }
}
