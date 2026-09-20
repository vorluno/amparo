import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const DEFAULT_PRIMARY = 'google/gemini-2.5-flash'
const DEFAULT_FALLBACK = 'google/gemini-2.5-pro'

let provider: ReturnType<typeof createOpenRouter> | undefined

function openrouter() {
  if (!provider) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('Falta OPENROUTER_API_KEY')
    provider = createOpenRouter({
      apiKey,
      headers: { 'HTTP-Referer': process.env.APP_URL ?? 'https://amparo.vorluno.dev', 'X-Title': 'Amparo' },
    })
  }
  return provider
}

export function modelIds() {
  return {
    primary: process.env.OPENROUTER_MODEL ?? DEFAULT_PRIMARY,
    fallback: process.env.OPENROUTER_MODEL_FALLBACK ?? DEFAULT_FALLBACK,
  }
}

export const primaryModel = () => openrouter().chat(modelIds().primary)
export const fallbackModel = () => openrouter().chat(modelIds().fallback)
