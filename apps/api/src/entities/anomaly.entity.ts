import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AnomalySeverity, AnomalyType } from '../common/types';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';
import { User } from './user.entity';

@Entity('anomalies')
export class Anomaly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter: Meter;

  @Column({ name: 'meter_id' })
  meterId: string;

  @ManyToOne(() => Reading, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reading_id' })
  reading: Reading | null;

  @Column({ type: 'varchar', name: 'reading_id', nullable: true })
  readingId: string | null;

  @Column({ type: 'varchar', length: 20 })
  type: AnomalyType;

  @Column({ type: 'varchar', length: 10 })
  severity: AnomalySeverity;

  @Column({ type: 'datetime', name: 'detected_at', default: () => 'CURRENT_TIMESTAMP' })
  detectedAt: Date;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'expected_value', nullable: true })
  expectedValue: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 3, name: 'actual_value', nullable: true })
  actualValue: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, name: 'deviation_pct', nullable: true })
  deviationPct: number | null;

  @Column({ type: 'datetime', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
