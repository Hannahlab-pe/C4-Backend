import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Recurso } from '../entities/recurso.entity'
import { RecursoPrecio } from '../entities/recurso-precio.entity'
import { Partida } from '../entities/partida.entity'
import { ApuLineaEntity } from '../entities/apu-linea.entity'
import { Presupuesto } from '../entities/presupuesto.entity'
import { PresupuestoItem } from '../entities/presupuesto-item.entity'
import { AuditLog } from '../entities/audit-log.entity'
import {
  calcularApu, calcularPresupuesto, CalcContext, ApuLinea, ItemDef, ApuResultado,
} from './engine'

/** Servicio del módulo Presupuestos y Costos. Toda la lógica de negocio usa el motor puro. */
@Injectable()
export class PresupuestosService {
  constructor(
    @InjectRepository(Recurso) private recursos: Repository<Recurso>,
    @InjectRepository(RecursoPrecio) private precios: Repository<RecursoPrecio>,
    @InjectRepository(Partida) private partidas: Repository<Partida>,
    @InjectRepository(ApuLineaEntity) private apuLineas: Repository<ApuLineaEntity>,
    @InjectRepository(Presupuesto) private presupuestos: Repository<Presupuesto>,
    @InjectRepository(PresupuestoItem) private items: Repository<PresupuestoItem>,
    @InjectRepository(AuditLog) private auditLog: Repository<AuditLog>,
  ) {}

  // ── Auditoría: TODO cambio de precio/rendimiento/cantidad/metrado queda registrado ──
  private async audit(entidad: string, entidadId: string, campo: string, anterior: any, nuevo: any, usuarioId?: string) {
    await this.auditLog.save(this.auditLog.create({
      entidad, entidadId, campo,
      valorAnterior: anterior == null ? null : String(anterior),
      valorNuevo: nuevo == null ? null : String(nuevo),
      usuarioId: usuarioId ?? null,
    }))
  }

  // ── Contexto de cálculo desde la DB (precio actual de recursos + APUs de todas las partidas) ──
  private async buildContext(): Promise<CalcContext> {
    const [recursos, partidas, lineas] = await Promise.all([
      this.recursos.find(), this.partidas.find(), this.apuLineas.find(),
    ])
    const precio = new Map(recursos.map((r) => [r.id, r.precioUnitario]))
    const apuPorPartida = new Map<string, ApuLinea[]>()
    for (const l of lineas) {
      if (!apuPorPartida.has(l.partidaId)) apuPorPartida.set(l.partidaId, [])
      apuPorPartida.get(l.partidaId)!.push({
        clase: l.clase, refId: l.refId,
        cuadrilla: l.cuadrilla ?? undefined, rendimiento: l.rendimiento ?? undefined, cantidad: l.cantidad ?? undefined,
      })
    }
    const defs = new Map(partidas.map((p) => [p.id, { id: p.id, apu: apuPorPartida.get(p.id) ?? [] }]))
    return { precioRecurso: (id) => precio.get(id) ?? 0, partida: (id) => defs.get(id) }
  }

  // ── Recursos ──
  listarRecursos(proyectoId?: string) {
    return this.recursos.find({ where: proyectoId ? [{ proyectoId }, { proyectoId: null as any }] : {}, order: { codigo: 'ASC' } })
  }
  crearRecurso(dto: Partial<Recurso>) { return this.recursos.save(this.recursos.create(dto)) }

  /**
   * Actualiza el PRECIO de un recurso. Historia el cambio + audita. Como el APU es reactivo, esto
   * afecta a los presupuestos NUEVOS (o al recalcular), pero NO a los items ya con snapshot en
   * presupuestos existentes. Devuelve las partidas cuyo APU usa el recurso con su costo unitario nuevo.
   */
  async actualizarPrecioRecurso(id: string, precioNuevo: number, usuarioId?: string) {
    const rec = await this.recursos.findOne({ where: { id } })
    if (!rec) throw new NotFoundException('Recurso no encontrado')
    const precioAnterior = rec.precioUnitario
    await this.precios.save(this.precios.create({ recursoId: id, precioAnterior, precioNuevo: String(precioNuevo), moneda: rec.moneda, usuarioId: usuarioId ?? null }))
    await this.audit('recurso', id, 'precio_unitario', precioAnterior, precioNuevo, usuarioId)
    rec.precioUnitario = String(precioNuevo)
    await this.recursos.save(rec)

    // Recalcular APUs que usan este recurso (en vivo), SIN tocar snapshots de presupuestos existentes.
    const usanElRecurso = await this.apuLineas.find({ where: { refId: id } })
    const partidaIds = [...new Set(usanElRecurso.filter((l) => l.clase !== 'PARTIDA').map((l) => l.partidaId))]
    const ctx = await this.buildContext()
    const afectadas = partidaIds.map((pid) => ({ partidaId: pid, costoUnitario: calcularApu(pid, ctx).costoUnitario.toNumber() }))
    return { recurso: rec, partidasAfectadas: afectadas }
  }

