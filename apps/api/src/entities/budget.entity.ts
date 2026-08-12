import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Meter } from './meter.entity';
import { User } from './user.entity';

@Entity('budgets')
@Unique(['meterId', 'period'])
export class Budget {
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

  /** Primer día del mes: YYYY-MM-01 */
  @Column({ type: 'date' })
  period: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
