import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { Response } from 'express'

export type ToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export type LlmMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | LlmContentPart[] }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type LlmTool = {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, any>
  }
}

export type ToolCallResult = {
  content: string | null
  tool_calls?: ToolCall[]
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name)
  readonly provider: string
  private readonly vllmUrl: string
  private readonly vllmModel: string
  private readonly ollamaUrl: string
  private readonly ollamaModel: string
  private readonly togetherApiKey: string
  private readonly togetherModel: string

  private readonly openaiApiKey: string
  private readonly openaiModel: string

  constructor(config: ConfigService) {
    this.provider = config.get<string>('LLM_PROVIDER', 'mock')
    this.vllmUrl = config.get<string>('VLLM_URL', 'http://localhost:8001')
    this.vllmModel = config.get<string>('VLLM_MODEL', 'Qwen/Qwen3.6-27B')
    this.ollamaUrl = config.get<string>('OLLAMA_URL', 'http://localhost:11434')
    this.ollamaModel = config.get<string>('OLLAMA_MODEL', 'deepseek-r1:14b')
    this.togetherApiKey = config.get<string>('TOGETHER_API_KEY', '')
    this.togetherModel = config.get<string>('TOGETHER_MODEL', 'meta-llama/Llama-3.3-70B-Instruct-Turbo')
    this.openaiApiKey = config.get<string>('OPENAI_API_KEY', '')
    this.openaiModel = config.get<string>('OPENAI_MODEL', 'gpt-4o')
  }

  isAgenticProvider(): boolean {
    return this.provider === 'vllm' || this.provider === 'openai'
  }

  // ── Tool calling (non-streaming) ─────────────────────────────────────────────

  async completWithTools(messages: LlmMessage[], tools: LlmTool[]): Promise<ToolCallResult> {
    if (this.provider === 'vllm') {
      return this.vllmCompleteWithTools(messages, tools)
    }
    if (this.provider === 'openai') {
      return this.openaiCompleteWithTools(messages, tools)
    }
    return { content: null, tool_calls: undefined }
  }

  // Streams pre-computed text word by word (simulates LLM typing)
  async streamText(text: string, res: Response): Promise<void> {
    const words = text.split(' ')
    for (const word of words) {
      res.write(`event:token\ndata:${JSON.stringify({ text: word + ' ' })}\n\n`)
      await new Promise((r) => setTimeout(r, 18))
    }
  }

  // ── Simple stream (legacy path for mock/ollama) ──────────────────────────────

  async streamChat(messages: LlmMessage[], res: Response): Promise<string> {
    if (this.provider === 'vllm') return this.streamVllm(messages as any, res)
    if (this.provider === 'ollama') return this.streamOllama(messages as any, res)
    if (this.provider === 'together' && this.togetherApiKey) return this.streamTogether(messages as any, res)
    return this.streamMock(res)
  }

  async complete(messages: LlmMessage[]): Promise<string> {
    if (this.provider === 'vllm') {
      const r = await this.vllmCompleteWithTools(messages, [])
      return r.content ?? '{}'
    }
    if (this.provider === 'ollama') return this.completeOllama(messages as any)
    if (this.provider === 'together' && this.togetherApiKey) return this.completeTogether(messages as any)
    return '{}'
  }

  // ── vLLM ─────────────────────────────────────────────────────────────────────

  private async vllmCompleteWithTools(
    messages: LlmMessage[],
    tools: LlmTool[],
  ): Promise<ToolCallResult> {
    const body: Record<string, any> = {
      model: this.vllmModel,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
      chat_template_kwargs: { enable_thinking: false },
    }
    if (tools.length > 0) {
      body.tools = tools
      body.tool_choice = 'auto'
    }

    const { data } = await axios.post(
      `${this.vllmUrl}/v1/chat/completions`,
      body,
      { timeout: 120_000 },
    )

    const msg = data.choices?.[0]?.message
    return {
      content: msg?.content ?? null,
      tool_calls: msg?.tool_calls,
    }
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────────

  private async openaiCompleteWithTools(
    messages: LlmMessage[],
    tools: LlmTool[],
  ): Promise<ToolCallResult> {
    const body: Record<string, any> = {
      model: this.openaiModel,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
    }
    if (tools.length > 0) {
      body.tools = tools
      body.tool_choice = 'auto'
    }

    const { data } = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      body,
      {
        headers: { Authorization: `Bearer ${this.openaiApiKey}` },
        timeout: 120_000,
      },
    )

    const msg = data.choices?.[0]?.message
    return {
      content: msg?.content ?? null,
      tool_calls: msg?.tool_calls,
    }
  }

  private async streamVllm(messages: { role: string; content: string }[], res: Response): Promise<string> {
    const response = await axios.post(
      `${this.vllmUrl}/v1/chat/completions`,
      {
        model: this.vllmModel,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
        chat_template_kwargs: { enable_thinking: false },
      },
      { responseType: 'stream', timeout: 120_000 },
    )

    let fullText = ''
    let buffer = ''

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const json = JSON.parse(line.slice(6))
            const token: string = json.choices?.[0]?.delta?.content ?? ''
            if (!token) continue
            fullText += token
            res.write(`event:token\ndata:${JSON.stringify({ text: token })}\n\n`)
          } catch {}
        }
      })
      response.data.on('end', () => resolve(fullText))
      response.data.on('error', reject)
    })
  }

  // ── Ollama ───────────────────────────────────────────────────────────────────

  private async streamOllama(messages: { role: string; content: string }[], res: Response): Promise<string> {
    const response = await axios.post(
      `${this.ollamaUrl}/api/chat`,
      { model: this.ollamaModel, messages, stream: true },
      { responseType: 'stream', timeout: 120_000 },
    )

    let fullText = ''
    let buffer = ''
    let inThink = false

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const json = JSON.parse(line)
            const token: string = json.message?.content ?? ''
            if (!token) continue
            const { text, inThink: next } = this.filterThink(token, inThink)
            inThink = next
            if (text) {
              fullText += text
              res.write(`event:token\ndata:${JSON.stringify({ text })}\n\n`)
            }
          } catch {}
        }
      })
      response.data.on('end', () => resolve(fullText))
      response.data.on('error', reject)
    })
  }

  private async completeOllama(messages: { role: string; content: string }[]): Promise<string> {
    const { data } = await axios.post(
      `${this.ollamaUrl}/api/chat`,
      { model: this.ollamaModel, messages, stream: false },
      { timeout: 30_000 },
    )
    return data.message?.content ?? '{}'
  }

  // ── Together.ai ──────────────────────────────────────────────────────────────

  private async streamTogether(messages: { role: string; content: string }[], res: Response): Promise<string> {
    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      { model: this.togetherModel, messages, stream: true, max_tokens: 800, temperature: 0.7 },
      {
        headers: { Authorization: `Bearer ${this.togetherApiKey}` },
        responseType: 'stream',
        timeout: 120_000,
      },
    )

    let fullText = ''
    let buffer = ''
    let inThink = false

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const json = JSON.parse(line.slice(6))
            const token: string = json.choices?.[0]?.delta?.content ?? ''
            if (!token) continue
            const { text, inThink: next } = this.filterThink(token, inThink)
            inThink = next
            if (text) {
              fullText += text
              res.write(`event:token\ndata:${JSON.stringify({ text })}\n\n`)
            }
          } catch {}
        }
      })
      response.data.on('end', () => resolve(fullText))
      response.data.on('error', reject)
    })
  }

  private async completeTogether(messages: { role: string; content: string }[]): Promise<string> {
    const { data } = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      { model: this.togetherModel, messages, stream: false, max_tokens: 300, temperature: 0 },
      { headers: { Authorization: `Bearer ${this.togetherApiKey}` }, timeout: 30_000 },
    )
    return data.choices?.[0]?.message?.content ?? '{}'
  }

  // ── Mock ─────────────────────────────────────────────────────────────────────

  private async streamMock(res: Response): Promise<string> {
    const options = [
      'Entendido. Para calcular la cabida arquitectónica necesito saber: ¿cuál es el área del terreno en m² y en qué distrito de Lima está ubicado?',
      'Perfecto. ¿Tiene las dimensiones del terreno? (frente y fondo en metros). Si no, puedo asumir una proporción estándar 1:1.5.',
      'Excelente. ¿Tiene un precio estimado del terreno y precio de venta objetivo por m²? Son opcionales — sin ellos usaré los precios de mercado del distrito.',
    ]
    const text = options[Math.floor(Math.random() * options.length)]

    for (const word of text.split(' ')) {
      res.write(`event:token\ndata:${JSON.stringify({ text: word + ' ' })}\n\n`)
      await new Promise((r) => setTimeout(r, 40))
    }

    return text
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private filterThink(token: string, wasInThink: boolean): { text: string; inThink: boolean } {
    let inThink = wasInThink
    let text = ''
    let remaining = token

    while (remaining.length > 0) {
      if (!inThink) {
        const start = remaining.indexOf('<think>')
        if (start === -1) { text += remaining; break }
        text += remaining.slice(0, start)
        remaining = remaining.slice(start + 7)
        inThink = true
      } else {
        const end = remaining.indexOf('</think>')
        if (end === -1) break
        remaining = remaining.slice(end + 8)
        inThink = false
      }
    }

    return { text, inThink }
  }
}
