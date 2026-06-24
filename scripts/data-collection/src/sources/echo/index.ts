import { getPayload } from 'payload'
import config from '../../../../../apps/cms/src/payload.config.js'
import { WATERSHED_STATES, fetchAllFacilitiesForState } from './api.js'
import { transformFacility } from './transform.js'

const isDryRun = process.argv.includes('--dry-run')

async function run() {
  const payload = await getPayload({ config })

  console.log(`EPA ECHO scraper — ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`States: ${WATERSHED_STATES.join(', ')}\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  // Create a DataSource record for this run
  let dataSourceId: string | undefined

  if (!isDryRun) {
    const ds = await payload.create({
      collection: 'data-sources',
      data: {
        name: `EPA ECHO — ${new Date().toISOString().slice(0, 10)}`,
        source_type: 'api',
        url: 'https://echo.epa.gov/rest-services/air_facilities/search',
        fetched_at: new Date().toISOString(),
        notes: `Watershed states: ${WATERSHED_STATES.join(', ')} | NAICS 518210 + SIC 7374`,
      },
    })
    dataSourceId = String(ds.id)
  }

  for (const state of WATERSHED_STATES) {
    console.log(`→ Fetching ${state}...`)

    let facilities
    try {
      facilities = await fetchAllFacilitiesForState(state)
    } catch (err) {
      const msg = `  ✗ Failed to fetch ${state}: ${err}`
      console.error(msg)
      errors.push(msg)
      continue
    }

    console.log(`  ${facilities.length} facilities returned`)

    for (const raw of facilities) {
      try {
        const data = transformFacility(raw)

        if (isDryRun) {
          console.log(`  [DRY] ${data.name} — ${data.location.city}, ${data.location.state} (${raw.RegistryId})`)
          skipped++
          continue
        }

        // Check if facility already exists by ECHO registry ID
        const existing = await payload.find({
          collection: 'facilities',
          where: { 'external_ids.echo_registry_id': { equals: raw.RegistryId } },
          limit: 1,
        })

        const facilityData = {
          name: data.name,
          status: data.status,
          confidence: data.confidence,
          location: data.location,
          external_ids: data.external_ids,
          ...(dataSourceId ? { data_sources: [dataSourceId] } : {}),
        }

        if (existing.totalDocs > 0) {
          await payload.update({
            collection: 'facilities',
            id: existing.docs[0].id,
            data: facilityData,
          })
          updated++
        } else {
          await payload.create({
            collection: 'facilities',
            data: facilityData,
          })
          created++
        }
      } catch (err) {
        const msg = `  ✗ Error on ${raw.FacilityName} (${raw.RegistryId}): ${err}`
        console.error(msg)
        errors.push(msg)
      }
    }
  }

  console.log('\n── Summary ──────────────────────────')
  console.log(`  Created : ${created}`)
  console.log(`  Updated : ${updated}`)
  console.log(isDryRun ? `  Would write: ${skipped}` : `  Skipped: ${skipped}`)
  if (errors.length) {
    console.log(`  Errors  : ${errors.length}`)
    errors.forEach(e => console.log(`    ${e}`))
  }
  console.log('─────────────────────────────────────')

  process.exit(errors.length > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
