import type { EdgarLead } from './reader.js'

export interface EdgarFacilityData {
  name: string
  status: 'proposed'
  confidence: 'low'
  review_status: 'pending'
  location: {
    city: string
    state: string
    geocode_source: 'pending'
  }
  external_ids: {
    sec_edgar_id: string
  }
  notes_text: string
}

const STATE_ABBR: Record<string, string> = {
  'Virginia': 'VA',
  'Maryland': 'MD',
  'Pennsylvania': 'PA',
  'Delaware': 'DE',
  'West Virginia': 'WV',
  'New York': 'NY',
}

export function transformLead(lead: EdgarLead): EdgarFacilityData {
  const stateAbbr = STATE_ABBR[lead.matchedState] ?? lead.matchedState
  const location = lead.extractedCity
    ? `${lead.extractedCity}, ${stateAbbr}`
    : stateAbbr

  const name = `${lead.companyName} — ${location} (EDGAR ${lead.filingDate.slice(0, 7)})`

  const notes = [
    `Source: SEC EDGAR 8-K filing by ${lead.companyName}, filed ${lead.filingDate}.`,
    `Filing: ${lead.documentUrl}`,
    `Accession: ${lead.accessionNumber}`,
    '',
    'Relevant excerpt:',
    lead.excerpt,
    '',
    'This record was auto-generated from an SEC filing. Review the filing and update with confirmed details before publishing.',
  ].join('\n')

  return {
    name,
    status: 'proposed',
    confidence: 'low',
    review_status: 'pending',
    location: {
      city: lead.extractedCity ?? '',
      state: stateAbbr,
      geocode_source: 'pending',
    },
    external_ids: {
      sec_edgar_id: lead.edgarId,
    },
    notes_text: notes,
  }
}
