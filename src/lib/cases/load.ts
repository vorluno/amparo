import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import type { CatalogEntry } from '@/lib/rules/types'
import { CaseFrontmatter, CatalogSchema } from './schema'

const CASES_DIR = join(process.cwd(), 'cases')

export type CaseFile = CaseFrontmatter & { prosa: string }

export function loadCatalog(): CatalogEntry[] {
  const raw = JSON.parse(readFileSync(join(CASES_DIR, 'catalogo.json'), 'utf8'))
  return CatalogSchema.parse(raw)
}

export function loadCases(): CaseFile[] {
  return readdirSync(CASES_DIR)
    .filter((f) => /^PA-\d{4}\.md$/.test(f))
    .sort()
    .map((f) => {
      const { data, content } = matter(readFileSync(join(CASES_DIR, f), 'utf8'))
      const parsed = CaseFrontmatter.safeParse(data)
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
        throw new Error(`${f}: frontmatter inválido\n${issues}`)
      }
      const fm = parsed.data
      if (`${fm.id}.md` !== f) throw new Error(`${f}: el id del frontmatter (${fm.id}) no coincide con el nombre del archivo`)
      const prosa = content.trim()
      if (prosa.split(/\s+/).length < 80) throw new Error(`${f}: la prosa del informe debe tener al menos 80 palabras`)
      return { ...fm, prosa }
    })
}
