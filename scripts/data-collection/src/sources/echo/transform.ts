import type { EchoRow } from './reader.js'

export interface FacilityUpsert {
  name: string
  status: 'unknown'
  confidence: 'low'
  location: {
    address: string
    city: string
    state: string
    zip: string
    lat: number | null
    lng: number | null
    geocode_source: 'echo'
  }
  external_ids: {
    echo_registry_id: string
  }
  notes_text: string
}

export function transformFacility(row: EchoRow): FacilityUpsert {
  const lat = parseFloat(row.FAC_LAT)
  const lng = parseFloat(row.FAC_LONG)

  const programs: string[] = []
  if (row.AFS_IDS) programs.push('CAA (Air)')
  if (row.NPDES_IDS) programs.push('CWA (Water)')
  if (row.RCRA_IDS) programs.push('RCRA (Hazardous Waste)')

  const naics = [row.CAA_NAICS, row.CWA_NAICS, row.RCRA_NAICS].filter(Boolean).join(', ')
  const sics = [row.CAA_SICS, row.CWA_SICS, row.RCRA_SIC_CODES].filter(Boolean).join(', ')

  return {
    name: titleCase(row.FAC_NAME),
    status: 'unknown',
    confidence: 'low',
    location: {
      address: row.FAC_STREET ?? '',
      city: row.FAC_CITY ?? '',
      state: row.FAC_STATE ?? '',
      zip: row.FAC_ZIP ?? '',
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
      geocode_source: 'echo',
    },
    external_ids: {
      echo_registry_id: row.REGISTRY_ID,
    },
    notes_text: [
      `Imported from EPA ECHO Exporter (FRS Registry ID: ${row.REGISTRY_ID}).`,
      naics ? `NAICS: ${naics}` : '',
      sics ? `SIC: ${sics}` : '',
      programs.length ? `Regulatory programs: ${programs.join(', ')}` : '',
      row.FAC_INSPECTION_COUNT && row.FAC_INSPECTION_COUNT !== '0'
        ? `Inspections: ${row.FAC_INSPECTION_COUNT}`
        : '',
      row.FAC_FORMAL_ACTION_COUNT && row.FAC_FORMAL_ACTION_COUNT !== '0'
        ? `Enforcement actions: ${row.FAC_FORMAL_ACTION_COUNT}`
        : '',
      row.FAC_TOTAL_PENALTIES && row.FAC_TOTAL_PENALTIES !== '0'
        ? `Total penalties: $${row.FAC_TOTAL_PENALTIES}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

function titleCase(str: string): string {
  return (str ?? '')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}
