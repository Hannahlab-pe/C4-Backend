import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

// Checklist de documentos/permisos que un proyecto necesita para una fase.
// La IA lo genera según el caso (distrito, patrimonio, sótanos...) y el usuario
// lo completa subiendo el archivo (se linkea con documentoId del módulo Documentos).
@Entity('documentos_requeridos')
@Index(['proyectoId', 'fase'])
export class DocumentoRequerido {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  @Column()
  fase: string

  @Column()
  nombre: string

  @Column({ type: 'text', default: '' })
  descripcion: string

  @Column({ default: '' })
  entidad: string         // quién lo emite: Min. Cultura, Municipalidad, SUNARP...

  @Column({ default: true })
  obligatorio: boolean

  @Column({ default: 'pendiente' })
  estado: string          // pendiente | subido | observado | no_aplica

  @Column({ name: 'documento_id', type: 'uuid', nullable: true })
  documentoId: string | null   // link al Documento subido

  @Column({ type: 'int', default: 0 })
  orden: number

  @Column({ type: 'text', default: '' })
  notas: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
