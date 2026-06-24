const SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index'
const DATA_URL = 'https://data.sec.gov'
const ARCHIVES_URL = 'https://www.sec.gov/Archives/edgar/data'

// EDGAR requires this header; requests without it are blocked
const HEADERS = {
  'User-Agent': 'BehindTheDemand kel723@lehigh.edu',
  'Accept': 'application/json',
}

// EDGAR rate limit is 10 req/sec — we stay well under it
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson(url: string): Promise<any> {
  await sleep(150)
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`EDGAR ${res.status} ${res.statusText}: ${url}`)
  return res.json()
}

async function fetchText(url: string): Promise<string> {
  await sleep(150)
  const res = await fetch(url, {
    headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'text/html,text/plain' },
  })
  if (!res.ok) throw new Error(`EDGAR ${res.status} ${res.statusText}: ${url}`)
  return res.text()
}

export interface SearchHit {
  cik: string
  companyName: string
  accessionNumber: string  // with dashes, e.g. "0001101239-25-000123"
  filingDate: string
  documentFilename: string // the specific file that matched the search
  documentUrl: string
}

export async function searchFilings(query: string, startDate: string, formTypes = '8-K'): Promise<SearchHit[]> {
  // EDGAR's dateRange filter is unreliable — sort by date descending and filter client-side
  const params = new URLSearchParams({
    q: query,
    forms: formTypes,
    dateRange: 'custom',
    startdt: startDate,
    sort: 'file_date',
    order: 'desc',
  })

  let data: any
  try {
    data = await fetchJson(`${SEARCH_URL}?${params}`)
  } catch (err: any) {
    // EDGAR returns 500 for very common state name queries (too many results)
    // Re-throw so caller can handle gracefully
    throw err
  }

  const hits: any[] = data?.hits?.hits ?? []

  return hits
    .filter((h: any) => {
      if (!h._source?.ciks?.length) return false
      // Client-side date guard — EDGAR's startdt filter is not always applied
      const fileDate: string = h._source.file_date ?? ''
      return fileDate >= startDate
    })
    .map((h: any) => {
      const src = h._source
      const cik = src.ciks[0] as string
      const adsh = src.adsh as string
      const filename = (h._id as string).split(':')[1] ?? ''
      const cikNum = cik.replace(/^0+/, '')
      const accNodashes = adsh.replace(/-/g, '')

      return {
        cik,
        companyName: (src.display_names?.[0] as string ?? '').split('  ')[0],
        accessionNumber: adsh,
        filingDate: src.file_date as string,
        documentFilename: filename,
        documentUrl: `${ARCHIVES_URL}/${cikNum}/${accNodashes}/${filename}`,
      }
    })
}

// Decode common HTML entities and strip tags
function decodeHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#13;/g, '')
    .replace(/&#10;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8203;/g, '')   // zero-width space
    .replace(/&#[0-9]+;/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Inline XBRL documents embed structured financial data with namespace tokens that survive
// HTML tag stripping and turn the extracted text into garbage. Detect and skip them.
function isInlineXbrl(html: string): boolean {
  return html.includes('xmlns:ix=') || html.includes('xbrli:') || html.includes('xmlns:xbrli')
}

export async function fetchDocumentText(url: string): Promise<string | null> {
  const html = await fetchText(url)
  if (isInlineXbrl(html)) return null  // caller should skip this document
  return decodeHtml(html)
}
