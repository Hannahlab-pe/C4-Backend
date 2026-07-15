import { calcularPresupuesto } from './presupuesto.engine'
import { ItemDef } from './types'

describe('Presupuesto — árbol WBS y motor CD → GG → Utilidad → IGV → Total', () => {
  const items: ItemDef[] = [
    { id: 't1', tipo: 'titulo' }, // 01 Obras preliminares
    { id: 'p1', parentId: 't1', tipo: 'partida', metrado: 100, costoUnitario: 6.6, porGenerico: { MO: 2.62, MAT: 3.98 } },
    { id: 'p2', parentId: 't1', tipo: 'partida', metrado: 50, costoUnitario: 10, porGenerico: { MO: 4, MAT: 6 } },
  ]

  it('parcial = metrado × costo unitario; subtotal del título = Σ parciales', () => {
    const r = calcularPresupuesto(items, {})
    expect(r.parciales['p1']).toBe(660)  // 100 × 6.60
    expect(r.parciales['p2']).toBe(500)  // 50 × 10
    expect(r.subtotales['t1']).toBe(1160)
    expect(r.costoDirecto).toBe(1160)
  })

  it('CD → GG(% ) → Utilidad → Subtotal → IGV 18% → Total', () => {
    const r = calcularPresupuesto(items, { ggPorcentaje: 0.1, utilidadPorcentaje: 0.05, igvPorcentaje: 0.18 })
    expect(r.gastosGenerales).toBe(116)   // 10% de 1160
    expect(r.utilidad).toBe(58)           // 5% de 1160
    expect(r.subtotal).toBe(1334)         // 1160 + 116 + 58
    expect(r.igv).toBe(240.12)            // 18% de 1334
    expect(r.total).toBe(1574.12)         // 1334 + 240.12
  })

  it('GG = fijo + variable prorrateado', () => {
    const r = calcularPresupuesto(items, { ggFijo: 500, ggPorcentaje: 0.08 })
    expect(r.gastosGenerales).toBe(592.8) // 500 + 8% de 1160 = 500 + 92.8
  })

  it('IGV por defecto = 18% si no se configura', () => {
    const r = calcularPresupuesto([{ id: 'p', tipo: 'partida', metrado: 1, costoUnitario: 100 }], {})
    expect(r.costoDirecto).toBe(100)
    expect(r.igv).toBe(18)
    expect(r.total).toBe(118)
  })

  it('agrega el desglose por genérico ponderado por metrado (para la polinómica)', () => {
    const r = calcularPresupuesto(items, {})
    expect(r.porGenerico.MO).toBe(462)  // 100×2.62 + 50×4 = 262 + 200
    expect(r.porGenerico.MAT).toBe(698) // 100×3.98 + 50×6 = 398 + 300
  })

  it('soporta títulos anidados (sub-títulos) con suma recursiva', () => {
    const anidado: ItemDef[] = [
      { id: 'A', tipo: 'titulo' },
      { id: 'A1', parentId: 'A', tipo: 'titulo' },
      { id: 'pa', parentId: 'A1', tipo: 'partida', metrado: 2, costoUnitario: 50 }, // 100
      { id: 'pb', parentId: 'A', tipo: 'partida', metrado: 1, costoUnitario: 25 },  // 25
    ]
    const r = calcularPresupuesto(anidado, {})
    expect(r.subtotales['A1']).toBe(100)
    expect(r.subtotales['A']).toBe(125)
    expect(r.costoDirecto).toBe(125)
  })
})
