import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('member_heart_rates')
export class MemberHeartRate {
  @PrimaryGeneratedColumn({ name: 'seq' })
  seq: number;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'heart_rate', type: 'int' })
  heart_rate: number;

  @Column({ name: 'status', type: 'varchar', length: 200, nullable: true })
  status: string;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string;

  @Column({ name: 'measured_at', type: 'timestamp' })
  measured_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
