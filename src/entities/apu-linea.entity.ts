import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

export type ClaseApu = 'MO' | 'MAT' | 'EQP' | 'SUB' | 'PARTIDA'

/**
 * Línea del APU de una partida: un recurso (MO/MAT/EQP/SUB) o una sub-partida (PARTIDA).
 *  - MO/EQP: se define cuadrilla + rendimiento → cantidad = cuadrilla / rendimiento.
 *  - MAT/SUB/PARTIDA: cantidad fija por unidad de la partida.
 * precio_snapshot / parcial son cacheados por conveniencia; la fuente de verdad del precio es el
 * Recurso (o el costo unitario recursivo de la sub-partida). Se recalculan con el motor.
 */
@Entity('pre_apu_lineas')
@Index(['partidaId', 'orden'])
export class ApuLineaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'partida_id' })
  partidaId: string

  @Column({ type: 'varchar', length: 8 })
  clase: ClaseApu

  /** recurso_id si clase ∈ {MO,MAT,EQP,SUB}; subpartida_id si clase = PARTIDA. */
  @Column({ name: 'ref_id' })
  refId: string

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  cuadrilla: string | null

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  rendimiento: string | null

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  cantidad: string | null

  @Column({ name: 'precio_snapshot', type: 'decimal', precision: 14, scale: 4, nullable: true })
  precioSnapshot: string | null

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  parcial: string | null

  @Column({ default: 0 })
  orden: number
}
