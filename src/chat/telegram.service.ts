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

  /** Baja un archivo de Telegram (foto/voz) por su file_id y lo devuelve en base64. */
  async getFileBase64(fileId: string): Promise<string | null> {
    if (!this.token) return null
    try {
      const { data } = await axios.get(`${this.api()}/getFile`, { params: { file_id: fileId }, timeout: 20_000 })
      const path = data?.result?.file_path
      if (!path) return null
      const url = `https://api.telegram.org/file/bot${this.token}/${path}`
      const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 30_000, maxContentLength: Infinity })
      return Buffer.from(resp.data).toString('base64')
    } catch (e: any) {
      this.logger.error(`Telegram getFile falló: ${e?.message}`)
      return null
    }
  }
}
