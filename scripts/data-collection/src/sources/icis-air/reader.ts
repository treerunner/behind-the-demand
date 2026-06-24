import { createReadStream } from 'fs'
import { parse } from 'csv-parse'

export interface IcisAirRow {
  PGM_SYS_ID: string
  REGISTRY_ID: string
  FACILITY_NAME: string
  STREET_ADDRESS: string
  CITY: string
  COUNTY_NAME: string
  STATE: string
  ZIP_CODE: string
  EPA_REGION: string
  SIC_CODES: string
  NAICS_CODES: string
  FACILITY_TYPE_CODE: string
  AIR_POLLUTANT_CLASS_CODE: string
  AIR_POLLUTANT_CLASS_DESC: string
  AIR_OPERATING_STATUS_CODE: string
  AIR_OPERATING_STATUS_DESC: string
  CURRENT_HPV: string
  AIR_LOCAL_CONTROL_REGION_CODE: string
  AIR_LOCAL_CONTROL_REGION_NAME: string
}

const NAICS = '518210'
const SIC = '7374'

// All states with land draining to the Chesapeake Bay
const WATERSHED_STATES = new Set(['VA', 'MD', 'PA', 'DE', 'WV', 'NY', 'DC'])

// Statuses that represent proposed or under-construction facilities
// OPR is omitted — those should already be in ECHO Exporter
const TARGET_STATUSES = new Set(['PLN', 'CNS'])

function isDataCenter(row: IcisAirRow): boolean {
  return row.NAICS_CODES?.includes(NAICS) || row.SIC_CODES?.includes(SIC)
}

export async function readProposedDataCenters(csvPath: string): Promise<IcisAirRow[]> {
  const results: IcisAirRow[] = []

  await new Promise<void>((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }))
      .on('data', (row: IcisAirRow) => {
        if (
          WATERSHED_STATES.has(row.STATE) &&
          TARGET_STATUSES.has(row.AIR_OPERATING_STATUS_CODE) &&
          isDataCenter(row)
        ) {
          results.push(row)
        }
      })
      .on('end', resolve)
      .on('error', reject)
  })

  return results
}
