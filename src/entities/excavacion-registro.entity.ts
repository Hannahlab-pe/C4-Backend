import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('excavaciones_registro')
export class ExcavacionRegistro {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'proyecto_id' })
  proyectoId: string

  // Información General
  @Column()
  nombre: string

  @Column({ type: 'decimal', name: 'area_total_m2', nullable: true })
  areaTotalM2: number

  @Column({ type: 'decimal', name: 'profundidad_total_m', nullable: true })
  profundidadTotalM: number

  @Column({ type: 'decimal', name: 'volumen_total_m3', nullable: true })
  volumenTotalM3: number

  @Column({ type: 'decimal', name: 'longitud_total_m', nullable: true })
  longitudTotalM: number

  @Column({ type: 'decimal', name: 'ancho_promedio_m', nullable: true })
  anchoPromedioM: number

  @Column({ type: 'decimal', name: 'cota_referencia_msnm', nullable: true })
  cotaReferenciaMsnm: number

  // Características Técnicas
  @Column({ name: 'tipo_excavacion', nullable: true })
  tipoExcavacion: string

  @Column({ name: 'clasificacion_terreno', nullable: true })
  clasificacionTerreno: string

  @Column({ name: 'metodo_excavacion', nullable: true })
  metodoExcavacion: string

  @Column({ name: 'turno_trabajo', nullable: true })
  turnoTrabajo: string

  // Condiciones Geológicas
  @Column({ type: 'decimal', name: 'nivel_freatico_m', nullable: true })
  nivelFreatico: number

  @Column({ type: 'decimal', name: 'coord_utm_norte', nullable: true })
  coordUtmNorte: number

  @Column({ type: 'decimal', name: 'coord_utm_este', nullable: true })
  coordUtmEste: number

  @Column({ type: 'decimal', name: 'pendiente_natural_pct', nullable: true })
  pendienteNatural: number

  // Planificación
  @Column({ name: 'fecha_inicio', nullable: true })
  fechaInicio: string

  @Column({ name: 'fecha_fin_estimada', nullable: true })
  fechaFinEstimada: string

  @Column({ type: 'int', name: 'duracion_estimada_dias', nullable: true })
  duracionEstimadaDias: number

  @Column({ name: 'ingeniero_responsable', nullable: true })
  ingenieroResponsable: string

  @Column({ name: 'residente_obra', nullable: true })
  residenteObra: string

  @Column({ name: 'supervisor_seguridad', nullable: true })
  supervisorSeguridad: string

  // Estado
  @Column({ default: 'Planificada' })
  estado: string

  @Column({ type: 'text', nullable: true })
  observaciones: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
