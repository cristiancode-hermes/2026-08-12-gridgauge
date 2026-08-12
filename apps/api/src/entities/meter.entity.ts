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
import { UtilityType } from '../common/types';
import { Anomaly } from './anomaly.entity';
import { Budget } from './budget.entity';
import { Device } from './device.entity';
import { Reading } from './reading.entity';
import { Tariff } from './tariff.entity';
import { User } from './user.entity';

@Entity('meters')
export class Meter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Tariff, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tariff_id' })
  tariff: Tariff | null;

  @Column({ type: 'varchar', name: 'tariff_id', nullable: true })
  tariffId: string | null;

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'varchar', length: 20, name: 'utility_type' })
  utilityType: UtilityType;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ type: 'varchar', name: 'serial_number', length: 40, nullable: true })
  serialNumber: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => Reading, (r) => r.meter)
  readings: Reading[];

  @OneToMany(() => Anomaly, (a) => a.meter)
  anomalies: Anomaly[];

  @OneToMany(() => Budget, (b) => b.meter)
  budgets: Budget[];

  @OneToMany(() => Device, (d) => d.meter)
  devices: Device[];
}
