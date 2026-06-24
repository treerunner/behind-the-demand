import { getPayload } from 'payload'
import config from '../../../../../apps/cms/src/payload.config.js'
import { readProposedDataCenters } from './reader.js'
import { transformFacility } from './transform.js'

const isDryRun = process.argv.includes('--dry-run')

async function run() {
  const csvPath = process.env.ICIS_AIR_CSV_PATH
  if (!csvPath) {
    console.error(
      'ICIS_AIR_CSV_PATH is not set.\n' +
        'Download the ICIS-Air dataset and set ICIS_AIR_CSV_PATH to the extracted facilities CSV:\n' +
        '  curl -L -o /tmp/icis_air.zip https://echo.epa.gov/files/echodownloads/ICIS-AIR_downloads.zip\n' +
        '  unzip -d /tmp/icis_air_data /tmp/icis_air.zip\n' +
        '  export ICIS_AIR_CSV_PATH=/tmp/icis_air_data/ICIS_AIR_FACILITIES.csv',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config })

  console.log(`EPA ICIS-Air scraper — ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Source: ${csvPath}\n`)
  console.log('Reading CSV — filtering watershed states, PLN/CNS status, NAICS 518210 / SIC 7374…')

  const facilities = await readProposedDataCenters(csvPath)
  console.log(`  Found ${facilities.length} matching facilities\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  let dataSourceId: number | string | undefined

  if (!isDryRun) {
    const ds = await payload.create({
      collection: 'data-sources',
      data: {
        name: `EPA ICIS-Air — ${new Date().toISOString().slice(0, 10)}`,
        source_type: 'public_record',
        url: 'https://echo.epa.gov/files/echodownloads/ICIS-AIR_downloads.zip',
        fetched_at: new Date().toISOString(),
        notes: `Proposed/under-construction data centers in Chesapeake watershed states (PLN/CNS status, NAICS 518210 / SIC 7374)`,
      },
    })
    dataSourceId = ds.id
  }

  for (const raw of facilities) {
    try {
      const data = transformFacility(raw)

      if (isDryRun) {
        console.log(
          `  [DRY] ${data.name} — ${data.location.city}, ${data.location.state}` +
            ` (${data.status}) [PGM: ${raw.PGM_SYS_ID}]`,
        )
        skipped++
        continue
      }

      // Dedup: try registry ID first (shared with ECHO Exporter), then ICIS-Air PGM_SYS_ID
      let existing = raw.REGISTRY_ID
        ? await payload.find({
            collection: 'facilities',
            where: { 'external_ids.echo_registry_id': { equals: raw.REGISTRY_ID } },
            limit: 1,
          })
        : { totalDocs: 0, docs: [] }

      if (existing.totalDocs === 0) {
        existing = await payload.find({
          collection: 'facilities',
          where: { 'external_ids.icis_air_pgm_sys_id': { equals: raw.PGM_SYS_ID } },
          limit: 1,
        })
      }

      if (existing.totalDocs > 0) {
        const record = existing.docs[0]

        if ((record as any).review_status === 'excluded') {
          skipped++
          continue
        }

        // Preserve human-reviewed fields; only refresh EPA-sourced data
        await payload.update({
          collection: 'facilities',
          id: record.id,
          data: {
            name: data.name,
            location: data.location,
            external_ids: {
              ...(record as any).external_ids,
              ...data.external_ids,
            },
            ...(dataSourceId ? { data_sources: [dataSourceId] } : {}),
          },
        })
        updated++
      } else {
        await payload.create({
          collection: 'facilities',
          data: {
            name: data.name,
            status: data.status,
            confidence: data.confidence,
            review_status: 'pending',
            location: data.location,
            external_ids: data.external_ids,
            ...(dataSourceId ? { data_sources: [dataSourceId] } : {}),
          },
        })
        created++
      }
    } catch (err) {
      const msg = `  ✗ Error on ${raw.FACILITY_NAME} (${raw.PGM_SYS_ID}): ${err}`
      console.error(msg)
      errors.push(msg)
    }
  }

  console.log('\n── Summary ──────────────────────────')
  console.log(`  Created : ${created}`)
  console.log(`  Updated : ${updated}`)
  console.log(isDryRun ? `  Would write: ${skipped}` : `  Skipped (excluded): ${skipped}`)
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
