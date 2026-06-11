const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:4000'

export function resolveImage(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${API_ORIGIN}${url}`
}
