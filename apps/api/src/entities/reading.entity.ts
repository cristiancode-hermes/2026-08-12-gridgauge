import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ReadingSource } from '../common/types';
import { Meter } from './meter.entity';

@Entity('readings')
@Unique(['meterId', 'periodStart'])
export class Reading {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meter_id' })
  meter: Meter;

  @Column({ name: 'meter_id' })
  meterId: string;

  @Column({ type: 'datetime', name: 'period_start' })
  periodStart: Date;

  @Column({ type: 'datetime', name: 'period_end' })
  periodEnd: Date;

  @Column({ type: 'numeric', precision: 12, scale: 3 })
  value: number;

  @Column({ type: 'varchar', length: 10, default: 'manual' })
  source: ReadingSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;
}
