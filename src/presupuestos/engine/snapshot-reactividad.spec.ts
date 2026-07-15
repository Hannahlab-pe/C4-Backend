import { calcularApu } from './apu.engine'
import { calcularPresupuesto } from './presupuesto.engine'
import { CalcContext } from './types'

/**
 * Contrato clave del módulo (lo que pidió confirmar el asesor, probado por test, no visualmente):
 *
 *  - El APU del CATÁLOGO es REACTIVO: lee el precio ACTUAL del recurso. Si el precio sube, un
 *    presupuesto NUEVO (o abrir el constructor) ve el costo unitario actualizado.
 *  - Un presupuesto YA ARMADO usa el SNAPSHOT del costo unitario: NO se mueve cuando cambia el
 *    precio del recurso en el catálogo. Solo se mueve si se recalcula explícitamente.
 */
describe('Snapshot vs reactividad del precio de recurso', () => {
  it('sube el precio del recurso → APU en vivo cambia; presupuesto con snapshot NO se mueve', () => {
    let precioCemento = 25 // S/ por bolsa (mutable: simula un cambio en el catálogo)
    const ctx: CalcContext = {
      precioRecurso: () => precioCemento,
      partida: (id) => (id === 'muro' ? { id: 'muro', apu: [{ clase: 'MAT', refId: 'cemento', cantidad: 2 }] } : undefined),
    }

    // Costo unitario inicial y SNAPSHOT al colocar la partida en un presupuesto.
    const apuInicial = calcularApu('muro', ctx)
    expect(apuInicial.costoUnitario.toNumber()).toBe(50) // 2 × 25
    const snapshot = apuInicial.costoUnitario.toNumber()

    const pptoArmado = calcularPresupuesto(
      [{ id: 'it', tipo: 'partida', metrado: 10, costoUnitario: snapshot }], {},
    )
    expect(pptoArmado.parciales['it']).toBe(500) // 10 × 50

    // ── El catálogo cambia: sube el cemento ──
    precioCemento = 30

    // El APU (catálogo / presupuesto nuevo) SÍ ve el precio nuevo.
    const apuNuevo = calcularApu('muro', ctx)
    expect(apuNuevo.costoUnitario.toNumber()).toBe(60) // 2 × 30

    // El presupuesto YA armado (snapshot) NO se movió.
    const pptoIgual = calcularPresupuesto(
      [{ id: 'it', tipo: 'partida', metrado: 10, costoUnitario: snapshot }], {},
    )
    expect(pptoIgual.parciales['it']).toBe(500) // sigue 500, NO 600

    // Recálculo EXPLÍCITO: se toma un snapshot nuevo del APU actual y ahí sí cambia.
    const snapshotRecalculado = apuNuevo.costoUnitario.toNumber()
    const pptoRecalculado = calcularPresupuesto(
      [{ id: 'it', tipo: 'partida', metrado: 10, costoUnitario: snapshotRecalculado }], {},
    )
    expect(pptoRecalculado.parciales['it']).toBe(600) // 10 × 60, tras recalcular a propósito
  })
})
