import { D, qty, money, Decimal } from './precision'
import { CalcContext, ApuResultado, ApuLineaCalc, TipoRecurso, GENERICOS } from './types'

const cero = (): Record<TipoRecurso, Decimal> => ({ MO: D(0), MAT: D(0), EQP: D(0), SUB: D(0) })

/**
 * Calcula el APU de una partida → costo unitario, líneas y desglose por genérico.
 *
 * Reglas (sección 2.3 del spec):
 *  - Mano de Obra / Equipo (rinden por jornada):  cantidad = cuadrilla / rendimiento
 *  - Materiales / Subcontratos (consumo fijo):     cantidad = cantidad dada
 *  - Sub-partida (partida compuesta):              precio unitario = costo unitario recursivo de la sub-partida
 *  - Costo unitario = Σ (cantidad × precio unitario) de todas las líneas
 *
 * Precisión: cantidades a 4 dec; los parciales se SUMAN sin redondear y el costo unitario se
 * redondea a 2 dec solo al final. Detecta ciclos de sub-partidas.
 */
export function calcularApu(
  partidaId: string,
  ctx: CalcContext,
  visitando: Set<string> = new Set(),
): ApuResultado {
  const partida = ctx.partida(partidaId)
  if (!partida) throw new Error(`Partida no encontrada: ${partidaId}`)
  if (visitando.has(partidaId)) {
    throw new Error(`Ciclo de sub-partidas detectado (la partida ${partidaId} se contiene a sí misma).`)
  }
  visitando.add(partidaId)

  const lineas: ApuLineaCalc[] = []
  const porGenerico = cero()
  let costo = D(0)

  for (const l of partida.apu) {
    let cantidad: Decimal
    let precioU: Decimal
    const aporte = cero() // cómo reparte el parcial de esta línea entre los genéricos

    if (l.clase === 'PARTIDA') {
      // Sub-partida: su costo unitario se resuelve recursivamente y se usa como precio.
      const sub = calcularApu(l.refId, ctx, visitando)
      precioU = sub.costoUnitario
      cantidad = qty(l.cantidad ?? 0)
      const parcialSub = cantidad.times(precioU)
      // El parcial de la sub-partida se reparte entre genéricos según la mezcla interna de la sub-partida.
      for (const g of GENERICOS) {
        aporte[g] = sub.costoUnitario.isZero()
          ? D(0)
          : parcialSub.times(sub.porGenerico[g]).div(sub.costoUnitario)
      }
    } else {
      // Recurso directo. El precio es el ACTUAL del catálogo (fuente única).
      precioU = D(ctx.precioRecurso(l.refId))
      if (l.clase === 'MO' || l.clase === 'EQP') {
        const rend = D(l.rendimiento ?? 0)
        if (rend.isZero()) {
          throw new Error(`Rendimiento en 0 en la línea ${l.refId} de la partida ${partidaId} (MO/EQP requieren rendimiento > 0).`)
        }
        cantidad = qty(D(l.cuadrilla ?? 0).div(rend))
      } else {
        cantidad = qty(l.cantidad ?? 0)
      }
      aporte[l.clase] = cantidad.times(precioU)
    }

    const parcial = cantidad.times(precioU) // sin redondear para la suma
    for (const g of GENERICOS) porGenerico[g] = porGenerico[g].plus(aporte[g])
    costo = costo.plus(parcial)
    lineas.push({ clase: l.clase, refId: l.refId, cantidad, precioUnitario: precioU, parcial: money(parcial) })
  }

  visitando.delete(partidaId)
  return {
    costoUnitario: money(costo),
    lineas,
    porGenerico: {
      MO: money(porGenerico.MO),
      MAT: money(porGenerico.MAT),
      EQP: money(porGenerico.EQP),
      SUB: money(porGenerico.SUB),
    },
  }
}
