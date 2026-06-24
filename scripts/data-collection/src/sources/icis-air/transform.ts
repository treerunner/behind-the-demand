import type { IcisAirRow } from './reader.js'

export interface IcisAirFacilityData {
  name: string
  status: 'proposed' | 'under_construction' | 'operational' | 'unknown'
  confidence: 'low'
  location: {
    address: string
    city: string
    county: string
    state: string
    zip: string
    geocode_source: 'pending'
  }
  external_ids: {
    echo_registry_id?: string
    icis_air_pgm_sys_id: string
  }
  notes_text: string
}

const STATUS_MAP: Record<string, IcisAirFacilityData['status']> = {
  PLN: 'proposed',
  CNS: 'under_construction',
  OPR: 'operational',
}

export function transformFacility(row: IcisAirRow): IcisAirFacilityData {
  const parts: string[] = [
    `Imported from EPA ICIS-Air (PGM_SYS_ID: ${row.PGM_SYS_ID}).`,
    `Air operating status: ${row.AIR_OPERATING_STATUS_DESC || row.AIR_OPERATING_STATUS_CODE}`,
  ]
  if (row.NAICS_CODES) parts.push(`NAICS: ${row.NAICS_CODES}`)
  if (row.SIC_CODES) parts.push(`SIC: ${row.SIC_CODES}`)
  if (row.AIR_POLLUTANT_CLASS_DESC) parts.push(`Air pollutant class: ${row.AIR_POLLUTANT_CLASS_DESC}`)
  if (row.AIR_LOCAL_CONTROL_REGION_NAME) parts.push(`Air control region: ${row.AIR_LOCAL_CONTROL_REGION_NAME}`)
  if (row.CURRENT_HPV === 'Y') parts.push('High Priority Violator (HPV) flag set.')

  return {
    name: titleCase(row.FACILITY_NAME),
    status: STATUS_MAP[row.AIR_OPERATING_STATUS_CODE] ?? 'unknown',
    confidence: 'low',
    location: {
      address: row.STREET_ADDRESS ?? '',
      city: row.CITY ?? '',
      county: row.COUNTY_NAME ?? '',
      state: row.STATE ?? '',
      zip: row.ZIP_CODE ?? '',
      geocode_source: 'pending',
    },
    external_ids: {
      ...(row.REGISTRY_ID ? { echo_registry_id: row.REGISTRY_ID } : {}),
      icis_air_pgm_sys_id: row.PGM_SYS_ID,
    },
    notes_text: parts.join('\n'),
  }
}

function titleCase(str: string): string {
  return (str ?? '')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}
