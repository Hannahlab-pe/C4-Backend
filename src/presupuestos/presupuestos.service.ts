import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as ExcelJS from 'exceljs'
import { Recurso } from '../entities/recurso.entity'
import { RecursoPrecio } from '../entities/recurso-precio.entity'
import { Partida } from '../entities/partida.entity'
import { ApuLineaEntity } from '../entities/apu-linea.entity'
import { Presupuesto } from '../entities/presupuesto.entity'
import { PresupuestoItem } from '../entities/presupuesto-item.entity'
import { AuditLog } from '../entities/audit-log.entity'
import { Valorizacion } from '../entities/valorizacion.entity'
import {
  calcularApu, calcularPresupuesto, CalcContext, ApuLinea, ItemDef, ApuResultado,
} from './engine'
import { D, money, n, Decimal } from './engine/precision'
import { parseExcelPresupuesto } from './import/import-excel'
import { matchPartida, CatalogoItem } from './import/matching'

/** Servicio del módulo Presupuestos y Costos. Toda la lógica de negocio usa el motor puro. */
@Injectable()
export class PresupuestosService implements OnModuleInit {
  constructor(
    @InjectRepository(Recurso) private recursos: Repository<Recurso>,
    @InjectRepository(RecursoPrecio) private precios: Repository<RecursoPrecio>,
    @InjectRepository(Partida) private partidas: Repository<Partida>,
    @InjectRepository(ApuLineaEntity) private apuLineas: Repository<ApuLineaEntity>,
    @InjectRepository(Presupuesto) private presupuestos: Repository<Presupuesto>,
    @InjectRepository(PresupuestoItem) private items: Repository<PresupuestoItem>,
    @InjectRepository(AuditLog) private auditLog: Repository<AuditLog>,
    @InjectRepository(Valorizacion) private valorizaciones: Repository<Valorizacion>,
  ) {}

  async onModuleInit() {
    try { await this.seedBetondecken() } catch { /* no romper el arranque si falla el seed */ }
  }

  /**
   * Siembra el catálogo de prefabricados Betondecken (sistema Doppel) como partidas del catálogo
   * transversal, cada una con su APU = 1 subcontrato (suministro + montaje) por m². Los precios son
   * REFERENCIALES y editables (fuente única = el recurso), para que se ajusten al precio real de Betondecken.
   */
  private async seedBetondecken() {
    if (await this.recursos.findOne({ where: { codigo: 'BD-PRELOSA' } })) return

    const recursosDef = [
      { codigo: 'BD-PRELOSA',      nombre: 'Prelosa Doppel — suministro + montaje',             unidad: 'm2',  precioUnitario: '210.0000' },
      { codigo: 'BD-PRELOSA-PRET', nombre: 'Prelosa pretensada Doppel — suministro + montaje',   unidad: 'm2',  precioUnitario: '235.0000' },
      { codigo: 'BD-MURO',         nombre: 'Muro Doppel (Doppelwand) — suministro + montaje',    unidad: 'm2',  precioUnitario: '265.0000' },
      { codigo: 'BD-ESCALERA',     nombre: 'Escalera prefabricada Doppel — sum. + montaje',      unidad: 'und', precioUnitario: '1850.0000' },
    ]
    const recursos = await this.recursos.save(recursosDef.map((r) => this.recursos.create({
      codigo: r.codigo, nombre: r.nombre, tipo: 'SUB', familia: 'Betondecken', unidad: r.unidad, precioUnitario: r.precioUnitario, moneda: 'PEN', proyectoId: null,
    })))
    const recPorCodigo = new Map(recursos.map((r) => [r.codigo, r]))

    const partidasDef = [
      { codigo: 'BD.01', descripcion: 'Suministro e instalación de prelosa Doppel',              unidad: 'm2',  rec: 'BD-PRELOSA' },
      { codigo: 'BD.02', descripcion: 'Suministro e instalación de prelosa pretensada Doppel',    unidad: 'm2',  rec: 'BD-PRELOSA-PRET' },
      { codigo: 'BD.03', descripcion: 'Suministro e instalación de muro Doppel (Doppelwand)',     unidad: 'm2',  rec: 'BD-MURO' },
      { codigo: 'BD.04', descripcion: 'Suministro e instalación de escalera prefabricada Doppel', unidad: 'und', rec: 'BD-ESCALERA' },
    ]
    for (const pd of partidasDef) {
      const partida = await this.partidas.save(this.partidas.create({
        codigo: pd.codigo, descripcion: pd.descripcion, unidad: pd.unidad, especialidad: 'Prefabricado (Betondecken)', esSubpartida: false, proyectoId: null,
      }))
      const rec = recPorCodigo.get(pd.rec)!
      await this.apuLineas.save(this.apuLineas.create({
        partidaId: partida.id, clase: 'SUB', refId: rec.id, cantidad: '1.0000', orden: 0,
      }))
    }
  }

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
    const qb = this.recursos.createQueryBuilder('r').orderBy('r.codigo', 'ASC')
    if (proyectoId) qb.where('r.proyectoId = :pid OR r.proyectoId IS NULL', { pid: proyectoId })
    return qb.getMany()
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
    const qb = this.partidas.createQueryBuilder('p').orderBy('p.codigo', 'ASC')
    if (proyectoId) qb.where('p.proyectoId = :pid OR p.proyectoId IS NULL', { pid: proyectoId })
    return qb.getMany()
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

