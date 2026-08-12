import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Anomaly } from '../entities/anomaly.entity';
import { Meter } from '../entities/meter.entity';
import { AnomalyDetectorService } from './anomaly-detector.service';

@Injectable()
export class AnomalyService {
  constructor(
    @InjectRepository(Anomaly) private readonly anomaliesRepo: Repository<Anomaly>,
    @InjectRepository(Meter) private readonly metersRepo: Repository<Meter>,
    private readonly detector: AnomalyDetectorService,
  ) {}

  async list(userId: string, type?: string, severity?: string, status?: string, page = 1, limit = 25) {
    const qb = this.anomaliesRepo.createQueryBuilder('a')
      .where('a.userId = :userId', { userId })
      .leftJoinAndSelect('a.meter', 'meter');
    if (type) qb.andWhere('a.type = :type', { type });
    if (severity) qb.andWhere('a.severity = :severity', { severity });
    if (status === 'open') qb.andWhere('a.resolvedAt IS NULL');
    if (status === 'resolved') qb.andWhere('a.resolvedAt IS NOT NULL');
    const [items, total] = await qb
      .orderBy('a.detectedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total };
  }

  async resolve(userId: string, id: string, note?: string): Promise<Anomaly> {
    const anomaly = await this.anomaliesRepo.findOne({ where: { id, userId } });
    if (!anomaly) throw new NotFoundException('ANOMALY_NOT_FOUND');
    if (anomaly.resolvedAt) throw new ConflictException('ALREADY_RESOLVED');
    anomaly.resolvedAt = new Date();
    anomaly.note = note ?? anomaly.note;
    return (await this.anomaliesRepo.save(anomaly)) as unknown as Anomaly;
  }

  async dismiss(userId: string, id: string): Promise<Anomaly> {
    const anomaly = await this.anomaliesRepo.findOne({ where: { id, userId } });
    if (!anomaly) throw new NotFoundException('ANOMALY_NOT_FOUND');
    anomaly.resolvedAt = new Date();
    anomaly.note = 'descartada';
    return (await this.anomaliesRepo.save(anomaly)) as unknown as Anomaly;
  }

  async detect(userId: string) {
    return this.detector.runAll(userId);
  }
}
