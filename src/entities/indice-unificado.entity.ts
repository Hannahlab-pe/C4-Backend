import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

/**
 * Índice Unificado de Precios de la Construcción (INEI), publicado mensualmente.
 * Se usa como Io (mes base) e Ir (mes de reajuste) en la fórmula polinómica.
 */
@Entity('pre_indices_unificados')
@Index(['codigo', 'anio', 'mes'], { unique: true })
export class IndiceUnificado {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** Código del índice unificado INEI (ej. '01', '47'...) o el genérico usado en la fórmula. */
  @Column()
  codigo: string

  @Column({ default: '' })
  descripcion: string

  @Column()
  anio: number

  @Column()
  mes: number

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  valor: string
}
