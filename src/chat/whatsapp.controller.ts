import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'
import { ChatService } from './chat.service'

/**
 * Endpoint público para el "webhook bridge" de WhatsApp (EvolutionAPI).
 * Contrato esperado por el bridge:
 *   POST /api/chat/whatsapp   body: { user_id, user_name, message }
 *   → { response: string, status: 'success' }
 *
 * Sin JwtAuthGuard (el bridge no manda JWT). Se protege con un secreto compartido
 * OPCIONAL: si WHATSAPP_SHARED_SECRET está configurado, exige el header X-Webhook-Secret.
 */
@Controller('chat')
export class WhatsappController {
  constructor(private chat: ChatService) {}

  @Post('whatsapp')
  @HttpCode(200)
  async whatsapp(
    @Body() body: {
      user_id?: string; user_name?: string; message?: string
      image_base64?: string; image_mime?: string; audio_base64?: string; audio_mime?: string
      pdf_base64?: string; pdf_name?: string; excel_base64?: string; excel_name?: string
    },
    @Headers('x-webhook-secret') secret?: string,
  ) {
    const required = process.env.WHATSAPP_SHARED_SECRET
    if (required && secret !== required) {
      return { response: 'No autorizado.', status: 'error' }
    }

    const message = (body?.message ?? '').trim()
    const hayMedia = !!(body?.image_base64 || body?.audio_base64 || body?.pdf_base64 || body?.excel_base64)
    if (!message && !hayMedia) return { response: '', status: 'ignored' }

    try {
      const response = await this.chat.responderWhatsapp(
        body?.user_id ?? 'anon',
        body?.user_name ?? '',
        message,
        {
          imageBase64: body?.image_base64, imageMime: body?.image_mime,
          audioBase64: body?.audio_base64, audioMime: body?.audio_mime,
          pdfBase64: body?.pdf_base64, pdfName: body?.pdf_name,
          excelBase64: body?.excel_base64, excelName: body?.excel_name,
        },
      )
      // Si la IA generó un documento (reporte de obra), lo devolvemos en base64 para que el bridge lo envíe.
      const doc = this.chat.takePendingDoc(body?.user_id ?? 'anon')
      return {
        response, status: 'success',
        ...(doc ? { document_base64: doc.buffer.toString('base64'), document_name: doc.filename } : {}),
      }
    } catch {
      return { response: 'Hubo un error procesando tu mensaje. Intenta de nuevo.', status: 'error' }
    }
  }
}
