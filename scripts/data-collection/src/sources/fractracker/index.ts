import { getPayload } from 'payload'
import config from '../../../../../apps/cms/src/payload.config.js'
import { fetchFracTrackerRecords } from './api.js'
import { transformRecord, normalizeName } from './transform.js'

const isDryRun = process.argv.includes('--dry-run')

// Haversine distance in meters between two WGS84 points
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const PROXIMITY_THRESHOLD_M = 250

async function run() {
  const payload = await getPayload({ config })

  console.log(`FracTracker scraper — ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('Source: FracTracker Alliance / ArcGIS data_centers_v4_agol_all\n')

  console.log('Fetching FracTracker records for watershed states…')
  const rawRecords = await fetchFracTrackerRecords()
  console.log(`  ${rawRecords.length} records fetched`)

  // Load all existing facilities into memory for tiered dedup
  // Tier 1: fractracker_id exact match
  // Tier 2: coordinate proximity ≤250m (when both sides have lat/lng)
  // Tier 3: normalized name + city match (fallback)
  console.log('\nLoading existing facilities for dedup…')
  let existingPage = await payload.find({ collection: 'facilities', limit: 500, page: 1 })
  let allExisting = [...existingPage.docs]
  while (existingPage.hasNextPage) {
    existingPage = await payload.find({ collection: 'facilities', limit: 500, page: existingPage.nextPage! })
    allExisting.push(...existingPage.docs)
  }
  console.log(`  ${allExisting.length} existing facilities loaded\n`)

  // Build lookup maps
  const byFracktrackerId = new Map<string, (typeof allExisting)[0]>()
  const withCoords: { id: string | number; lat: number; lng: number; record: (typeof allExisting)[0] }[] = []
  const byNameCity = new Map<string, (typeof allExisting)[0]>()

  for (const f of allExisting) {
    const extIds = (f as any).external_ids
    if (extIds?.fractracker_id) byFracktrackerId.set(extIds.fractracker_id, f)
    const loc = (f as any).location
    // Only include in proximity search if coordinates are valid WGS84 (not Web Mercator leftovers)
    if (loc?.lat != null && loc?.lng != null && Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180) {
      withCoords.push({ id: f.id, lat: loc.lat, lng: loc.lng, record: f })
    }
    const nameKey = normalizeName((f as any).name ?? '')
    const cityKey = (loc?.city ?? '').toLowerCase().trim()
    if (nameKey && cityKey) byNameCity.set(`${nameKey}::${cityKey}`, f)
  }

  let dataSourceId: number | string | undefined
  if (!isDryRun) {
    const ds = await payload.create({
      collection: 'data-sources',
      data: {
        name: `FracTracker Alliance — ${new Date().toISOString().slice(0, 10)}`,
        source_type: 'ngo_database',
        url: 'https://experience.arcgis.com/experience/5a4d072ad01449bba5698a80103fb909',
        fetched_at: new Date().toISOString(),
        notes: 'U.S. Data Centers Tracker — ArcGIS layer data_centers_v4_agol_all, filtered to Chesapeake watershed states.',
      },
    })
    dataSourceId = ds.id
  }

  let created = 0
  let augmented = 0
  let skipped = 0
  let alreadyCurrent = 0
  const errors: string[] = []

  for (const raw of rawRecords) {
    try {
      const data = transformRecord(raw)
      const ftId = raw.facility_id ?? null

      // ── Tier 1: exact fractracker_id match ──────────────────────────────
      let matched = ftId ? byFracktrackerId.get(ftId) : undefined

      // ── Tier 2: coordinate proximity ────────────────────────────────────
      if (!matched && raw.lat != null && raw.long != null) {
        let closest: { dist: number; record: (typeof allExisting)[0] } | null = null
        for (const e of withCoords) {
          const dist = haversineMeters(raw.lat, raw.long, e.lat, e.lng)
          if (dist <= PROXIMITY_THRESHOLD_M && (closest === null || dist < closest.dist)) {
            closest = { dist, record: e.record }
          }
        }
        if (closest) matched = closest.record
      }

      // ── Tier 3: normalized name + city ──────────────────────────────────
      if (!matched) {
        const nameKey = normalizeName(data.name)
        const cityKey = (data.location.city ?? '').toLowerCase().trim()
        if (nameKey && cityKey) matched = byNameCity.get(`${nameKey}::${cityKey}`)
      }

      if (matched) {
        if ((matched as any).review_status === 'excluded') { skipped++; continue }

        if (isDryRun) {
          console.log(
            `  [DRY] AUGMENT  ${data.name} — ${data.location.city}, ${data.location.state}` +
            ` (matched: ${(matched as any).name})`,
          )
          augmented++
          continue
        }

        // Augment: only fill in fields that are currently absent — never overwrite editorial data
        const existing = matched as any
        const existingCap = existing.capacity ?? {}
        const existingLoc = existing.location ?? {}

        const patch: Record<string, any> = {}

        // Coordinates: fill if missing or corrupted (Web Mercator values have |lat| > 90)
        const coordsCorrupted = existingLoc.lat != null && Math.abs(existingLoc.lat) > 90
        if ((existingLoc.lat == null || coordsCorrupted) && data.location.lat != null) {
          patch.location = {
            ...existingLoc,
            lat: data.location.lat,
            lng: data.location.lng,
            geocode_source: 'geocoded',
          }
        }
        // County: fill if missing
        if (!existingLoc.county && data.location.county) {
          patch.location = { ...(patch.location ?? existingLoc), county: data.location.county }
        }
        // Power capacity: fill if missing
        if (existingCap.power_capacity_mw == null && data.capacity.power_capacity_mw != null) {
          patch.capacity = { ...existingCap, power_capacity_mw: data.capacity.power_capacity_mw }
        }
        // Building sqft: fill if missing
        if (existingCap.building_sqft == null && data.capacity.facility_size_sqft != null) {
          patch.capacity = { ...(patch.capacity ?? existingCap), building_sqft: data.capacity.facility_size_sqft }
        }
        // Site area: fill if missing
        if (existingCap.site_area_acres == null && data.capacity.site_area_acres != null) {
          patch.capacity = { ...(patch.capacity ?? existingCap), site_area_acres: data.capacity.site_area_acres }
        }
        // Cooling type: fill if missing
        if (!existingCap.cooling_type && data.capacity.cooling_type) {
          patch.capacity = { ...(patch.capacity ?? existingCap), cooling_type: data.capacity.cooling_type }
        }

        // Always stamp the fractracker_id for faster future re-runs
        if (ftId && !(existing.external_ids?.fractracker_id)) {
          patch.external_ids = { ...(existing.external_ids ?? {}), fractracker_id: ftId }
        }
        // Write scraper_notes if not already set
        if (!existing.scraper_notes && data.scraper_notes) {
          patch.scraper_notes = data.scraper_notes
        }

        if (Object.keys(patch).length > 0) {
          // Only append data_sources when we're actually writing other changes
          if (dataSourceId) patch.data_sources = [...(existing.data_sources ?? []), dataSourceId]
          await payload.update({ collection: 'facilities', id: matched.id, data: patch })
          augmented++
        } else {
          alreadyCurrent++
        }
      } else {
        // ── New record ───────────────────────────────────────────────────
        if (isDryRun) {
          console.log(
            `  [DRY] CREATE   ${data.name} — ${data.location.city}, ${data.location.state}` +
            ` (${raw.status}, ${raw.location_confidence} confidence)`,
          )
          created++
          continue
        }

        await payload.create({
          collection: 'facilities',
          data: {
            name: data.name,
            status: data.status,
            confidence: data.confidence,
            review_status: 'pending',
            location: data.location,
            capacity: data.capacity,
            timeline: data.timeline,
            external_ids: data.external_ids,
            ...(data.scraper_notes ? { scraper_notes: data.scraper_notes } : {}),
            ...(dataSourceId ? { data_sources: [dataSourceId] } : {}),
          },
        })
        created++
      }
    } catch (err) {
      const msg = `  ✗ Error on ${raw.facility_name} (${raw.facility_id}): ${err}`
      console.error(msg)
      errors.push(msg)
    }
  }

  console.log('\n── Summary ──────────────────────────')
  if (isDryRun) {
    console.log(`  Would create  : ${created}`)
    console.log(`  Would augment : ${augmented}`)
  } else {
    console.log(`  Created       : ${created}`)
    console.log(`  Augmented     : ${augmented}`)
    console.log(`  Already current: ${alreadyCurrent}`)
    console.log(`  Skipped (excl): ${skipped}`)
  }
  if (errors.length) {
    console.log(`  Errors        : ${errors.length}`)
    errors.forEach(e => console.log(`    ${e}`))
  }
  console.log('─────────────────────────────────────')

  process.exit(errors.length > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
