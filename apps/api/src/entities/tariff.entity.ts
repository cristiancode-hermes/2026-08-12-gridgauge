import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PeakOffPeak, Tier, UtilityType } from '../common/types';
import { Meter } from './meter.entity';
import { User } from './user.entity';

@Entity('tariffs')
export class Tariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 20, name: 'utility_type' })
  utilityType: UtilityType;

  @Column({ length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'numeric', precision: 10, scale: 4, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'fixed_fee', default: 0 })
  fixedFee: number;

  @Column({ type: 'simple-json', nullable: true })
  tiers: Tier[] | null;

  @Column({ type: 'simple-json', nullable: true, name: 'peak_off_peak' })
  peakOffPeak: PeakOffPeak | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => Meter, (m) => m.tariff)
  meters: Meter[];
}
