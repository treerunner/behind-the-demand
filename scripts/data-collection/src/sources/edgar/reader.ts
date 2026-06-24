import { searchFilings, fetchDocumentText, type SearchHit } from './api.js'
import {
  TARGET_CIKS,
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
  matchedState: string               // watershed state that triggered the match
  extractedCity: string | null       // best city/county extracted from text, if any
  excerpt: string                    // up to 3 relevant sentences for editor context
  edgarId: string                    // dedup key: "{cik}:{accession}"
}

// How far back to search (default 12 months, can override via env)
function getStartDate(): string {
  const months = parseInt(process.env.EDGAR_LOOKBACK_MONTHS ?? '12', 10)
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function extractCity(text: string, state: string): string | null {
  const stateAbbr = STATE_ABBR[state]
  if (!stateAbbr) return null

  const candidates = KNOWN_LOCATIONS[stateAbbr] ?? []
  const lower = text.toLowerCase()

  for (const loc of candidates) {
    if (lower.includes(loc.toLowerCase())) return loc
  }
  return null
}

function extractRelevantSentences(text: string, state: string): string[] {
  // Split on sentence boundaries (rough but effective for press release prose)
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

const STATE_ABBR: Record<string, string> = {
  'Virginia': 'VA',
  'Maryland': 'MD',
  'Pennsylvania': 'PA',
  'Delaware': 'DE',
  'West Virginia': 'WV',
  'New York': 'NY',
}

// States whose names are so common in SEC filings that EDGAR's full-text search
// times out on a bare "data center" + state query. Narrow with an extra keyword.
const BROAD_STATES = new Set(['Maryland', 'Pennsylvania', 'New York'])

function buildQuery(state: string): string {
  if (BROAD_STATES.has(state)) {
    // Require an announcement/construction verb alongside the state name to reduce noise
    return `"data center" "${state}" (announce OR campus OR construction OR megawatt OR MW)`
  }
  return `"data center" "${state}"`
}

export async function fetchEdgarLeads(): Promise<EdgarLead[]> {
  const startDate = getStartDate()
  const leads: EdgarLead[] = []
  // Track processed accession numbers to avoid duplicate work across state queries
  const processed = new Set<string>()

  for (const state of WATERSHED_STATES) {
    const query = buildQuery(state)
    console.log(`  Searching EDGAR: ${JSON.stringify(query)} since ${startDate}…`)

    let hits: SearchHit[]
    try {
      hits = await searchFilings(query, startDate)
    } catch (err) {
      console.error(`    ✗ Search failed for ${state}: ${err}`)
      continue
    }

    // Filter to target companies only
    const relevant = hits.filter(h => TARGET_CIKS.has(h.cik))
    console.log(`    ${hits.length} total hits, ${relevant.length} from target companies`)

    for (const hit of relevant) {
      const dedupKey = `${hit.cik}:${hit.accessionNumber}`

      if (processed.has(dedupKey)) continue
      processed.add(dedupKey)

      let text = ''
      try {
        text = await fetchDocumentText(hit.documentUrl)
      } catch (err) {
        console.error(`    ✗ Could not fetch ${hit.documentUrl}: ${err}`)
        continue
      }

      const sentences = extractRelevantSentences(text, state)
      if (sentences.length === 0) continue  // full-text matched but no clear data center sentence

      const company = companyByCik(hit.cik)

      leads.push({
        cik: hit.cik,
        companyName: company?.name ?? hit.companyName,
        accessionNumber: hit.accessionNumber,
        filingDate: hit.filingDate,
        documentUrl: hit.documentUrl,
        matchedState: state,
        extractedCity: extractCity(sentences.join(' '), state),
        excerpt: sentences.join(' ').slice(0, 1000),
        edgarId: `${hit.cik}:${hit.accessionNumber}`,
      })
    }
  }

  return leads
}
