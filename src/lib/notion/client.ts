import { Client } from '@notionhq/client'

let client: Client | undefined

export function notion(): Client {
  if (!client) {
    const auth = process.env.NOTION_TOKEN
    if (!auth) throw new Error('Falta NOTION_TOKEN')
    client = new Client({ auth, notionVersion: '2025-09-03' })
  }
  return client
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta la variable de entorno ${name} (ejecuta bun run notion:seed y copia .env.notion a .env)`)
  return v
}

/** Data source IDs de las 4 bases. */
export function notionEnv() {
  return {
    polizas: required('NOTION_DS_POLIZAS'),
    catalogo: required('NOTION_DS_CATALOGO'),
    informes: required('NOTION_DS_INFORMES'),
    solicitudes: required('NOTION_DS_SOLICITUDES'),
  }
}

/** Pausa para respetar el límite de ~3 req/s de Notion. */
export const throttle = (ms = 350) => new Promise((r) => setTimeout(r, ms))
