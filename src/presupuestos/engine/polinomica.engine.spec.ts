import { calcularK, coeficientesIncidencia } from './polinomica.engine'

describe('Fórmula polinómica — reajuste de precios (obra pública Perú)', () => {
  it('K = Σ a_i × (Ir/Io)', () => {
    // a: J=0.4, M=0.4, E=0.2 ; índices: J 100→110, M 100→105, E 100→100
    const r = calcularK(
      [{ generico: 'J', a: 0.4 }, { generico: 'M', a: 0.4 }, { generico: 'E', a: 0.2 }],
      [
        { generico: 'J', base: 100, actual: 110 },
        { generico: 'M', base: 100, actual: 105 },
        { generico: 'E', base: 100, actual: 100 },
      ],
    )
    // 0.4*1.10 + 0.4*1.05 + 0.2*1.00 = 0.44 + 0.42 + 0.20 = 1.060
    expect(r.K).toBe(1.06)
    expect(r.coeficientesValidos).toBe(true)
  })

  it('marca como inválidos los coeficientes que no suman 1', () => {
    const r = calcularK(
      [{ generico: 'J', a: 0.5 }, { generico: 'M', a: 0.3 }],
      [{ generico: 'J', base: 100, actual: 100 }, { generico: 'M', base: 100, actual: 100 }],
    )
    expect(r.coeficientesValidos).toBe(false) // 0.5 + 0.3 = 0.8 ≠ 1
  })

  it('falla si falta el índice o el índice base es 0', () => {
    expect(() => calcularK([{ generico: 'J', a: 1 }], [])).toThrow(/índice/i)
    expect(() => calcularK([{ generico: 'J', a: 1 }], [{ generico: 'J', base: 0, actual: 100 }])).toThrow(/base/i)
  })

  it('genera coeficientes de incidencia desde el desglose por genérico y suman EXACTO 1', () => {
    // MO 262, MAT 398 (CD = 660). a_MO = 0.397, a_MAT = 0.603
    const coefs = coeficientesIncidencia({ MO: 262, MAT: 398, EQP: 0, SUB: 0 }, 660)
    const suma = coefs.reduce((s, c) => s + c.a, 0)
    expect(suma).toBeCloseTo(1, 6)          // suma exacta a 1 (ajuste de residual)
    const mo = coefs.find((c) => c.generico === 'MO')!
    expect(mo.a).toBeCloseTo(0.397, 3)
    expect(coefs.some((c) => c.generico === 'EQP')).toBe(false) // los de aporte 0 se omiten
  })
})
