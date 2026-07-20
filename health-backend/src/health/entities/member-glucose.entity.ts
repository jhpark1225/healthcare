import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('member_glucose')
export class MemberGlucose {
  @PrimaryGeneratedColumn({ name: 'seq' })
  seq: number;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'glucose_value', type: 'decimal', precision: 6, scale: 2 })
  glucose_value: number;

  @Column({ name: 'status', type: 'varchar', length: 100, nullable: true })
  status: string | null;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'measured_at', type: 'timestamp' })
  measured_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
