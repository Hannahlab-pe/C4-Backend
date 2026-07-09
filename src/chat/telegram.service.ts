import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'

/** Cliente mínimo de la Bot API de Telegram: enviar mensajes y bajar media (foto/voz). */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name)

  private get token(): string {
    return process.env.TELEGRAM_BOT_TOKEN || ''
  }
  private api(): string {
    return `https://api.telegram.org/bot${this.token}`
  }

  async sendMessage(chatId: number | string, text: string): Promise<void> {
    if (!this.token) return
    try {
      await axios.post(`${this.api()}/sendMessage`, { chat_id: chatId, text: (text || 'Listo.').slice(0, 4000) }, { timeout: 20_000 })
    } catch (e: any) {
      this.logger.error(`Telegram sendMessage falló: ${e?.response?.data?.description ?? e?.message}`)
    }
  }

  /** Envía un documento (PDF) como adjunto de Telegram. */
  async sendDocument(chatId: number | string, buffer: Buffer, filename: string, caption?: string): Promise<boolean> {
    if (!this.token) return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FormData = require('form-data')
      const form = new FormData()
      form.append('chat_id', String(chatId))
      if (caption) form.append('caption', caption.slice(0, 1000))
      form.append('document', buffer, { filename, contentType: 'application/pdf' })
      await axios.post(`${this.api()}/sendDocument`, form, {
        headers: form.getHeaders(), timeout: 30_000, maxBodyLength: Infinity, maxContentLength: Infinity,
      })
      return true
    } catch (e: any) {
      this.logger.error(`Telegram sendDocument falló: ${e?.response?.data?.description ?? e?.message}`)
      return false
    }
  }

  /** Baja un archivo de Telegram (foto/voz) por su file_id y lo devuelve en base64. Reintenta ante fallos transitorios. */
  async getFileBase64(fileId: string): Promise<string | null> {
    if (!this.token) { this.logger.error('Telegram getFile: falta TELEGRAM_BOT_TOKEN'); return null }
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const { data } = await axios.get(`${this.api()}/getFile`, { params: { file_id: fileId }, timeout: 20_000 })
        const path = data?.result?.file_path
        if (!path) { this.logger.warn(`Telegram getFile sin file_path (intento ${intento})`); continue }
        const url = `https://api.telegram.org/file/bot${this.token}/${path}`
        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 45_000, maxContentLength: Infinity, maxBodyLength: Infinity })
        const kb = Math.round((resp.data as ArrayBuffer).byteLength / 1024)
        this.logger.log(`Telegram media descargada: ${kb} KB (intento ${intento})`)
        return Buffer.from(resp.data).toString('base64')
      } catch (e: any) {
        this.logger.error(`Telegram getFile falló (intento ${intento}): ${e?.message}`)
      }
    }
    return null
  }
}
