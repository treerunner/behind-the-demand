import { getPayload } from 'payload'
import config from '../../../../../apps/cms/src/payload.config.js'
import { fetchEdgarLeads } from './reader.js'
import { transformLead } from './transform.js'

const isDryRun = process.argv.includes('--dry-run')

async function run() {
  const payload = await getPayload({ config })

  console.log(`SEC EDGAR scraper — ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Lookback: ${process.env.EDGAR_LOOKBACK_MONTHS ?? '12'} months\n`)
  console.log('Searching EDGAR for 8-K filings mentioning data centers in watershed states…\n')

  const leads = await fetchEdgarLeads()
  console.log(`\nFound ${leads.length} unique filing leads across all states\n`)

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []
  let dataSourceId: number | string | undefined

  if (!isDryRun) {
    const ds = await payload.create({
      collection: 'data-sources',
      data: {
        name: `SEC EDGAR 8-K scan — ${new Date().toISOString().slice(0, 10)}`,
        source_type: 'public_record',
        url: 'https://efts.sec.gov/LATEST/search-index',
        fetched_at: new Date().toISOString(),
        notes: `8-K filings from Amazon, Microsoft, Alphabet, Equinix, Digital Realty, Iron Mountain, Meta, Apple mentioning data centers in Chesapeake watershed states.`,
      },
    })
    dataSourceId = ds.id
  }

  for (const lead of leads) {
    try {
      const data = transformLead(lead)

      if (isDryRun) {
        console.log(`  [DRY] ${data.name}`)
        console.log(`        Filed: ${lead.filingDate} | ${lead.documentUrl}`)
        console.log(`        Excerpt: ${lead.excerpt.slice(0, 120)}…\n`)
        skipped++
        continue
      }

      const existing = await payload.find({
        collection: 'facilities',
        where: { 'external_ids.sec_edgar_id': { equals: lead.edgarId } },
        limit: 1,
      })

      if (existing.totalDocs > 0) {
        const record = existing.docs[0]

        if ((record as any).review_status === 'excluded') {
          skipped++
          continue
        }

        // Preserve any human-edited fields; only refresh source metadata
        await payload.update({
          collection: 'facilities',
          id: record.id,
          data: {
            external_ids: {
              ...(record as any).external_ids,
              sec_edgar_id: lead.edgarId,
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
            review_status: data.review_status,
            location: data.location,
            external_ids: data.external_ids,
            ...(dataSourceId ? { data_sources: [dataSourceId] } : {}),
          },
        })
        created++
      }
    } catch (err) {
      const msg = `  ✗ Error on ${lead.edgarId}: ${err}`
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
