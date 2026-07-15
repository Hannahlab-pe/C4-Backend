import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * Bitácora de auditoría del módulo de presupuestos: TODO cambio de precio, cantidad, rendimiento o
 * metrado queda registrado (quién, qué campo, valor anterior → nuevo, cuándo). Ventaja estructural
 * sobre S10 (escritorio, no colaborativo).
 */
@Entity('pre_audit_log')
@Index(['entidad', 'entidadId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  entidad: string // 'recurso' | 'partida' | 'apu_linea' | 'presupuesto_item' ...

  @Column({ name: 'entidad_id' })
  entidadId: string

  @Column({ name: 'usuario_id', type: 'varchar', nullable: true })
  usuarioId: string | null

  @Column()
  campo: string

  @Column({ name: 'valor_anterior', type: 'text', nullable: true })
  valorAnterior: string | null

  @Column({ name: 'valor_nuevo', type: 'text', nullable: true })
  valorNuevo: string | null

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date
}
