import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Anomaly } from './anomaly.entity';
import { Budget } from './budget.entity';
import { Device } from './device.entity';
import { Meter } from './meter.entity';
import { Tariff } from './tariff.entity';
import { Co2Factors, DEFAULT_CO2_FACTORS, DEFAULT_PREFS, UserPrefs } from '../common/types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', name: 'display_name', length: 80, nullable: true })
  displayName: string | null;

  @Column({ length: 3, default: 'EUR' })
  currency: string;

  @Column({ length: 64, default: 'Europe/Madrid' })
  timezone: string;

  @Column({
    type: 'simple-json',
    name: 'co2_factors',
    default: () => "'{\"electricity\":0.21,\"water\":0.34,\"gas\":2.04}'",
  })
  co2Factors: Co2Factors;

  @Column({
    type: 'simple-json',
    default: () => "'{\"spikeThresholdSigma\":2.5,\"quietWindow\":{\"start\":\"02:00\",\"end\":\"05:00\"},\"quietWindowEnabled\":true}'",
  })
  prefs: UserPrefs;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @OneToMany(() => Meter, (m) => m.user)
  meters: Meter[];

  @OneToMany(() => Tariff, (t) => t.user)
  tariffs: Tariff[];

  @OneToMany(() => Budget, (b) => b.user)
  budgets: Budget[];

  @OneToMany(() => Anomaly, (a) => a.user)
  anomalies: Anomaly[];

  @OneToMany(() => Device, (d) => d.user)
  devices: Device[];
}
