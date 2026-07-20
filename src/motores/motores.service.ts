import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'

@Injectable()
export class MotoresService {
  private readonly logger = new Logger(MotoresService.name)
  private readonly baseUrl: string

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('PYTHON_API_URL', 'http://localhost:8000')
  }

  async analisisCompleto(payload: {
    terreno: { area_total: number; frente?: number | null; fondo?: number | null }
    normativa: {
      distrito: string
      pisos_max: number
      retiro_frontal: number
      retiro_lateral: number
      retiro_posterior: number
      cus: number
      area_min_depto: number
      estacionamientos: number
    }
    luz_tipica?: number
    precio_terreno_usd?: number
    precio_venta_usd_m2?: number
    area_demolicion_m2?: number
    porcentaje_capital_propio?: number
    velocidad_ventas_mensual?: number
    mezcla_tipologias?: Array<{ tipo: string; porcentaje: number; precio_usd_m2: number }>
  }): Promise<any> {
    const { data } = await axios.post(
      `${this.baseUrl}/analisis-completo`,
      payload,
      { timeout: 30_000 },
    )
    return data
  }

  async cabida(payload: Record<string, any>): Promise<any> {
    const { data } = await axios.post(`${this.baseUrl}/cabida`, payload, { timeout: 10_000 })
    return data
  }

  async estructural(payload: Record<string, any>): Promise<any> {
    const { data } = await axios.post(`${this.baseUrl}/estructural`, payload, { timeout: 10_000 })
    return data
  }

  async financiero(payload: Record<string, any>): Promise<any> {
    const { data } = await axios.post(`${this.baseUrl}/financiero`, payload, { timeout: 10_000 })
    return data
  }

  async precioMaximoTerreno(payload: Record<string, any>): Promise<any> {
    const { data } = await axios.post(`${this.baseUrl}/precio-maximo-terreno`, payload, { timeout: 15_000 })
    return data
  }

  async leerPlano(dxfBase64: string): Promise<any> {
    const { data } = await axios.post(`${this.baseUrl}/leer-plano`, { dxf_base64: dxfBase64 }, { timeout: 30_000 })
    return data
  }

  async ubicarGrua(payload: {
    dxf_base64: string; modelo?: string; radio_m?: number; base_m?: number
    frente_m?: number; fondo_m?: number; esquina?: string
  }): Promise<any> {
    const { data } = await axios.post(`${this.baseUrl}/ubicar-grua`, payload, { timeout: 60_000, maxBodyLength: Infinity, maxContentLength: Infinity })
    return data
  }

  async plano(payload: Record<string, any>): Promise<Buffer> {
    try {
      const { data } = await axios.post(`${this.baseUrl}/plano`, payload, {
        timeout: 15_000,
        responseType: 'arraybuffer',
      })
      return Buffer.from(data)
    } catch (e: unknown) {
      if (e instanceof AxiosError && e.response?.data) {
        const body = Buffer.from(e.response.data as ArrayBuffer).toString('utf8')
        let detail: string
        try { detail = JSON.parse(body)?.detail ?? body } catch { detail = body.slice(0, 1000) }
        throw new Error(`Python /plano [${e.response.status}]: ${detail}`)
      }
      throw e
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 3_000 })
      return true
    } catch (e: unknown) {
      const msg = e instanceof AxiosError ? e.message : String(e)
      this.logger.warn(`Python API no disponible en ${this.baseUrl}: ${msg}`)
      return false
    }
  }
}
