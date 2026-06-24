// EPA ECHO REST API — https://echodata.epa.gov/echo/
// Rate limit: 300 req/hr, 1500/day anonymous
// Set ECHO_EMAIL to your registered email for direct public access (higher limits)
const BASE = `https://echodata.epa.gov/echo`

export const WATERSHED_STATES = ['VA', 'MD', 'PA', 'DE', 'WV', 'NY', 'DC'] as const

// NAICS 518210 = Data Processing, Hosting, and Related Services
// SIC  7374    = Computer Processing and Data Preparation
const NAICS = '518210'
const SIC = '7374'

export interface EchoFacility {
  RegistryId: string
  FacilityName: string
  LocationAddress: string
  City: string
  StateName: string
  Zip: string
  Latitude83: string
  Longitude83: string
  FacilityStatus: string
  SICCodes: string
  NAICSCodes: string
  AIRIDs: string
  CWAIDs: string
  RCRAIDs: string
  TotalInspectionCount: string
  TotalEnforcementCount: string
  TotalPenaltyAmt: string
}

interface EchoResponse {
  Results: {
    Message?: string
    QueryID?: string
    QueryRows?: string
    Error?: { ErrorMessage: string }
    FacilityList?: EchoFacility[]
  }
}

export async function searchFacilities(
  state: string,
  page = 1,
  queryId?: string,
): Promise<{ facilities: EchoFacility[]; totalRows: number; queryId: string }> {
  const params = new URLSearchParams({
    output: 'JSON',
    p_qnp: String(page),
    p_qnc: '100',
  })

  if (queryId) {
    // Subsequent pages use the stored QueryID (avoids re-running the filter)
    params.set('QueryID', queryId)
  } else {
    // First call — include filter params
    params.set('p_st', state)
    params.set('p_naics', NAICS)
  }

  if (process.env.ECHO_EMAIL) params.set('email', process.env.ECHO_EMAIL)

  const url = `${BASE}/air_rest_services.get_facilities?${params}`
  const res = await fetch(url)

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        `ECHO API rate limit (429) for state ${state}. ` +
          `Set ECHO_EMAIL in .env to your registered EPA ECHO email for higher limits.`,
      )
    }
    throw new Error(`ECHO API HTTP ${res.status} for state ${state}, page ${page}`)
  }

  const data: EchoResponse = await res.json()
  const r = data.Results

  if (r.Error) {
    if (r.Error.ErrorMessage.includes('exceed') || r.Error.ErrorMessage.includes('throttle')) {
      throw new Error(
        `ECHO rate limit exceeded (${state} p${page}). ` +
          `Register at https://echo.epa.gov and ensure ECHO_EMAIL matches your account.`,
      )
    }
    throw new Error(`ECHO API error for ${state} p${page}: ${r.Error.ErrorMessage}`)
  }

  return {
    facilities: r.FacilityList ?? [],
    totalRows: parseInt(r.QueryRows ?? '0', 10),
    queryId: r.QueryID ?? queryId ?? '',
  }
}

export async function fetchAllFacilitiesForState(state: string): Promise<EchoFacility[]> {
  const all: EchoFacility[] = []

  // Page 1 — also establishes the QueryID for subsequent pages
  const first = await searchFacilities(state, 1)
  all.push(...first.facilities)

  const totalPages = Math.ceil(first.totalRows / 100)

  for (let page = 2; page <= totalPages; page++) {
    // Polite delay — ECHO rate limits aggressive callers
    await new Promise(r => setTimeout(r, 600))

    const { facilities } = await searchFacilities(state, page, first.queryId)
    all.push(...facilities)

    if (facilities.length === 0) break
  }

  // Post-filter: NAICS filter in query may not be reliable; verify on returned data
  return all.filter(f => {
    const naics = f.NAICSCodes ?? ''
    const sic = f.SICCodes ?? ''
    return naics.includes(NAICS) || sic.includes(SIC)
  })
}
