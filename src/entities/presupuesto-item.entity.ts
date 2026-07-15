import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

export type TipoItem = 'titulo' | 'partida'

/**
 * Nodo del árbol WBS de un presupuesto: título (capítulo/sub-título) o partida (hoja).
 *  - parent_id arma el árbol (null = primer nivel).
 *  - Partida: metrado × costo_unitario_snapshot = parcial.
 * costo_unitario_snapshot y por_generico_snapshot se toman del APU al agregar/recalcular, para que
 * el presupuesto no cambie retroactivamente si luego se mueve un precio del catálogo.
 */
@Entity('pre_items')
@Index(['presupuestoId', 'parentId', 'orden'])
export class PresupuestoItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'presupuesto_id' })
  presupuestoId: string

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string | null

  @Column({ type: 'varchar', length: 8 })
  tipo: TipoItem

  @Column({ default: '' })
  codigo: string

  @Column({ default: '' })
  descripcion: string

  @Column({ name: 'partida_id', type: 'varchar', nullable: true })
  partidaId: string | null

  @Column({ type: 'decimal', precision: 16, scale: 4, nullable: true })
  metrado: string | null

  @Column({ name: 'costo_unitario_snapshot', type: 'decimal', precision: 14, scale: 2, nullable: true })
  costoUnitarioSnapshot: string | null

  /** Desglose { MO, MAT, EQP, SUB } del costo unitario snapshot — para coeficientes de incidencia. */
  @Column({ name: 'por_generico_snapshot', type: 'jsonb', nullable: true })
  porGenericoSnapshot: Record<string, number> | null

  @Column({ type: 'decimal', precision: 16, scale: 2, nullable: true })
  parcial: string | null

  @Column({ default: 0 })
  orden: number
}
