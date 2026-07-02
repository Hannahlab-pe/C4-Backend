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
    @Body() body: { user_id?: string; user_name?: string; message?: string },
    @Headers('x-webhook-secret') secret?: string,
  ) {
    const required = process.env.WHATSAPP_SHARED_SECRET
    if (required && secret !== required) {
      return { response: 'No autorizado.', status: 'error' }
    }

    const message = (body?.message ?? '').trim()
    if (!message) return { response: '', status: 'ignored' }

    try {
      const response = await this.chat.responderWhatsapp(
        body?.user_id ?? 'anon',
        body?.user_name ?? '',
        message,
      )
      return { response, status: 'success' }
    } catch {
      return { response: 'Hubo un error procesando tu mensaje. Intenta de nuevo.', status: 'error' }
    }
  }
}
