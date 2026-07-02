import type { FracTrackerRecord } from './api.js'

const STATUS_MAP: Record<string, string> = {
  'operating': 'operational',
  'operational': 'operational',
  'expanding': 'operational',
  'proposed': 'proposed',
  'under construction': 'under_construction',
  'approved/permitted/under construction': 'under_construction',
  'cancelled': 'cancelled',
  'suspended': 'cancelled',
  'decommissioned': 'decommissioned',
}

const CONFIDENCE_MAP: Record<string, string> = {
  'High': 'high',
  'Medium': 'medium',
  'Low': 'low',
}

const COOLING_MAP: Record<string, string> = {
  'Air': 'air',
  'Air-cooled': 'air',
  'Water': 'water',
  'Water-cooled': 'water',
  'Hybrid': 'hybrid',
}

export interface FracTrackerTransformed {
  name: string
  status: string
  confidence: string
  location: {
    address: string | null
    city: string | null
    county: string | null
    state: string | null
    zip: string | null
    lat: number | null
    lng: number | null
    geocode_source: string
  }
  capacity: {
    power_capacity_mw: number | null
    cooling_type: string | null
    building_sqft: number | null
    site_area_acres: number | null
  }
  timeline: {
    expected_online_date: string | null
  }
  external_ids: {
    fractracker_id: string | null
  }
  scraper_notes: string | null
}

function parseExpectedDate(raw: string | null): string | null {
  if (!raw || raw.trim() === '') return null
  const year = raw.trim().match(/^\d{4}/)
  if (year) return `${year[0]}-01-01T00:00:00.000Z`
  // Already an ISO date
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

export function transformRecord(r: FracTrackerRecord): FracTrackerTransformed {
  const statusKey = (r.status ?? '').toLowerCase()
  const status = STATUS_MAP[statusKey] ?? 'unknown'
  const confidence = CONFIDENCE_MAP[r.location_confidence ?? ''] ?? 'low'
  const coolingKey = r.cooling_type ?? ''
  const cooling_type = COOLING_MAP[coolingKey] ?? null

  const hasCoords = r.lat != null && r.long != null
  const geocode_source = hasCoords ? 'geocoded' : 'pending'

  const acresRaw = parseFloat(r.property_size_acres ?? '')
  const site_area_acres = isNaN(acresRaw) ? null : acresRaw

  const noteParts: string[] = []
  if (r.operator_name) noteParts.push(`Operator: ${r.operator_name.trim()}`)
  if (r.tenant) noteParts.push(`Tenant: ${r.tenant.trim()}`)
  if (r.information_source) noteParts.push(`Source: ${r.information_source.trim()}`)
  const scraper_notes = noteParts.length > 0 ? noteParts.join('\n') : null

  return {
    name: (r.facility_name ?? 'Unknown').trim(),
    status,
    confidence,
    location: {
      address: r.address?.trim() || null,
      city: r.city?.trim() || null,
      county: r.county?.trim() || null,
      state: r.state?.trim() || null,
      zip: r.zip?.trim() || null,
      lat: r.lat,
      lng: r.long,
      geocode_source,
    },
    capacity: {
      power_capacity_mw: r.mw_high ?? r.mw_low ?? null,
      cooling_type,
      building_sqft: r.facility_size_sqft ?? null,
      site_area_acres,
    },
    timeline: {
      // FracTracker stores year-only strings ("2026") — convert to Jan 1 of that year or null
      expected_online_date: parseExpectedDate(r.expected_date_online),
    },
    external_ids: {
      fractracker_id: r.facility_id ?? null,
    },
    scraper_notes,
  }
}

// Normalize a facility name for fuzzy matching — strips legal suffixes, punctuation, spacing
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|corporation|co|ltd|lp|plc)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()
}
