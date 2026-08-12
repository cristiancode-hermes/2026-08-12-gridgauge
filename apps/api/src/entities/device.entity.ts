import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meter } from './meter.entity';
import { User } from './user.entity';

@Entity('devices')
export class Device {
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

  @Column({ length: 80 })
  name: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  wattage: number;

  @Column({ type: 'numeric', precision: 4, scale: 2, name: 'hours_per_day' })
  hoursPerDay: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