  // ── Partidas + APU ──
  listarPartidas(proyectoId?: string) {
    return this.partidas.find({ where: proyectoId ? [{ proyectoId }, { proyectoId: null as any }] : {}, order: { codigo: 'ASC' } })
  }
  crearPartida(dto: Partial<Partida>) { return this.partidas.save(this.partidas.create(dto)) }

  /** APU de una partida con su costo unitario calculado EN VIVO (precio actual de los recursos). */
  async getApu(partidaId: string): Promise<{ lineas: ApuLineaEntity[]; calculo: ApuResultado }> {
    const lineas = await this.apuLineas.find({ where: { partidaId }, order: { orden: 'ASC' } })
    const ctx = await this.buildContext()
    return { lineas, calculo: calcularApu(partidaId, ctx) }
  }

  /** Reemplaza las líneas del APU de una partida (audita cambios de rendimiento/cantidad). */
  async setApu(partidaId: string, lineas: Partial<ApuLineaEntity>[], usuarioId?: string) {
    await this.apuLineas.delete({ partidaId })
    const guardadas = await this.apuLineas.save(lineas.map((l, i) => this.apuLineas.create({ ...l, partidaId, orden: l.orden ?? i })))
    await this.audit('partida_apu', partidaId, 'apu', null, `${guardadas.length} líneas`, usuarioId)
    const ctx = await this.buildContext()
    return { lineas: guardadas, calculo: calcularApu(partidaId, ctx) }
  }

  // ── Presupuestos ──
  listarPresupuestos(proyectoId: string) { return this.presupuestos.find({ where: { proyectoId }, order: { createdAt: 'DESC' } }) }
  crearPresupuesto(dto: Partial<Presupuesto>) { return this.presupuestos.save(this.presupuestos.create(dto)) }

  private async cabecera(id: string) {
    const p = await this.presupuestos.findOne({ where: { id } })
    if (!p) throw new NotFoundException('Presupuesto no encontrado')
    return p
  }

  private mapItems(rows: PresupuestoItem[]): ItemDef[] {
    return rows.map((it) => ({
      id: it.id, parentId: it.parentId, tipo: it.tipo,
      metrado: it.metrado ?? undefined, costoUnitario: it.costoUnitarioSnapshot ?? undefined,
      porGenerico: it.porGenericoSnapshot ?? undefined,
    }))
  }

  /**
   * Recálculo: devuelve el ÁRBOL COMPLETO con parciales, subtotales y totales actualizados (para que
   * la UI repinte en cascada), no solo el nodo que cambió. Usa los snapshots ya guardados.
   */
  async calcularArbol(presupuestoId: string) {
    const p = await this.cabecera(presupuestoId)
    const rows = await this.items.find({ where: { presupuestoId }, order: { orden: 'ASC' } })
    const resultado = calcularPresupuesto(this.mapItems(rows), {
      ggFijo: p.ggFijo, ggPorcentaje: p.ggPorcentaje, utilidadPorcentaje: p.utilidadPorcentaje, igvPorcentaje: p.igvPorcentaje,
    })
    return { presupuesto: p, items: rows, ...resultado }
  }

  /** Recálculo EXPLÍCITO de snapshots: refresca el costo unitario de cada partida desde su APU en vivo. */
  async refrescarSnapshots(presupuestoId: string, usuarioId?: string) {
    const p = await this.cabecera(presupuestoId)
    if (p.congelado) throw new BadRequestException('El presupuesto está congelado (línea base): usa un adicional/deductivo.')
    const rows = await this.items.find({ where: { presupuestoId } })
    const ctx = await this.buildContext()
    for (const it of rows) {
      if (it.tipo !== 'partida' || !it.partidaId) continue
      const apu = calcularApu(it.partidaId, ctx)
      it.costoUnitarioSnapshot = apu.costoUnitario.toFixed(2)
      it.porGenericoSnapshot = { MO: apu.porGenerico.MO.toNumber(), MAT: apu.porGenerico.MAT.toNumber(), EQP: apu.porGenerico.EQP.toNumber(), SUB: apu.porGenerico.SUB.toNumber() }
    }
    await this.items.save(rows)
    await this.audit('presupuesto', presupuestoId, 'refrescar_snapshots', null, `${rows.length} items`, usuarioId)
    return this.calcularArbol(presupuestoId)
  }

