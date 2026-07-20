import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('member_steps')
export class MemberStep {
  @PrimaryGeneratedColumn({ name: 'seq' })
  seq: number;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'cumulative_steps', type: 'int' })
  cumulative_steps: number;

  @Column({ name: 'measured_at', type: 'timestamp' })
  measured_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
