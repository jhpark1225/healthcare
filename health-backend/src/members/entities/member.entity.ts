import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('members')
export class Member {
  @PrimaryColumn({ name: 'member_id', type: 'varchar', length: 20 })
  member_id: string;

  @Column({ name: 'password', type: 'varchar', length: 200 })
  password: string;

  @Column({ name: 'api_key', type: 'varchar', length: 200, nullable: true })
  api_key: string;

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'gender', type: 'varchar', length: 1, nullable: true })
  gender: string;

  @Column({ name: 'birth_date', type: 'varchar', length: 8, nullable: true })
  birth_date: string;

  @Column({ name: 'member_type', type: 'varchar', length: 4, nullable: true })
  member_type: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updated_at: Date;
}
