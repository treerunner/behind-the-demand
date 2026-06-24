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

export interface FilingDoc {
  cik: string
  accessionNumber: string  // with dashes
  filingDate: string
  form: string
  documentUrl: string
  documentFilename: string
}

// Fetch all recent 8-K filings for a company from the submissions API.
// This is more reliable than full-text search — no 500 errors, no result-set size limits.
export async function getRecentFilings(
  cik: string,
  startDate: string,
  forms: string[],
): Promise<FilingDoc[]> {
  const url = `${DATA_URL}/submissions/CIK${cik}.json`
  const data = await fetchJson(url)

  const recent = data?.filings?.recent ?? {}
  const accessions: string[] = recent.accessionNumber ?? []
  const dates: string[] = recent.filingDate ?? []
  const formTypes: string[] = recent.form ?? []
  const primaryDocs: string[] = recent.primaryDocument ?? []

  const results: FilingDoc[] = []
  const cikNum = cik.replace(/^0+/, '')

  for (let i = 0; i < accessions.length; i++) {
    if (!dates[i] || dates[i] < startDate) continue
    if (!forms.includes(formTypes[i])) continue

    const adsh = accessions[i]
    const accNodashes = adsh.replace(/-/g, '')
    const primaryDoc = primaryDocs[i] ?? ''

    results.push({
      cik,
      accessionNumber: adsh,
      filingDate: dates[i],
      form: formTypes[i],
      documentUrl: `${ARCHIVES_URL}/${cikNum}/${accNodashes}/${primaryDoc}`,
      documentFilename: primaryDoc,
    })
  }

  return results
}

// Fetch the filing index HTML for an 8-K and return the ex99.1 document URL if present.
// ex99.1 is the press release exhibit — the most likely place to find facility announcements.
// EDGAR only publishes filing indexes as HTML (not JSON), so we parse the table rows.
export async function getEx991Url(cik: string, accessionNumber: string): Promise<string | null> {
  const cikNum = cik.replace(/^0+/, '')
  const accNodashes = accessionNumber.replace(/-/g, '')
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNodashes}/${accNodashes}-index.htm`

  let html: string
  try {
    html = await fetchText(indexUrl)
  } catch {
    return null
  }

  // The index table has columns: Seq | Description | Document | Type | Size
  // We look for a row where Type column contains EX-99.1
  // Pattern: href to the file appears before the EX-99.1 type column in the same row
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null
  while ((match = rowRegex.exec(html)) !== null) {
    const row = match[1]
    if (!/EX-99\.1/i.test(row)) continue
    const hrefMatch = row.match(/href="([^"]+\.(htm|html|txt))"/i)
    if (!hrefMatch) continue
    const filename = hrefMatch[1].replace(/^.*\//, '')
    return `${ARCHIVES_URL}/${cikNum}/${accNodashes}/${filename}`
  }

  return null
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
  if (isInlineXbrl(html)) return null
  return decodeHtml(html)
}
