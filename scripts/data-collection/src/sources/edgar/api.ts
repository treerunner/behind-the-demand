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

export async function searchFilings(query: string, startDate: string): Promise<SearchHit[]> {
  const params = new URLSearchParams({
    q: query,
    forms: '8-K',
    dateRange: 'custom',
    startdt: startDate,
  })

  const data = await fetchJson(`${SEARCH_URL}?${params}`)
  const hits: any[] = data?.hits?.hits ?? []

  return hits
    .filter((h: any) => h._source?.ciks?.length > 0)
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

export async function fetchDocumentText(url: string): Promise<string> {
  const html = await fetchText(url)
  // Strip HTML tags and collapse whitespace
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}
