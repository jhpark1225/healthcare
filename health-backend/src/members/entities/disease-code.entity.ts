import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('disease_codes')
export class DiseaseCode {
  @PrimaryColumn({ name: 'disease_id', type: 'varchar', length: 20 })
  disease_id: string;

  @Column({ name: 'disease_name_en', type: 'varchar', length: 100 })
  disease_name_en: string;

  @Column({ name: 'disease_name_kr', type: 'varchar', length: 100 })
  disease_name_kr: string;

  @Column({ name: 'disease_category', type: 'varchar', length: 50, nullable: true })
  disease_category: string;

  @Column({ name: 'severity', type: 'varchar', length: 20, nullable: true })
  severity: string;

  @Column({ name: 'description', type: 'varchar', length: 512, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;
}
