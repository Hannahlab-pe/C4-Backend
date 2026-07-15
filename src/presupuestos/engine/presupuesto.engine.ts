import { D, money, n, Decimal } from './precision'
import { ItemDef, ConfigPresupuesto, PresupuestoResultado, TipoRecurso, GENERICOS } from './types'

/**
 * Calcula un presupuesto completo desde su árbol de items (títulos/sub-títulos/partidas).
 *
 * - Parcial de una PARTIDA = metrado × costo unitario (snapshot).
 * - Subtotal de un TÍTULO = Σ recursiva de los parciales de sus descendientes.
 * - Costo Directo (CD) = Σ de los items de primer nivel.
 * - GG   = ggFijo + ggPorcentaje × CD        (fijo + variable prorrateado)
 * - Ut   = utilidadPorcentaje × CD
 * - Subtotal = CD + GG + Ut
 * - IGV  = igvPorcentaje × Subtotal          (18% Perú por defecto)
 * - Total = Subtotal + IGV
 *
 * Sumas sin redondeo intermedio; se redondea a 2 dec solo al exponer. Detecta ciclos en el árbol.
 */
export function calcularPresupuesto(items: ItemDef[], config: ConfigPresupuesto = {}): PresupuestoResultado {
  const porId = new Map(items.map((it) => [it.id, it]))
  const hijos = new Map<string, ItemDef[]>()
  for (const it of items) {
    const k = it.parentId ?? '__root'
    if (!hijos.has(k)) hijos.set(k, [])
    hijos.get(k)!.push(it)
  }

  const parciales: Record<string, number> = {}
  const subtotales: Record<string, number> = {}
  const porGenericoTotal: Record<TipoRecurso, Decimal> = { MO: D(0), MAT: D(0), EQP: D(0), SUB: D(0) }

  // Subtotal recursivo de un item; acumula el desglose por genérico de las partidas.
  const subtotalDe = (id: string, visitando: Set<string>): Decimal => {
    if (visitando.has(id)) throw new Error(`Ciclo en el árbol del presupuesto en el item ${id}.`)
    visitando.add(id)
    const it = porId.get(id)
    if (!it) { visitando.delete(id); return D(0) }

    let sub: Decimal
    if (it.tipo === 'partida') {
      const metrado = D(it.metrado ?? 0)
      const cu = D(it.costoUnitario ?? 0)
      sub = metrado.times(cu)
      parciales[id] = n(money(sub))
      // desglose por genérico ponderado por metrado (para la polinómica)
      for (const g of GENERICOS) {
        const gPart = it.porGenerico?.[g]
        if (gPart != null) porGenericoTotal[g] = porGenericoTotal[g].plus(metrado.times(D(gPart)))
      }
    } else {
      sub = (hijos.get(id) ?? []).reduce((s, c) => s.plus(subtotalDe(c.id, visitando)), D(0))
      subtotales[id] = n(money(sub))
    }
    visitando.delete(id)
    return sub
  }

  const raiz = hijos.get('__root') ?? []
  const costoDirecto = raiz.reduce((s, c) => s.plus(subtotalDe(c.id, new Set())), D(0))

  const gg = D(config.ggFijo ?? 0).plus(costoDirecto.times(D(config.ggPorcentaje ?? 0)))
  const utilidad = costoDirecto.times(D(config.utilidadPorcentaje ?? 0))
  const subtotal = costoDirecto.plus(gg).plus(utilidad)
  const igv = subtotal.times(D(config.igvPorcentaje ?? 0.18))
  const total = subtotal.plus(igv)

  return {
    parciales,
    subtotales,
    costoDirecto: n(money(costoDirecto)),
    gastosGenerales: n(money(gg)),
    utilidad: n(money(utilidad)),
    subtotal: n(money(subtotal)),
    igv: n(money(igv)),
    total: n(money(total)),
    porGenerico: {
      MO: n(money(porGenericoTotal.MO)),
      MAT: n(money(porGenericoTotal.MAT)),
      EQP: n(money(porGenericoTotal.EQP)),
      SUB: n(money(porGenericoTotal.SUB)),
    },
  }
}
