import { getRecentFilings, getEx991Url, fetchDocumentText } from './api.js'
import {
  TARGET_COMPANIES,
  companyByCik,
  WATERSHED_STATES,
  KNOWN_LOCATIONS,
} from './companies.js'

export interface EdgarLead {
  cik: string
  companyName: string
  accessionNumber: string
  filingDate: string
  documentUrl: string
  matchedState: string
  extractedCity: string | null
  excerpt: string
  edgarId: string
}

function getStartDate(): string {
  const months = parseInt(process.env.EDGAR_LOOKBACK_MONTHS ?? '12', 10)
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

const STATE_ABBR: Record<string, string> = {
  'Virginia': 'VA',
  'Maryland': 'MD',
  'Pennsylvania': 'PA',
  'Delaware': 'DE',
  'West Virginia': 'WV',
  'New York': 'NY',
}

function extractCity(text: string, state: string): string | null {
  const abbr = STATE_ABBR[state]
  if (!abbr) return null
  const lower = text.toLowerCase()
  for (const loc of KNOWN_LOCATIONS[abbr] ?? []) {
    if (lower.includes(loc.toLowerCase())) return loc
  }
  return null
}

function extractRelevantSentences(text: string, state: string): string[] {
  const sentences = text.match(/[^.!?]{20,}[.!?]/g) ?? []
  const stateLower = state.toLowerCase()
  return sentences
    .filter(s => {
      const lower = s.toLowerCase()
      return (lower.includes('data center') || lower.includes('datacenter')) &&
             lower.includes(stateLower)
    })
    .slice(0, 3)
}

export async function fetchEdgarLeads(): Promise<EdgarLead[]> {
  const startDate = getStartDate()
  const leads: EdgarLead[] = []
  const processed = new Set<string>()

  for (const company of TARGET_COMPANIES) {
    console.log(`  ${company.name} (${company.ticker})…`)

    let filings: Awaited<ReturnType<typeof getRecentFilings>>
    try {
      filings = await getRecentFilings(company.cik, startDate, ['8-K'])
    } catch (err) {
      console.error(`    ✗ Could not fetch submissions for ${company.name}: ${err}`)
      continue
    }

    console.log(`    ${filings.length} 8-K filings since ${startDate}`)

    for (const filing of filings) {
      const dedupKey = `${filing.cik}:${filing.accessionNumber}`
      if (processed.has(dedupKey)) continue
      processed.add(dedupKey)

      // Prefer ex99.1 (press release) over the primary 8-K document
      let docUrl: string | null = null
      try {
        docUrl = await getEx991Url(filing.cik, filing.accessionNumber)
      } catch {
        // Fall back to primary document
      }
      docUrl ??= filing.documentUrl

      let text: string | null
      try {
        text = await fetchDocumentText(docUrl)
      } catch (err) {
        console.error(`    ✗ Could not fetch ${docUrl}: ${err}`)
        continue
      }

      if (text === null) continue  // XBRL

      // Check if this filing mentions any watershed state alongside "data center"
      for (const state of WATERSHED_STATES) {
        const sentences = extractRelevantSentences(text, state)
        if (sentences.length === 0) continue

        leads.push({
          cik: filing.cik,
          companyName: company.name,
          accessionNumber: filing.accessionNumber,
          filingDate: filing.filingDate,
          documentUrl: docUrl,
          matchedState: state,
          extractedCity: extractCity(sentences.join(' '), state),
          excerpt: sentences.join(' ').slice(0, 1000),
          edgarId: `${filing.cik}:${filing.accessionNumber}`,
        })

        // One lead per filing — don't create separate leads for every state mentioned
        break
      }
    }
  }

  return leads
}
