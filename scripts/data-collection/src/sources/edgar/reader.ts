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

// States whose names flood EDGAR's index (state of incorporation, legal boilerplate, etc.)
// and cause 500 errors on a bare "data center" + state query. Narrow with extra keywords.
const BROAD_STATES = new Set(['Maryland', 'Pennsylvania', 'New York', 'Delaware', 'West Virginia'])

function buildQuery(state: string): string {
  if (BROAD_STATES.has(state)) {
    return `"data center" "${state}" (announce OR campus OR construction OR megawatt OR MW)`
  }
  return `"data center" "${state}"`
}

async function searchState(
  state: string,
  startDate: string,
  formTypes: string,
): Promise<SearchHit[]> {
  const query = buildQuery(state)
  console.log(`  [${formTypes}] Searching: ${query} since ${startDate}…`)
  const hits = await searchFilings(query, startDate, formTypes)
  const relevant = hits.filter(h => TARGET_CIKS.has(h.cik))
  console.log(`    ${hits.length} total hits, ${relevant.length} from target companies`)
  return relevant
}

export async function fetchEdgarLeads(): Promise<EdgarLead[]> {
  const startDate = getStartDate()
  const leads: EdgarLead[] = []
  const processed = new Set<string>()

  for (const state of WATERSHED_STATES) {
    const allHits: SearchHit[] = []

    // 8-K works for all states
    try {
      allHits.push(...await searchState(state, startDate, '8-K'))
    } catch (err) {
      console.error(`    ✗ 8-K search failed for ${state}: ${err}`)
    }

    // 10-K only for Virginia — other states flood EDGAR even with narrowed queries
    if (state === 'Virginia') {
      try {
        allHits.push(...await searchState(state, startDate, '10-K'))
      } catch (err) {
        console.error(`    ✗ 10-K search failed for ${state}: ${err}`)
      }
    }

    for (const hit of allHits) {
      const dedupKey = `${hit.cik}:${hit.accessionNumber}`
      if (processed.has(dedupKey)) continue
      processed.add(dedupKey)

      let text: string | null
      try {
        text = await fetchDocumentText(hit.documentUrl)
      } catch (err) {
        console.error(`    ✗ Could not fetch ${hit.documentUrl}: ${err}`)
        continue
      }

      if (text === null) {
        console.log(`    ⚠ Skipped inline XBRL document: ${hit.documentUrl}`)
        continue
      }

      const sentences = extractRelevantSentences(text, state)
      if (sentences.length === 0) continue

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
