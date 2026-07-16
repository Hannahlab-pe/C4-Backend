import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/**
 * Bitácora TRANSVERSAL de toda escritura hecha por el agente de IA (cualquier módulo).
 * A diferencia de pre_audit_log (que es solo del módulo Presupuestos), esta registra
 * las tools de escritura de TODO el sistema, después de pasar por el gate de confirmación.
 */
@Entity('agent_audit_log')
@Index(['proyectoId', 'creadoEn'])
export class AgentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** Nombre de la tool ejecutada (ej. 'cargar_obra_completa', 'crear_seguridad'). */
  @Column()
  tool: string

  /** Módulo/tabla afectada (ej. 'fases', 'proyectos', 'cronograma', 'presupuestos'). */
  @Column({ name: 'modulo', type: 'varchar', nullable: true })
  modulo: string | null

  @Column({ name: 'proyecto_id', type: 'varchar', nullable: true })
  proyectoId: string | null

  /** Quién la disparó: sub del JWT (canal web) o teléfono (canal bot). */
  @Column({ name: 'usuario_id', type: 'varchar', nullable: true })
  usuarioId: string | null

  /** Canal de origen: 'web' | 'whatsapp' | 'telegram'. */
  @Column({ name: 'canal', type: 'varchar', nullable: true })
  canal: string | null

  /** Argumentos de la tool / resumen de lo que se creó o modificó. */
  @Column({ type: 'jsonb', nullable: true })
  payload: any | null

  /**
   * true  = pasó por el gate de confirmación explícita del usuario.
   * false = ejecutada SIN confirmación (solo para registros marcados como pre-fix, si aplica).
   */
  @Column({ default: true })
  confirmado: boolean

  /** Resultado de la ejecución: 'ok' | 'error' | 'cancelado'. */
  @Column({ name: 'resultado', type: 'varchar', nullable: true })
  resultado: string | null

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date
}
