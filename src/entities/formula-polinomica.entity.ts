import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

/** Coeficiente de incidencia de un elemento genérico (a_i); la suma de todos debe ser 1. */
export interface CoeficientePolinomico {
  generico: string   // ej. 'MO' | 'MAT' | 'EQP' | 'SUB' o el monomio de la fórmula
  a: number          // coeficiente de incidencia (0..1)
  descripcion?: string
}

/** Fórmula polinómica de reajuste de precios de un presupuesto (obra pública). */
@Entity('pre_formulas_polinomicas')
@Index(['presupuestoId'])
export class FormulaPolinomica {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'presupuesto_id' })
  presupuestoId: string

  /** Mes base = mes de la oferta (formato 'YYYY-MM'). */
  @Column({ name: 'mes_base' })
  mesBase: string

  @Column({ type: 'jsonb', default: [] })
  coeficientes: CoeficientePolinomico[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
