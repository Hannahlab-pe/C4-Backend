import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'
import { ChatService } from './chat.service'
import { TelegramService } from './telegram.service'

/**
 * Webhook de Telegram. Telegram llama a POST /api/telegram/webhook con cada update.
 * Extrae texto / foto / voz, reusa el agente de C4 (responderCanal) y responde por Telegram.
 * Seguridad opcional: si TELEGRAM_WEBHOOK_SECRET está seteado, exige el header que Telegram envía.
 */
@Controller('telegram')
export class TelegramController {
  constructor(
    private chat: ChatService,
    private tg: TelegramService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') secret?: string,
  ) {
    const required = process.env.TELEGRAM_WEBHOOK_SECRET
    if (required && secret !== required) return { ok: true }

    const msg = update?.message ?? update?.edited_message
    const chatId = msg?.chat?.id
    if (!msg || !chatId) return { ok: true }

    const name = msg.from?.first_name || ''
    let text: string = (msg.text || msg.caption || '').trim()
    let imageBase64: string | undefined, imageMime: string | undefined
    let audioBase64: string | undefined, audioMime: string | undefined
    let pdfBase64: string | undefined, pdfName: string | undefined

    try {
      if (Array.isArray(msg.photo) && msg.photo.length) {
        const largest = msg.photo[msg.photo.length - 1] // el último = la mayor resolución
        imageBase64 = (await this.tg.getFileBase64(largest.file_id)) ?? undefined
        imageMime = 'image/jpeg'
        if (!imageBase64) {
          // La descarga falló: avisar claro en vez de "analizar" sin imagen.
          await this.tg.sendMessage(chatId, 'No pude descargar tu foto 📷. ¿Me la reenvías? (a veces Telegram tarda un momento).')
          return { ok: true }
        }
      } else if (msg.document) {
        // Documento adjunto: PDF (lo lee la IA) o imagen enviada como archivo.
        const mime = String(msg.document.mime_type || '')
        const fname = String(msg.document.file_name || 'documento')
        const esPdf = /pdf/i.test(mime) || /\.pdf$/i.test(fname)
        const esImg = /^image\//i.test(mime) || /\.(jpe?g|png|webp)$/i.test(fname)
        if (esPdf || esImg) {
          const b64 = (await this.tg.getFileBase64(msg.document.file_id)) ?? undefined
          if (!b64) {
            await this.tg.sendMessage(chatId, `No pude descargar "${fname}" 📄. ¿Me lo reenvías?`)
            return { ok: true }
          }
          if (esPdf) { pdfBase64 = b64; pdfName = fname }
          else { imageBase64 = b64; imageMime = mime || 'image/jpeg' }
        } else {
          await this.tg.sendMessage(chatId, `Por ahora puedo leer PDFs e imágenes. "${fname}" (${mime || 'tipo desconocido'}) todavía no. 🙏`)
          return { ok: true }
        }
      } else if (msg.voice) {
        audioBase64 = (await this.tg.getFileBase64(msg.voice.file_id)) ?? undefined
        audioMime = msg.voice.mime_type || 'audio/ogg'
        text = '' // nota de voz: que la transcripción sea el mensaje
      } else if (msg.audio) {
        audioBase64 = (await this.tg.getFileBase64(msg.audio.file_id)) ?? undefined
        audioMime = msg.audio.mime_type || 'audio/mpeg'
      }

      if (!text && !imageBase64 && !audioBase64 && !pdfBase64) return { ok: true }

      const response = await this.chat.responderWhatsapp(String(chatId), name, text, {
        imageBase64, imageMime, audioBase64, audioMime, pdfBase64, pdfName,
      })
      await this.tg.sendMessage(chatId, response)
    } catch {
      await this.tg.sendMessage(chatId, 'Tuve un problema procesando tu mensaje. Intenta de nuevo. 🙏')
    }
    return { ok: true }
  }
}
