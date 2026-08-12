import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../entities/device.entity';
import { Meter } from '../entities/meter.entity';
import { Reading } from '../entities/reading.entity';
import { CreateDeviceDto, UpdateDeviceDto } from '../dto/api.dto';

export interface DeviceWithShare extends Device {
  kwhPerDay: number;
  sharePct: number | null;
}

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device) private readonly devicesRepo: Repository<Device>,
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    @InjectRepository(Reading) private readonly readingsRepo: Repository<Reading>,
  ) {}

  async list(userId: string): Promise<DeviceWithShare[]> {
    const devices = await this.devicesRepo.find({
      where: { userId },
      relations: { meter: true },
      order: { createdAt: 'DESC' },
    });
    const result: DeviceWithShare[] = [];
    for (const d of devices) {
      result.push(await this.decorate(d));
    }
    return result;
  }

  async create(userId: string, dto: CreateDeviceDto): Promise<Device> {
    const meter = await this.metersRepo.findOne({ where: { id: dto.meterId, userId } });
    if (!meter) throw new BadRequestException('METER_NOT_FOUND');
    if (dto.wattage <= 0) throw new BadRequestException('WATTAGE_MUST_BE_POSITIVE');
    if (dto.hoursPerDay < 0 || dto.hoursPerDay > 24) throw new BadRequestException('HOURS_OUT_OF_RANGE');
    const device = this.devicesRepo.create({
      userId,
      meterId: dto.meterId,
      name: dto.name,
      wattage: dto.wattage,
      hoursPerDay: dto.hoursPerDay,
    } as any);
    return (await this.devicesRepo.save(device)) as unknown as Device;
  }

  async update(userId: string, id: string, dto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(userId, id);
    if (dto.name !== undefined) device.name = dto.name;
    if (dto.wattage !== undefined) {
      if (dto.wattage <= 0) throw new BadRequestException('WATTAGE_MUST_BE_POSITIVE');
      device.wattage = dto.wattage;
    }
    if (dto.hoursPerDay !== undefined) {
      if (dto.hoursPerDay < 0 || dto.hoursPerDay > 24) throw new BadRequestException('HOURS_OUT_OF_RANGE');
      device.hoursPerDay = dto.hoursPerDay;
    }
    if (dto.active !== undefined) device.active = dto.active;
    return (await this.devicesRepo.save(device)) as unknown as Device;
  }

  async remove(userId: string, id: string): Promise<void> {
    const device = await this.findOne(userId, id);
    await this.devicesRepo.delete({ id: device.id });
  }

  async findOne(userId: string, id: string): Promise<Device> {
    const device = await this.devicesRepo.findOne({ where: { id, userId } });
    if (!device) throw new NotFoundException('DEVICE_NOT_FOUND');
    return device;
  }

  private async decorate(device: Device): Promise<DeviceWithShare> {
    const kwhPerDay = round((Number(device.wattage) * Number(device.hoursPerDay)) / 1000, 2);
    let sharePct: number | null = null;
    if (device.meter?.utilityType === 'electricity') {
      const from = new Date(Date.now() - 30 * 86400000);
      const agg = await this.readingsRepo.createQueryBuilder('r')
        .select('COALESCE(SUM(r.value), 0)', 'total')
        .where('r.meterId = :meterId', { meterId: device.meterId })
        .andWhere('r.periodStart >= :from', { from })
        .getRawOne();
      const avgDaily = Number(agg?.total ?? 0) / 30;
      sharePct = avgDaily > 0 ? round((kwhPerDay / avgDaily) * 100, 1) : null;
    }
    return { ...device, kwhPerDay, sharePct };
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
