import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('member_blood_pressures')
export class MemberBloodPressure {
  @PrimaryGeneratedColumn({ name: 'seq' })
  seq: number;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'systolic', type: 'int' })
  systolic: number;

  @Column({ name: 'diastolic', type: 'int' })
  diastolic: number;

  @Column({ name: 'status', type: 'varchar', length: 200, nullable: true })
  status: string | null;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'measured_at', type: 'timestamp' })
  measured_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
