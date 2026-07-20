import {
  Body, Controller, Param, Post, UseGuards,
  BadRequestException, ServiceUnavailableException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AnalisisService } from './analisis.service'
import { MotoresService } from '../motores/motores.service'
import { NormativasService } from '../normativas/normativas.service'

interface GenerarAnalisisDto {
  area_total: number
  distrito: string
  frente?: number
  fondo?: number
  // Overrides opcionales de la normativa (si no vienen, se toman del distrito)
  pisos_max?: number
  retiro_frontal?: number
  retiro_lateral?: number
  retiro_posterior?: number
  cus?: number
  area_min_depto?: number
  estacionamientos?: number
  // Supuestos financieros (opcionales)
  precio_terreno_usd?: number
  precio_venta_usd_m2?: number
  costo_construccion_usd_m2?: number
  area_demolicion_m2?: number
  porcentaje_capital_propio?: number
  velocidad_ventas_mensual?: number
  mezcla_tipologias?: Array<{ tipo: string; porcentaje: number; precio_usd_m2: number }>
}

/**
 * Genera el análisis de pre-inversión desde inputs estructurados (formulario),
 * corriendo el MISMO pipeline de motores que el tool del chat pero sin pasar por el LLM.
 * Escribe en el mismo registro (upsert por proyecto_id) que lee GET /chat/:id/analisis.
 */
@Controller('analisis')
@UseGuards(JwtAuthGuard)
export class AnalisisController {
  constructor(
    private readonly analisis: AnalisisService,
    private readonly motores: MotoresService,
    private readonly normativas: NormativasService,
  ) {}

  @Post(':proyectoId/generar')
  async generar(@Param('proyectoId') proyectoId: string, @Body() dto: GenerarAnalisisDto) {
    if (!dto?.area_total || !dto?.distrito) {
      throw new BadRequestException('El área del terreno y el distrito son obligatorios.')
    }

    // Normativa del distrito (auto-fill), permitiendo override manual desde el DTO.
    const norm = await this.normativas.findByDistrito(dto.distrito)
    const num = (dtoVal: any, normVal: any) =>
      dtoVal != null ? Number(dtoVal) : (norm && normVal != null ? Number(normVal) : NaN)

    const pisos_max        = num(dto.pisos_max, norm?.pisosMax)
    const retiro_frontal   = num(dto.retiro_frontal, norm?.retiroFrontal)
    const retiro_lateral   = num(dto.retiro_lateral, norm?.retiroLateral)
    const retiro_posterior = num(dto.retiro_posterior, norm?.retiroPosterior)
    const cus              = num(dto.cus, norm?.cus)
    const area_min_depto   = num(dto.area_min_depto, norm?.areaMinDepto)
    const estacionamientos = num(dto.estacionamientos, norm?.estacionamientos)

    if ([pisos_max, retiro_frontal, retiro_lateral, retiro_posterior, cus, area_min_depto, estacionamientos].some((v) => Number.isNaN(v))) {
      throw new BadRequestException(`No hay normativa cargada para "${dto.distrito}". Elige un distrito con normativa o ingresa los parámetros urbanísticos.`)
    }

    const ok = await this.motores.healthCheck()
    if (!ok) throw new ServiceUnavailableException('El motor de cálculo (Python) no está disponible.')

    const terreno = { area_total: Number(dto.area_total), frente: dto.frente ?? null, fondo: dto.fondo ?? null }
    const normativa = { distrito: dto.distrito, pisos_max, retiro_frontal, retiro_lateral, retiro_posterior, cus, area_min_depto, estacionamientos }

    // 1) Cabida → 2) Estructura (depende de cabida) → 3) Financiero (depende de cabida)
    const cabida = await this.motores.cabida({ terreno, normativa, mezcla_tipologias: dto.mezcla_tipologias ?? null })
    const estructura = await this.motores.estructural({
      area_piso: cabida.planta_libre,
      num_pisos: cabida.pisos_vivienda,
      luz_tipica: 5.0,
    })
    const areaSotano = (Number(cabida.planta_libre) || 0) * (Number(cabida.sotanos) || 0)
    const financiero = await this.motores.financiero({
      distrito: dto.distrito,
      area_vendible_m2: cabida.area_vendible_total,
      area_construida_m2: cabida.area_construida_bruta,
      area_sotano_m2: areaSotano,
      num_departamentos: cabida.num_departamentos,
      num_pisos: cabida.pisos_vivienda,
      precio_terreno_usd: dto.precio_terreno_usd ?? 0,
      precio_venta_usd_m2: dto.precio_venta_usd_m2 ?? 0,
      costo_construccion_usd_m2: dto.costo_construccion_usd_m2 ?? 0,
      area_demolicion_m2: dto.area_demolicion_m2 ?? 0,
      porcentaje_capital_propio: dto.porcentaje_capital_propio ?? 60,
      velocidad_ventas_mensual: dto.velocidad_ventas_mensual ?? 0,
      mezcla_tipologias: dto.mezcla_tipologias ?? null,
    })

    // Upsert por proyecto_id — mismo registro que usan el chat y el GET /chat/:id/analisis
    await this.analisis.guardar(proyectoId, dto.distrito, cabida, estructura, financiero)

    return { cabida, estructura, financiero, distrito: dto.distrito }
  }