  /**
   * Duplica un presupuesto (Meta → Venta / Meta → Línea Base). La LÍNEA BASE queda congelada
   * (no editable directamente). Copia toda la estructura de items (remapeando el árbol).
   */
  async duplicar(origenId: string, tipoDestino: 'venta' | 'linea_base', nombre?: string) {
    const origen = await this.cabecera(origenId)
    const nuevo = await this.presupuestos.save(this.presupuestos.create({
      proyectoId: origen.proyectoId,
      nombre: nombre ?? `${origen.nombre} (${tipoDestino === 'linea_base' ? 'Línea Base' : 'Venta'})`,
      tipo: tipoDestino, moneda: origen.moneda, tipoCambio: origen.tipoCambio,
      ggFijo: origen.ggFijo, ggPorcentaje: origen.ggPorcentaje, utilidadPorcentaje: origen.utilidadPorcentaje, igvPorcentaje: origen.igvPorcentaje,
      congelado: tipoDestino === 'linea_base',
      origenId,
    }))
    const rows = await this.items.find({ where: { presupuestoId: origenId }, order: { orden: 'ASC' } })
    const idMap = new Map<string, string>()
    // primera pasada: crear items con id nuevo
    const nuevos = rows.map((r) => {
      const clon = this.items.create({ ...r, id: undefined, presupuestoId: nuevo.id, parentId: null })
      return { orig: r, clon }
    })
    const guardados = await this.items.save(nuevos.map((x) => x.clon))
    nuevos.forEach((x, i) => idMap.set(x.orig.id, guardados[i].id))
    // segunda pasada: remapear parentId
    for (let i = 0; i < nuevos.length; i++) {
      const parentOrig = nuevos[i].orig.parentId
      if (parentOrig) { guardados[i].parentId = idMap.get(parentOrig) ?? null; await this.items.save(guardados[i]) }
    }
    return this.calcularArbol(nuevo.id)
  }

  // ── Items del árbol ──
  private async assertEditable(presupuestoId: string) {
    const p = await this.cabecera(presupuestoId)
    if (p.congelado) throw new BadRequestException('El presupuesto está congelado (línea base): los cambios van por adicional/deductivo.')
    return p
  }

  /** Agrega un item. Si es partida, toma el SNAPSHOT del costo unitario desde el APU en vivo. */
  async crearItem(presupuestoId: string, dto: Partial<PresupuestoItem>, usuarioId?: string) {
    await this.assertEditable(presupuestoId)
    const it = this.items.create({ ...dto, presupuestoId })
    if (it.tipo === 'partida' && it.partidaId) {
      const ctx = await this.buildContext()
      const apu = calcularApu(it.partidaId, ctx)
      it.costoUnitarioSnapshot = apu.costoUnitario.toFixed(2)
      it.porGenericoSnapshot = { MO: apu.porGenerico.MO.toNumber(), MAT: apu.porGenerico.MAT.toNumber(), EQP: apu.porGenerico.EQP.toNumber(), SUB: apu.porGenerico.SUB.toNumber() }
    }
    const saved = await this.items.save(it)
    await this.audit('presupuesto_item', saved.id, 'crear', null, saved.descripcion, usuarioId)
    return saved
  }

  /** Edita un item (metrado, descripción…). Audita el cambio de metrado. */
  async actualizarItem(id: string, dto: Partial<PresupuestoItem>, usuarioId?: string) {
    const it = await this.items.findOne({ where: { id } })
    if (!it) throw new NotFoundException('Item no encontrado')
    await this.assertEditable(it.presupuestoId)
    if (dto.metrado != null && dto.metrado !== it.metrado) await this.audit('presupuesto_item', id, 'metrado', it.metrado, dto.metrado, usuarioId)
    Object.assign(it, dto)
    return this.items.save(it)
  }

  async eliminarItem(id: string, usuarioId?: string) {
    const it = await this.items.findOne({ where: { id } })
    if (!it) return { ok: true }
    await this.assertEditable(it.presupuestoId)
    await this.items.delete({ id })
    await this.audit('presupuesto_item', id, 'eliminar', it.descripcion, null, usuarioId)
    return { ok: true }
  }
}
