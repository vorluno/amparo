import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { notionPageUrl } from '@/lib/notion/urls'
import './globals.css'

/**
 * Sitio: toda la consola.
 * 1. Manda: el contenido de cada pantalla (lista o análisis); la barra solo orienta.
 * 2. Choca con: nada; es la única barra (una sola para toda la superficie).
 * 3. Se mueve: nada.
 * 4. Cargando/corriendo/fallando: lo gestiona cada pantalla; la barra no cambia.
 * 5. Quien ya miraba: conserva los enlaces a Notion y al repositorio siempre en el mismo sitio.
 */

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Amparo · Pre-autorización quirúrgica en tiempo real',
  description:
    'Agente que cruza el informe médico del hospital con la póliza del asegurado en Notion y emite preaprobación, rechazo o solicitud de documentos, con cada regla y cláusula a la vista.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const rootId = process.env.NOTION_ROOT_PAGE_ID
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <header className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-baseline gap-3 min-w-0">
              <span className="text-xl font-semibold tracking-tight">Amparo</span>
              <span className="hidden sm:inline text-sm text-ink-3 truncate">Pre-autorización quirúrgica en tiempo real</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink-2 shrink-0">
              {rootId && (
                <a href={notionPageUrl(rootId)} target="_blank" rel="noreferrer" className="hover:text-ink">
                  Datos en Notion ↗
                </a>
              )}
              <a href="https://github.com/vorluno/amparo" target="_blank" rel="noreferrer" className="hover:text-ink">
                Repositorio ↗
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-3">
            La IA lee y redacta; las reglas deciden. · HackIAthon Viamatica, Reto 1
          </div>
        </footer>
      </body>
    </html>
  )
}
