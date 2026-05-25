import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity()
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  proyectoId: string

  @Column()
  nombre: string

  @Column()
  tipo: string  // 'pdf' | 'image'

  @Column({ type: 'text', nullable: true })
  textoExtraido: string | null  // PDF → texto extraído

  @Column({ type: 'text', nullable: true })
  base64: string | null  // imágenes → para visión GPT-4o

  @Column({ type: 'text', nullable: true })
  mimeType: string | null

  @CreateDateColumn()
  createdAt: Date
}
