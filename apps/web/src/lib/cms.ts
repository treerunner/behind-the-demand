import { PUBLIC_CMS_URL } from '$env/static/public'

export async function fetchCollection<T>(
  collection: string,
  params: Record<string, string | number> = {},
  fetchFn: typeof fetch = fetch,
): Promise<{ docs: T[]; totalDocs: number }> {
  const url = new URL(`${PUBLIC_CMS_URL}/api/${collection}`)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v))
  }
  const res = await fetchFn(url.toString())
  if (!res.ok) throw new Error(`CMS fetch failed: ${res.status}`)
  return res.json()
}
