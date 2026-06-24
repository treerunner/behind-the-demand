import { getPayload } from 'payload'
import config from '../../../../../apps/cms/src/payload.config.js'
import { readChesapeakeDataCenters } from './reader.js'
import { transformFacility } from './transform.js'

const isDryRun = process.argv.includes('--dry-run')

async function run() {
  const csvPath = process.env.ECHO_CSV_PATH
  if (!csvPath) {
    console.error(
      'ECHO_CSV_PATH is not set.\n' +
        'Download the ECHO Exporter and set ECHO_CSV_PATH to the extracted .csv path:\n' +
        '  curl -L -o /tmp/echo.zip https://echo.epa.gov/files/echodownloads/echo_exporter.zip\n' +
        '  unzip -d /tmp/echo_data /tmp/echo.zip\n' +
        '  export ECHO_CSV_PATH=/tmp/echo_data/ECHO_EXPORTER.csv',
    )
    process.exit(1)
  }

  const payload = await getPayload({ config })

  // Use ECHO_EMAIL from env, or fall back to the first admin user's email
  if (!process.env.ECHO_EMAIL) {
    const { docs } = await payload.find({ collection: 'users', limit: 1, sort: 'createdAt' })
    if (docs[0]?.email) {
      process.env.ECHO_EMAIL = docs[0].email
    }
  }

  console.log(`EPA ECHO scraper — ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Source: ${csvPath}\n`)

  console.log('Reading CSV and filtering Chesapeake Bay data centers…')
  const facilities = await readChesapeakeDataCenters(csvPath)
  console.log(`  Found ${facilities.length} matching facilities\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  let dataSourceId: string | undefined

  if (!isDryRun) {
    const ds = await payload.create({
      collection: 'data-sources',
      data: {
        name: `EPA ECHO Exporter — ${new Date().toISOString().slice(0, 10)}`,
        source_type: 'download',
        url: 'https://echo.epa.gov/files/echodownloads/echo_exporter.zip',
        fetched_at: new Date().toISOString(),
        notes: `Chesapeake Bay data centers (FAC_CHESAPEAKE_BAY_FLG=Y, NAICS 518210 / SIC 7374)`,
      },
    })
    dataSourceId = String(ds.id)
  }

  for (const raw of facilities) {
    try {
      const data = transformFacility(raw)

      if (isDryRun) {
        console.log(
          `  [DRY] ${data.name} — ${data.location.city}, ${data.location.state} (${raw.REGISTRY_ID})`,
        )
        skipped++
        continue
      }

      const existing = await payload.find({
        collection: 'facilities',
        where: { 'external_ids.echo_registry_id': { equals: raw.REGISTRY_ID } },
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
      const msg = `  ✗ Error on ${raw.FAC_NAME} (${raw.REGISTRY_ID}): ${err}`
      console.error(msg)
      errors.push(msg)
    }
  }

  console.log('\n── Summary ──────────────────────────')
  console.log(`  Created : ${created}`)
  console.log(`  Updated : ${updated}`)
  console.log(isDryRun ? `  Would write: ${skipped}` : `  Skipped : ${skipped}`)
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
