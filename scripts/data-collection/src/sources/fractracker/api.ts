const FEATURE_SERVICE =
  'https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/data_centers_v4_agol_all/FeatureServer/0'

const WATERSHED_STATES = ['VA', 'MD', 'PA', 'DE', 'WV', 'NY', 'DC']

// WV is mostly Ohio River basin — only the eastern panhandle drains to the Potomac/Chesapeake
const WV_CHESAPEAKE_COUNTIES = [
  'Berkeley', 'Jefferson', 'Morgan', 'Hampshire', 'Hardy', 'Mineral', 'Grant', 'Pendleton',
]

export interface FracTrackerRecord {
  facility_id: string | null
  facility_name: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  county: string | null
  lat: number | null
  long: number | null
  status: string | null
  location_confidence: string | null
  location_determination: string | null
  operator_name: string | null
  tenant: string | null
  mw_low: number | null
  mw_high: number | null
  cooling_type: string | null
  facility_size_sqft: number | null
  property_size_acres: string | null
  expected_date_online: string | null
  information_source: string | null
}

const OUT_FIELDS = [
  'facility_id', 'facility_name', 'address', 'city', 'state', 'zip', 'county',
  'lat', 'long', 'status', 'location_confidence', 'location_determination',
  'operator_name', 'tenant', 'mw_low', 'mw_high',
  'cooling_type', 'facility_size_sqft', 'property_size_acres',
  'expected_date_online', 'information_source',
].join(',')

async function fetchPage(offset: number): Promise<{ features: any[]; exceededTransferLimit: boolean }> {
  const stateList = WATERSHED_STATES.map(s => `'${s}'`).join(',')
  const wvCountyList = WV_CHESAPEAKE_COUNTIES.map(c => `'${c}'`).join(',')
  // For WV, restrict to eastern panhandle counties that drain to the Potomac.
  // All other states are predominantly within the watershed at the state level.
  const where = `(state IN (${stateList}) AND state <> 'WV') OR (state = 'WV' AND county IN (${wvCountyList}))`
  const params = new URLSearchParams({
    where,
    outFields: OUT_FIELDS,
    returnGeometry: 'true',
    outSR: '4326',  // Return geometry in WGS84 decimal degrees
    resultOffset: String(offset),
    resultRecordCount: '1000',
    f: 'json',
  })
  const res = await fetch(`${FEATURE_SERVICE}/query?${params}`)
  if (!res.ok) throw new Error(`FracTracker API ${res.status}: ${res.statusText}`)
  const data = await res.json()
  if (data.error) throw new Error(`FracTracker API error: ${JSON.stringify(data.error)}`)
  return {
    features: data.features ?? [],
    exceededTransferLimit: data.exceededTransferLimit ?? false,
  }
}

export async function fetchFracTrackerRecords(): Promise<FracTrackerRecord[]> {
  const records: FracTrackerRecord[] = []
  let offset = 0

  while (true) {
    const { features, exceededTransferLimit } = await fetchPage(offset)

    for (const f of features) {
      const a = f.attributes as Record<string, any>
      // Geometry is the authoritative coordinate source; lat/long fields are backup
      const geoLat = f.geometry?.y ?? null
      const geoLng = f.geometry?.x ?? null

      records.push({
        facility_id: a.facility_id ?? null,
        facility_name: a.facility_name ?? null,
        address: a.address ?? null,
        city: a.city ?? null,
        state: a.state ?? null,
        zip: a.zip ?? null,
        county: a.county ?? null,
        lat: geoLat ?? a.lat ?? null,
        long: geoLng ?? a.long ?? null,
        status: a.status ?? null,
        location_confidence: a.location_confidence ?? null,
        location_determination: a.location_determination ?? null,
        operator_name: a.operator_name ?? null,
        tenant: a.tenant ?? null,
        mw_low: a.mw_low ?? null,
        mw_high: a.mw_high ?? null,
        cooling_type: a.cooling_type ?? null,
        facility_size_sqft: a.facility_size_sqft ?? null,
        property_size_acres: a.property_size_acres ?? null,
        expected_date_online: a.expected_date_online ?? null,
        information_source: a.information_source ?? null,
      })
    }

    if (!exceededTransferLimit) break
    offset += features.length
  }

  return records
}
