/**
 * id con guiones → URL de Notion. Si la página raíz está publicada en la web
 * (NOTION_PUBLIC_BASE, p. ej. https://xxx.notion.site), los enlaces van al sitio
 * público, que no exige iniciar sesión; si no, a la app de Notion.
 */
export const notionPageUrl = (id: string) => `${process.env.NOTION_PUBLIC_BASE ?? 'https://www.notion.so'}/${id.replace(/-/g, '')}`
