/** id con guiones → URL de Notion. */
export const notionPageUrl = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`
