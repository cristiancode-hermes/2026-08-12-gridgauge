import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from '../entities/device.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';

@Module({
  imports: [TypeOrmModule.forFeature([Device, Meter, Reading])],
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DevicesModule {}
