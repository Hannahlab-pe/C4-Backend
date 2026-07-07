import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm'

/** Biblioteca maestra de partidas (WBS) — catálogo global reusado por todos los proyectos. */
@Entity('partidas_catalogo')
export class PartidaCatalogo {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 30, default: '' })
  codigo: string

  @Column({ type: 'text', default: '' })
  capitulo: string

  @Column({ type: 'text', default: '' })
  subcapitulo: string

  @Index()
  @Column({ type: 'text', default: '' })
  sistema: string

  @Column({ type: 'text', default: '' })
  partida: string

  @Column({ type: 'varchar', length: 40, default: '' })
  tipo: string

  @Column({ type: 'varchar', length: 20, default: '' })
  unidad: string

  @Column({ type: 'text', default: '' })
  especialidad: string

  @Index()
  @Column({ type: 'varchar', length: 60, default: '' })
  fase: string

  @Column({ type: 'text', default: '' })
  predecesora: string

  @Column({ type: 'text', default: '' })
  alcance: string

  @Column({ type: 'text', default: '' })
  control: string
}
