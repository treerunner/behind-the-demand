import { getPayload } from 'payload'
import config from '../../../../../apps/cms/src/payload.config.js'
import { lookupWatershed } from './api.js'
import { isChesapeakeBayWatershed, classifySubbasin } from './classify.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const isDryRun = process.argv.includes('--dry-run')

async function run() {
  const payload = await getPayload({ config })

  console.log(`Watershed verification — ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('Source: USGS Watershed Boundary Dataset (WBD) REST API\n')

  // Load all facilities that have coordinates but haven't been verified yet
  let page = 1
  let allFacilities: any[] = []
  while (true) {
    const result = await payload.find({
      collection: 'facilities',
      where: {
        and: [
          { 'location.lat': { exists: true } },
          { 'location.lng': { exists: true } },
          { 'watershed.verified': { equals: false } },
        ],
      },
      limit: 500,
      page,
    })
    allFacilities.push(...result.docs)
    if (!result.hasNextPage) break
    page++
  }

  console.log(`${allFacilities.length} facilities with coordinates to verify\n`)

  let verified = 0
  let outsideWatershed = 0
  let failed = 0
  const verifiedDate = new Date().toISOString().slice(0, 10)

  for (const facility of allFacilities) {
    const lat = facility.location?.lat
    const lng = facility.location?.lng
    const name = facility.name ?? '(unnamed)'

    if (lat == null || lng == null) continue

    // Skip Web Mercator coordinates (stored erroneously before outSR fix)
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      console.warn(`  ⚠ Skipping ${name} — coordinates look like Web Mercator (${lat}, ${lng})`)
      failed++
      continue
    }

    await sleep(500)

    let result: Awaited<ReturnType<typeof lookupWatershed>>
    try {
      result = await lookupWatershed(lat, lng)
    } catch (err) {
      console.error(`  ✗ USGS lookup failed for ${name}: ${err}`)
      failed++
      continue
    }

    if (!result) {
      console.error(`  ✗ No watershed found for ${name} (${lat}, ${lng})`)
      failed++
      continue
    }

    const inWatershed = isChesapeakeBayWatershed(result.huc12)
    const subbasin = inWatershed ? classifySubbasin(result.huc12, result.huc8Name) : null

    if (isDryRun) {
      const status = inWatershed ? '✓ IN watershed' : '✗ OUTSIDE watershed'
      console.log(
        `  ${status} | ${name} (${facility.location?.city}, ${facility.location?.state})` +
        ` | HUC-12: ${result.huc12} "${result.huc12Name}"` +
        (subbasin ? ` | subbasin: ${subbasin}` : ''),
      )
      if (inWatershed) verified++
      else outsideWatershed++
      continue
    }

    if (inWatershed) {
      await payload.update({
        collection: 'facilities',
        id: facility.id,
        data: {
          watershed: {
            ...facility.watershed,
            verified: true,
            verified_date: verifiedDate,
            huc12: result.huc12,
            ...(subbasin ? { subbasin } : {}),
          },
        },
      })
      verified++
    } else {
      // Leave watershed.verified = false; don't overwrite what editors may set
      console.log(`  ✗ Outside watershed: ${name} (${facility.location?.city}, ${facility.location?.state}) — HUC-12 ${result.huc12}`)
      outsideWatershed++
    }
  }

  console.log('\n── Summary ──────────────────────────')
  console.log(`  Verified (in watershed)   : ${verified}`)
  console.log(`  Outside watershed         : ${outsideWatershed}`)
  console.log(`  USGS lookup failures      : ${failed}`)
  console.log('─────────────────────────────────────')

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
