export interface TargetCompany {
  cik: string   // zero-padded 10-digit CIK as EDGAR stores it
  name: string
  ticker: string
}

// Public companies that own or operate data centers in the Chesapeake watershed.
// Hyperscalers (Amazon, Microsoft, Google) and data center REITs (Equinix, Digital Realty,
// Iron Mountain) are the primary sources. Meta and Apple have smaller but growing footprints.
export const TARGET_COMPANIES: TargetCompany[] = [
  { cik: '0001018724', name: 'Amazon.com',          ticker: 'AMZN' },
  { cik: '0000789019', name: 'Microsoft',            ticker: 'MSFT' },
  { cik: '0001652044', name: 'Alphabet',             ticker: 'GOOGL' },
  { cik: '0001101239', name: 'Equinix',              ticker: 'EQIX' },
  { cik: '0001297996', name: 'Digital Realty Trust', ticker: 'DLR'  },
  { cik: '0001020569', name: 'Iron Mountain',        ticker: 'IRM'  },
  { cik: '0001326801', name: 'Meta Platforms',       ticker: 'META' },
  { cik: '0000320193', name: 'Apple',                ticker: 'AAPL' },
]

export const TARGET_CIKS = new Set(TARGET_COMPANIES.map(c => c.cik))

export function companyByCik(cik: string): TargetCompany | undefined {
  return TARGET_COMPANIES.find(c => c.cik === cik)
}

// Chesapeake watershed states — used as search terms in filing text
export const WATERSHED_STATES = [
  'Virginia',
  'Maryland',
  'Pennsylvania',
  'Delaware',
  'West Virginia',
  'New York',
]

// High-density data center locations to improve city extraction
export const KNOWN_LOCATIONS: Record<string, string[]> = {
  VA: ['Ashburn', 'Chantilly', 'Manassas', 'Sterling', 'Leesburg', 'Reston',
       'Herndon', 'Loudoun', 'Prince William', 'Fairfax', 'Northern Virginia'],
  MD: ['Beltsville', 'Clarksburg', 'Frederick', 'Germantown', 'Rockville',
       'Montgomery County', 'Prince George', 'Laurel', 'Columbia'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Bethlehem', 'Chester County'],
  DE: ['Wilmington', 'Newark', 'New Castle'],
  WV: ['Martinsburg', 'Charles Town', 'Jefferson County'],
  NY: ['Buffalo', 'Albany', 'Syracuse', 'Binghamton'],
  DC: ['Washington'],
}
