import { calcularApu } from './apu.engine'
import { CalcContext, PartidaDef } from './types'

/** Helper para armar un contexto de cálculo desde mapas simples. */
function ctxDe(precios: Record<string, number>, partidas: PartidaDef[]): CalcContext {
  const mapP = new Map(partidas.map((p) => [p.id, p]))
  return {
    precioRecurso: (id) => {
      if (!(id in precios)) throw new Error(`Sin precio para recurso ${id}`)
      return precios[id]
    },
    partida: (id) => mapP.get(id),
  }
}

describe('APU — motor de análisis de precios unitarios', () => {
  it('MO rinde por jornada: cantidad = cuadrilla / rendimiento (ejemplo tarrajeo del spec)', () => {
    // Tarrajeo: cuadrilla rinde 12 m2/día. 1 Operario → cantidad = 1/12 = 0.0833
    const ctx = ctxDe(
      { operario: 23.0, peon: 17.0, cemento: 25.0, arena: 45.0 },
      [{
        id: 'tarrajeo',
        apu: [
          { clase: 'MO', refId: 'operario', cuadrilla: 1, rendimiento: 12 },
          { clase: 'MO', refId: 'peon', cuadrilla: 0.5, rendimiento: 12 },
          { clase: 'MAT', refId: 'cemento', cantidad: 0.117 },
          { clase: 'MAT', refId: 'arena', cantidad: 0.0234 },
        ],
      }],
    )
    const r = calcularApu('tarrajeo', ctx)

    expect(r.lineas[0].cantidad.toString()).toBe('0.0833') // 1/12 a 4 dec
    expect(r.lineas[1].cantidad.toString()).toBe('0.0417') // 0.5/12 a 4 dec
    // Costo unitario = 0.0833*23 + 0.0417*17 + 0.117*25 + 0.0234*45 = 6.6028 → 6.60
    expect(r.costoUnitario.toNumber()).toBe(6.6)
    // Desglose por genérico
    expect(r.porGenerico.MO.toNumber()).toBe(2.62)  // 1.9159 + 0.7089 = 2.6248 → 2.62
    expect(r.porGenerico.MAT.toNumber()).toBe(3.98)  // 2.925 + 1.053 = 3.978 → 3.98
  })

  it('Materiales usan cantidad fija; el costo unitario es la suma de todos los parciales', () => {
    const ctx = ctxDe({ clavo: 5, madera: 8 }, [{
      id: 'x', apu: [
        { clase: 'MAT', refId: 'clavo', cantidad: 2 },   // 10
        { clase: 'MAT', refId: 'madera', cantidad: 3 },  // 24
      ],
    }])
    expect(calcularApu('x', ctx).costoUnitario.toNumber()).toBe(34)
  })

  it('Sub-partida compuesta: su costo unitario se resuelve recursivamente y se propaga por genérico', () => {
    const ctx = ctxDe({ cemento: 25.0 }, [
      { id: 'concreto', apu: [{ clase: 'MAT', refId: 'cemento', cantidad: 9 }] }, // 225 (MAT)
      { id: 'columna', apu: [{ clase: 'PARTIDA', refId: 'concreto', cantidad: 1.05 }] },
    ])
    const r = calcularApu('columna', ctx)
    // 1.05 × 225 = 236.25, todo hereda el genérico MAT de la sub-partida
    expect(r.costoUnitario.toNumber()).toBe(236.25)
    expect(r.porGenerico.MAT.toNumber()).toBe(236.25)
    expect(r.porGenerico.MO.toNumber()).toBe(0)
  })

  it('Detecta ciclos de sub-partidas', () => {
    const ctx = ctxDe({}, [
      { id: 'a', apu: [{ clase: 'PARTIDA', refId: 'b', cantidad: 1 }] },
      { id: 'b', apu: [{ clase: 'PARTIDA', refId: 'a', cantidad: 1 }] },
    ])
    expect(() => calcularApu('a', ctx)).toThrow(/[Cc]iclo/)
  })

  it('Rechaza rendimiento 0 en MO/EQP', () => {
    const ctx = ctxDe({ op: 20 }, [{ id: 'p', apu: [{ clase: 'MO', refId: 'op', cuadrilla: 1, rendimiento: 0 }] }])
    expect(() => calcularApu('p', ctx)).toThrow(/[Rr]endimiento/)
  })
})
