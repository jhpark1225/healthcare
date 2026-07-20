import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('member_weights')
export class MemberWeight {
  @PrimaryGeneratedColumn({ name: 'seq' })
  seq: number;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2 })
  weight_kg: number;

  @Column({ name: 'bmi', type: 'decimal', precision: 5, scale: 2 })
  bmi: number;

  @Column({ name: 'skeletal_muscle_mass', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skeletal_muscle_mass: number | null;

  @Column({ name: 'body_fat_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  body_fat_percentage: number | null;

  @Column({ name: 'status', type: 'varchar', length: 100, nullable: true })
  status: string | null;

  @Column({ name: 'note', type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ name: 'measured_at', type: 'timestamp' })
  measured_at: Date;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