  // ── Export a Excel ──
  /**
   * Exporta el presupuesto a Excel (Hoja "Resumen") replicando el árbol tal cual se ve en pantalla.
   * Usa los SNAPSHOTS guardados (no recalcula): el Excel coincide número por número con la UI.
   */
  async exportarExcel(presupuestoId: string): Promise<{ buffer: Buffer; filename: string }> {
    const arbol = await this.calcularArbol(presupuestoId)
    const p = arbol.presupuesto
    const partidas = await this.partidas.find()
    const unidadDe = new Map(partidas.map((x) => [x.id, x.unidad]))
    const n = (x: any) => Number(x ?? 0)

    // Aplanar el árbol en orden (títulos + partidas) con su profundidad
    const porPadre = new Map<string | null, PresupuestoItem[]>()
    for (const it of arbol.items) { const k = it.parentId ?? null; if (!porPadre.has(k)) porPadre.set(k, []); porPadre.get(k)!.push(it) }
    for (const arr of porPadre.values()) arr.sort((a, b) => a.orden - b.orden)
    const filas: { it: PresupuestoItem; depth: number }[] = []
    const walk = (padre: string | null, depth: number) => {
      for (const it of porPadre.get(padre) ?? []) { filas.push({ it, depth }); if (it.tipo === 'titulo') walk(it.id, depth + 1) }
    }
    walk(null, 0)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'C4 — Presupuestos y Costos'
    const ws = wb.addWorksheet('Resumen', { views: [{ state: 'frozen', ySplit: 5 }] })
    ws.columns = [
      { key: 'codigo', width: 12 }, { key: 'descripcion', width: 52 }, { key: 'und', width: 8 },
      { key: 'metrado', width: 12 }, { key: 'mo', width: 12 }, { key: 'mat', width: 12 },
      { key: 'pu', width: 13 }, { key: 'parcial', width: 16 },
    ]

    // Cabecera del documento
    ws.mergeCells('A1:H1'); ws.getCell('A1').value = p.nombre; ws.getCell('A1').font = { bold: true, size: 14 }
    ws.mergeCells('A2:H2'); ws.getCell('A2').value = `Tipo: ${p.tipo.toUpperCase()}  ·  Moneda: ${p.moneda}`
    ws.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } }

    // Encabezados de columna (fila 5)
    const head = ws.getRow(5)
    head.values = ['Código', 'Descripción', 'Und', 'Metrado', 'M.O (S/)', 'MAT (S/)', 'P.U. (S/)', 'Parcial (S/)']
    head.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
      c.alignment = { vertical: 'middle', horizontal: 'left' }
    })

    const NUM = '#,##0.00'
    for (const { it, depth } of filas) {
      const esTitulo = it.tipo === 'titulo'
      const gen = it.porGenericoSnapshot
      const row = ws.addRow({
        codigo: it.codigo || '',
        descripcion: it.descripcion || '',
        und: esTitulo ? '' : (unidadDe.get(it.partidaId as string) ?? ''),
        metrado: esTitulo ? null : n(it.metrado),
        mo: esTitulo || !gen || gen.MO == null ? null : n(gen.MO),
        mat: esTitulo || !gen || gen.MAT == null ? null : n(gen.MAT),
        pu: esTitulo ? null : n(it.costoUnitarioSnapshot),
        parcial: esTitulo ? (arbol.subtotales[it.id] ?? 0) : (arbol.parciales[it.id] ?? 0),
      })
      row.getCell('descripcion').alignment = { indent: depth }
      for (const k of ['metrado', 'mo', 'mat', 'pu', 'parcial']) row.getCell(k).numFmt = NUM
      if (esTitulo) {
        row.font = { bold: true }
        row.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } } })
      }
    }

    ws.addRow({})
    const totales: [string, number, boolean?][] = [
      ['COSTO DIRECTO', arbol.costoDirecto],
      [`GASTOS GENERALES (${(n(p.ggPorcentaje) * 100).toFixed(1)}%)`, arbol.gastosGenerales],
      [`UTILIDAD (${(n(p.utilidadPorcentaje) * 100).toFixed(1)}%)`, arbol.utilidad],
      ['SUBTOTAL', arbol.subtotal],
      [`IGV (${(n(p.igvPorcentaje) * 100).toFixed(0)}%)`, arbol.igv],
      ['TOTAL', arbol.total, true],
    ]
    for (const [label, val, esTotal] of totales) {
      const row = ws.addRow({ codigo: label, parcial: val })
      ws.mergeCells(row.number, 1, row.number, 7)
      row.getCell(1).alignment = { horizontal: 'right' }
      row.getCell(1).font = { bold: !!esTotal || label === 'COSTO DIRECTO' || label === 'SUBTOTAL', size: esTotal ? 12 : 11 }
      row.getCell('parcial').numFmt = NUM
      row.getCell('parcial').font = { bold: true, size: esTotal ? 12 : 11, color: { argb: esTotal ? 'FF2563EB' : 'FF0F172A' } }
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer())
    const filename = `${(p.nombre || 'presupuesto').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_')}.xlsx`
    return { buffer, filename }
  }

  // ── Import desde Excel (paso 1-2: parseo + preview con matching; NO escribe nada) ──
  async previewImport(buffer: Buffer) {
    const parsed = await parseExcelPresupuesto(buffer)
    const catalogo: CatalogoItem[] = (await this.partidas.find()).map((p) => ({ id: p.id, codigo: p.codigo, descripcion: p.descripcion, unidad: p.unidad }))
    const filas = parsed.filas.map((f, i) => ({
      ...f, orden: i,
      match: f.esTitulo ? null : matchPartida(f.codigo, f.descripcion, catalogo),
    }))
    const partidas = filas.filter((f) => !f.esTitulo)
    return {
      hoja: parsed.hoja,
      columnas: parsed.columnas,
      advertencias: parsed.advertencias,
      resumen: {
        titulos: filas.filter((f) => f.esTitulo).length,
        partidas: partidas.length,
        match_codigo: partidas.filter((f) => f.match?.tipo === 'codigo').length,
        match_texto: partidas.filter((f) => f.match?.tipo === 'texto').length,
        nuevas: partidas.filter((f) => f.match?.tipo === 'nuevo').length,
      },
      filas,
    }
  }

  /**
   * Import paso 4: crea un presupuesto NUEVO (nunca sobrescribe) desde las filas ya revisadas y
   * confirmadas por el usuario. Los costos unitarios son SNAPSHOTS del Excel (no recalcula).
   * Reconstruye el árbol título/partida por la profundidad del código (nivel).
   */
  async confirmarImport(dto: any, usuarioId?: string) {
    if (!dto?.proyectoId) throw new BadRequestException('Falta el proyecto.')
    if (!dto?.nombre?.trim()) throw new BadRequestException('Falta el nombre del presupuesto.')
    const filas: any[] = Array.isArray(dto.filas) ? dto.filas : []
    if (filas.length === 0) throw new BadRequestException('No hay filas para importar.')

    const pres = await this.presupuestos.save(this.presupuestos.create({
      proyectoId: dto.proyectoId, nombre: dto.nombre.trim(), tipo: dto.tipo || 'meta', moneda: dto.moneda || 'PEN',
      ggPorcentaje: String(dto.ggPorcentaje ?? 0), utilidadPorcentaje: String(dto.utilidadPorcentaje ?? 0), igvPorcentaje: String(dto.igvPorcentaje ?? 0.18),
    }))

    const pila: { nivel: number; id: string }[] = []
    let creadas = 0, matcheadas = 0, sueltas = 0
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i]
      const nivel = Number(f.nivel ?? 0)
      const parentId = () => (pila.length ? pila[pila.length - 1].id : null)
      if (f.esTitulo) {
        while (pila.length && pila[pila.length - 1].nivel >= nivel) pila.pop()
        const item = await this.items.save(this.items.create({
          presupuestoId: pres.id, parentId: parentId(), tipo: 'titulo',
          codigo: String(f.codigo ?? ''), descripcion: String(f.descripcion ?? ''), orden: i,
        }))
        pila.push({ nivel, id: item.id })
      } else {
        let partidaId: string | null = null
        if (f.decision === 'match' && f.partidaId) { partidaId = f.partidaId; matcheadas++ }
        else if (f.decision === 'nueva') {
          const np = await this.partidas.save(this.partidas.create({
            codigo: String(f.codigo ?? ''), descripcion: String(f.descripcion ?? ''), unidad: String(f.unidad ?? ''), especialidad: '',
          }))
          partidaId = np.id; creadas++
        } else { sueltas++ } // 'solo' → asociada solo a este presupuesto (sin partida de catálogo)
        await this.items.save(this.items.create({
          presupuestoId: pres.id, parentId: parentId(), tipo: 'partida', partidaId,
          codigo: String(f.codigo ?? ''), descripcion: String(f.descripcion ?? ''),
          metrado: f.metrado != null ? String(f.metrado) : null,
          costoUnitarioSnapshot: f.precioUnitario != null ? String(f.precioUnitario) : null, // snapshot del Excel
          orden: i,
        }))
      }
    }

    await this.audit('presupuesto', pres.id, 'import_excel', null,
      `${dto.archivo || 'archivo.xlsx'} · ${filas.length} filas · ${matcheadas} matcheadas · ${creadas} partidas nuevas · ${sueltas} sueltas`, usuarioId)
    return this.calcularArbol(pres.id)
  }

  /**
   * Crea un presupuesto ESTIMADO POR IA (borrador separado, tipo estimado_ia) desde las partidas que el
   * chat reunió leyendo planos. Agrupa por capítulo (título) y calcula TODOS los totales por CÓDIGO
   * (motor decimal — NO la IA). Nunca sobrescribe uno existente. El precio va como snapshot directo.
   */
  async crearEstimadoIa(dto: {
    proyectoId: string; nombre?: string; ggPorcentaje?: number; utilidadPorcentaje?: number; igvPorcentaje?: number
    partidas: { capitulo?: string; descripcion: string; unidad?: string; metrado?: number; precio?: number; mano_obra?: number; material?: number; confianza?: string }[]
  }, usuarioId?: string) {
    if (!dto?.proyectoId) throw new BadRequestException('Falta el proyecto.')
    const partidas = (dto.partidas ?? []).filter((p) => p?.descripcion && String(p.descripcion).trim())
    if (!partidas.length) throw new BadRequestException('No hay partidas para el presupuesto.')

    const pres = await this.presupuestos.save(this.presupuestos.create({
      proyectoId: dto.proyectoId, nombre: (dto.nombre?.trim() || 'Presupuesto estimado (IA)'), tipo: 'estimado_ia', moneda: 'PEN',
      ggPorcentaje: String(dto.ggPorcentaje ?? 0.12), utilidadPorcentaje: String(dto.utilidadPorcentaje ?? 0.05), igvPorcentaje: String(dto.igvPorcentaje ?? 0.18),
    }))

    // Agrupar por capítulo (preservando orden de aparición) → título + sus partidas
    const capOrden: string[] = []
    const porCap = new Map<string, typeof partidas>()
    for (const p of partidas) {
      const cap = (String(p.capitulo || '').trim()) || 'Presupuesto'
      if (!porCap.has(cap)) { porCap.set(cap, []); capOrden.push(cap) }
      porCap.get(cap)!.push(p)
    }
    let orden = 0
    for (const cap of capOrden) {
      const titulo = await this.items.save(this.items.create({
        presupuestoId: pres.id, parentId: null, tipo: 'titulo', codigo: '', descripcion: cap.slice(0, 120), orden: orden++,
      }))
      for (const p of porCap.get(cap)!) {
        const baja = String(p.confianza) === 'baja'
        const mo = p.mano_obra != null && !isNaN(Number(p.mano_obra)) ? Number(p.mano_obra) : null
        const mat = p.material != null && !isNaN(Number(p.material)) ? Number(p.material) : null
        // Si viene el desglose mano de obra / material, el P.U. es su suma; si no, el precio combinado.
        const precio = (mo != null || mat != null)
          ? Math.round(((mo ?? 0) + (mat ?? 0)) * 100) / 100
          : (p.precio != null && !isNaN(Number(p.precio)) ? Number(p.precio) : null)
        await this.items.save(this.items.create({
          presupuestoId: pres.id, parentId: titulo.id, tipo: 'partida', partidaId: null, codigo: '',
          descripcion: String(p.descripcion).trim().slice(0, 220) + (baja ? '  (estimado, baja confianza — verificar)' : ''),
          metrado: p.metrado != null && !isNaN(Number(p.metrado)) ? String(Number(p.metrado)) : null,
          costoUnitarioSnapshot: precio != null ? String(precio) : null,
          porGenericoSnapshot: (mo != null || mat != null) ? { MO: mo ?? 0, MAT: mat ?? 0, EQP: 0, SUB: 0 } : null,
          orden: orden++,
        }))
      }
    }
    await this.audit('presupuesto', pres.id, 'crear_estimado_ia', null, `${partidas.length} partidas · borrador IA desde planos`, usuarioId)
    return this.calcularArbol(pres.id)
  }

  // ══ Valorizaciones (avance mensual para cobrar contra el presupuesto) ══

  listarValorizaciones(presupuestoId: string) {
    return this.valorizaciones.find({ where: { presupuestoId }, order: { numero: 'ASC' } })
  }

  /** Crea una valorización nueva (período). Arranca del avance ACUMULADO de la anterior. */
  async crearValorizacion(presupuestoId: string, periodo: string, usuarioId?: string) {
    const p = await this.cabecera(presupuestoId)
    const ultima = (await this.valorizaciones.find({ where: { presupuestoId }, order: { numero: 'DESC' }, take: 1 }))[0]
    const numero = (ultima?.numero ?? 0) + 1
    const val = await this.valorizaciones.save(this.valorizaciones.create({
      proyectoId: p.proyectoId, presupuestoId, numero,
      periodo: (periodo || '').trim() || `Valorización ${numero}`,
      estado: 'borrador',
      avances: { ...(ultima?.avances ?? {}) }, // continúa desde el acumulado anterior
    }))
    await this.audit('valorizacion', val.id, 'crear', null, val.periodo, usuarioId)
    return this.calcularValorizacion(val)
  }

  async getValorizacion(valId: string) {
    const val = await this.valorizaciones.findOne({ where: { id: valId } })
    if (!val) throw new NotFoundException('Valorización no encontrada')
    return this.calcularValorizacion(val)
  }

  /** Fija el % de avance ACUMULADO de una partida en una valorización y recalcula. */
  async actualizarAvance(valId: string, itemId: string, pct: number, usuarioId?: string) {
    const val = await this.valorizaciones.findOne({ where: { id: valId } })
    if (!val) throw new NotFoundException('Valorización no encontrada')
    const limpio = Math.min(100, Math.max(0, Number(pct) || 0))
    val.avances = { ...(val.avances ?? {}), [itemId]: limpio }
    await this.valorizaciones.save(val)
    return this.calcularValorizacion(val)
  }

  async eliminarValorizacion(valId: string, usuarioId?: string) {
    const val = await this.valorizaciones.findOne({ where: { id: valId } })
    if (!val) return { ok: true }
    const ultima = await this.valorizaciones.findOne({ where: { presupuestoId: val.presupuestoId }, order: { numero: 'DESC' } })
    if (ultima && ultima.id !== val.id) throw new BadRequestException('Solo puedes eliminar la última valorización (para no romper el acumulado).')
    await this.valorizaciones.delete({ id: valId })
    await this.audit('valorizacion', valId, 'eliminar', val.periodo, null, usuarioId)
    return { ok: true }
  }

  /**
   * Calcula la valorización: por cada partida, valorizado acumulado = parcial × %avance; el del
   * PERÍODO = acumulado − acumulado de la valorización anterior. GG/Ut/IGV se aplican proporcional
   * al costo directo del período. Todo con el motor decimal (mismos snapshots que el presupuesto).
   */
  private async calcularValorizacion(val: Valorizacion) {
    const arbol = await this.calcularArbol(val.presupuestoId)
    const p = arbol.presupuesto
    const prev = await this.valorizaciones.findOne({ where: { presupuestoId: val.presupuestoId, numero: val.numero - 1 } })
    const prevAv = prev?.avances ?? {}
    const av = val.avances ?? {}
    const clamp = (x: any) => Math.min(100, Math.max(0, Number(x) || 0))

    const valPer: Record<string, Decimal> = {}
    const valAcu: Record<string, Decimal> = {}
    let cdPeriodo = D(0), cdAcum = D(0)
    for (const it of arbol.items) {
      if (it.tipo !== 'partida') continue
      const parcial = D(arbol.parciales[it.id] ?? 0)
      const pctAcum = clamp(av[it.id])
      const pctAnt = clamp(prevAv[it.id])
      const vAcum = parcial.mul(pctAcum).div(100)
      const vPer = parcial.mul(pctAcum - pctAnt).div(100)
      valAcu[it.id] = vAcum; valPer[it.id] = vPer
      cdPeriodo = cdPeriodo.add(vPer); cdAcum = cdAcum.add(vAcum)
    }

    // Subtotales de valorizado por título (suma recursiva de descendientes)
    const childrenMap = new Map<string | null, typeof arbol.items>()
    for (const it of arbol.items) {
      const k = it.parentId ?? null
      if (!childrenMap.has(k)) childrenMap.set(k, [])
      childrenMap.get(k)!.push(it)
    }
    const sumTit = (id: string): { per: Decimal; acu: Decimal } => {
      let per = D(0), acu = D(0)
      for (const c of childrenMap.get(id) ?? []) {
        if (c.tipo === 'partida') { per = per.add(valPer[c.id] ?? D(0)); acu = acu.add(valAcu[c.id] ?? D(0)) }
        else { const s = sumTit(c.id); per = per.add(s.per); acu = acu.add(s.acu) }
      }
      return { per, acu }
    }

    const items = arbol.items.map((it) => {
      const esPartida = it.tipo === 'partida'
      const vPer = esPartida ? (valPer[it.id] ?? D(0)) : sumTit(it.id).per
      const vAcu = esPartida ? (valAcu[it.id] ?? D(0)) : sumTit(it.id).acu
      return {
        id: it.id, parentId: it.parentId, tipo: it.tipo, codigo: it.codigo, descripcion: it.descripcion, orden: it.orden,
        parcial: esPartida ? (arbol.parciales[it.id] ?? 0) : (arbol.subtotales[it.id] ?? 0),
        pctAvance: esPartida ? clamp(av[it.id]) : null,
        valorizadoAcum: n(money(vAcu)),
        valorizadoPeriodo: n(money(vPer)),
      }
    })

    const ggP = D(p.ggPorcentaje).mul(cdPeriodo)
    const utP = D(p.utilidadPorcentaje).mul(cdPeriodo)
    const subP = cdPeriodo.add(ggP).add(utP)
    const igvP = D(p.igvPorcentaje).mul(subP)
    const totalP = subP.add(igvP)

    const ggA = D(p.ggPorcentaje).mul(cdAcum)
    const utA = D(p.utilidadPorcentaje).mul(cdAcum)
    const subA = cdAcum.add(ggA).add(utA)
    const igvA = D(p.igvPorcentaje).mul(subA)
    const totalA = subA.add(igvA)

    const cdTotal = D(arbol.costoDirecto)
    const avanceGlobal = cdTotal.gt(0) ? n(money(cdAcum.div(cdTotal).mul(100))) : 0

    return {
      valorizacion: { id: val.id, numero: val.numero, periodo: val.periodo, estado: val.estado },
      presupuesto: { id: p.id, nombre: p.nombre, tipo: p.tipo, costoDirecto: arbol.costoDirecto, total: arbol.total },
      items,
      totales: {
        cd_periodo: n(money(cdPeriodo)), gg_periodo: n(money(ggP)), ut_periodo: n(money(utP)), igv_periodo: n(money(igvP)), total_periodo: n(money(totalP)),
        cd_acum: n(money(cdAcum)), total_acum: n(money(totalA)),
        avance_global_pct: avanceGlobal,
      },
    }
  }
}
