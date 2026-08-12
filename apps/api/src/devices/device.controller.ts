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
import { CreateDeviceDto, UpdateDeviceDto } from '../dto/api.dto';
import { DeviceService } from './device.service';

@ApiTags('devices')
@Controller('devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.deviceService.list(userId);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDeviceDto) {
    return this.deviceService.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateDeviceDto) {
    return this.deviceService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.deviceService.remove(userId, id);
  }
}
