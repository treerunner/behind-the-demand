import type { EchoFacility } from './api.js'

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
  notes_text: string // stored separately, used to build richText
}

export function transformFacility(f: EchoFacility): FacilityUpsert {
  const lat = parseFloat(f.Latitude83)
  const lng = parseFloat(f.Longitude83)

  const programs: string[] = []
  if (f.AIRIDs) programs.push('CAA (Air)')
  if (f.CWAIDs) programs.push('CWA (Water)')
  if (f.RCRAIDs) programs.push('RCRA (Hazardous Waste)')

  return {
    name: titleCase(f.FacilityName),
    status: 'unknown',
    confidence: 'low',
    location: {
      address: f.LocationAddress ?? '',
      city: f.City ?? '',
      state: f.StateName ?? '',
      zip: f.Zip ?? '',
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
      geocode_source: 'echo',
    },
    external_ids: {
      echo_registry_id: f.RegistryId,
    },
    notes_text: [
      `Imported from EPA ECHO (FRS Registry ID: ${f.RegistryId}).`,
      `NAICS: ${f.NAICSCodes || 'N/A'} | SIC: ${f.SICCodes || 'N/A'}`,
      programs.length ? `Regulatory programs: ${programs.join(', ')}` : '',
      f.TotalInspectionCount !== '0' ? `Inspections: ${f.TotalInspectionCount}` : '',
      f.TotalEnforcementCount !== '0' ? `Enforcement actions: ${f.TotalEnforcementCount}` : '',
      f.TotalPenaltyAmt !== '0.00' ? `Total penalties: $${f.TotalPenaltyAmt}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}
