import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { DiseaseCode } from './disease-code.entity';

@Entity('member_diseases')
export class MemberDisease {
  @PrimaryGeneratedColumn({ name: 'diagnosis_seq' })
  diagnosis_seq: number;

  @Column({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'disease_id', type: 'varchar', length: 20 })
  disease_id: string;

  @Column({ name: 'diagnosis_content', type: 'varchar', length: 512, nullable: true })
  diagnosis_content: string;

  @Column({ name: 'diagnosed_at', type: 'timestamp' })
  diagnosed_at: Date;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updated_at: Date;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => DiseaseCode)
  @JoinColumn({ name: 'disease_id' })
  diseaseCode: DiseaseCode;
}