  /**
   * Compara sistema constructivo TRADICIONAL vs PREFABRICADO (prelosa Betondecken)
   * sobre el análisis ya generado: corre el motor financiero dos veces (misma cabida,
   * el prefab con menos meses de obra) y devuelve ambos escenarios.
   */
  @Post(':proyectoId/comparar')
  async comparar(
    @Param('proyectoId') proyectoId: string,
    @Body() body: { pct_mas_rapido?: number; delta_costo_pct?: number },
  ) {
    const registro = await this.analisis.getByProyecto(proyectoId)
    const cabida = registro?.cabida as any
    const fin = registro?.financiero as any
    if (!cabida || !fin) {
      throw new BadRequestException('Genera primero el análisis de pre-inversión para poder comparar sistemas.')
    }

    const ok = await this.motores.healthCheck()
    if (!ok) throw new ServiceUnavailableException('El motor de cálculo (Python) no está disponible.')

    const base = {
      distrito: registro?.distrito ?? '',
      area_vendible_m2: cabida.area_vendible_total,
      area_construida_m2: cabida.area_construida_bruta,
      area_sotano_m2: (Number(cabida.planta_libre) || 0) * (Number(cabida.sotanos) || 0),
      num_departamentos: cabida.num_departamentos,
      num_pisos: cabida.pisos_vivienda,
      precio_venta_usd_m2: fin.precio_venta_usd_m2 ?? 0,
      precio_terreno_usd: fin.costo_terreno_usd ?? 0,
      porcentaje_capital_propio: fin.porcentaje_capital_propio ?? 40,
      velocidad_ventas_mensual: fin.velocidad_ventas_mensual ?? 0,
    }

    const pctRapido = Math.min(50, Math.max(0, Number(body?.pct_mas_rapido ?? 25)))
    const deltaCosto = Math.min(30, Math.max(-30, Number(body?.delta_costo_pct ?? 0)))
    const factor = 1 - pctRapido / 100

    const [tradicional, prefabricado] = await Promise.all([
      this.motores.financiero(base),
      this.motores.financiero({ ...base, factor_tiempo_obra: factor, delta_costo_construccion_pct: deltaCosto }),
    ])

    return { tradicional, prefabricado, supuestos: { pct_mas_rapido: pctRapido, delta_costo_pct: deltaCosto } }
  }

  /**
   * Precio MÁXIMO de terreno (valor residual): despeja cuánto se puede pagar por el
   * terreno y aún alcanzar la TIR objetivo, usando la cabida ya generada.
   */
  @Post(':proyectoId/precio-maximo')
  async precioMaximo(
    @Param('proyectoId') proyectoId: string,
    @Body() body: { tir_objetivo?: number },
  ) {
    const registro = await this.analisis.getByProyecto(proyectoId)
    const cabida = registro?.cabida as any
    const fin = registro?.financiero as any
    if (!cabida || !fin) {
      throw new BadRequestException('Genera primero el análisis de pre-inversión para calcular el precio máximo del terreno.')
    }

    const ok = await this.motores.healthCheck()
    if (!ok) throw new ServiceUnavailableException('El motor de cálculo (Python) no está disponible.')

    const payload = {
      distrito: registro?.distrito ?? '',
      area_vendible_m2: cabida.area_vendible_total,
      area_construida_m2: cabida.area_construida_bruta,
      area_sotano_m2: (Number(cabida.planta_libre) || 0) * (Number(cabida.sotanos) || 0),
      num_departamentos: cabida.num_departamentos,
      num_pisos: cabida.pisos_vivienda,
      precio_venta_usd_m2: fin.precio_venta_usd_m2 ?? 0,
      porcentaje_capital_propio: fin.porcentaje_capital_propio ?? 40,
      velocidad_ventas_mensual: fin.velocidad_ventas_mensual ?? 0,
      tir_objetivo: Math.min(80, Math.max(1, Number(body?.tir_objetivo ?? 20))),
    }

    return this.motores.precioMaximoTerreno(payload)
  }
}
