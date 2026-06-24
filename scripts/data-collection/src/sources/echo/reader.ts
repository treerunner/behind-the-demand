import { createReadStream } from 'fs'
import { parse } from 'csv-parse'

// Columns we actually use from the ECHO Exporter CSV
export interface EchoRow {
  REGISTRY_ID: string
  FAC_NAME: string
  FAC_STREET: string
  FAC_CITY: string
  FAC_STATE: string
  FAC_ZIP: string
  FAC_LAT: string
  FAC_LONG: string
  FAC_ACTIVE_FLAG: string
  FAC_CHESAPEAKE_BAY_FLG: string
  AFS_IDS: string
  NPDES_IDS: string
  RCRA_IDS: string
  CAA_NAICS: string
  CWA_NAICS: string
  RCRA_NAICS: string
  CAA_SICS: string
  CWA_SICS: string
  RCRA_SIC_CODES: string
  FAC_INSPECTION_COUNT: string
  FAC_FORMAL_ACTION_COUNT: string
  FAC_TOTAL_PENALTIES: string
}

const NAICS = '518210'
const SIC = '7374'

function isDataCenter(row: EchoRow): boolean {
  const naicsFields = [row.CAA_NAICS, row.CWA_NAICS, row.RCRA_NAICS]
  const sicFields = [row.CAA_SICS, row.CWA_SICS, row.RCRA_SIC_CODES]
  return (
    naicsFields.some(f => f?.includes(NAICS)) || sicFields.some(f => f?.includes(SIC))
  )
}

export async function readChesapeakeDataCenters(csvPath: string): Promise<EchoRow[]> {
  const results: EchoRow[] = []

  await new Promise<void>((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_column_count: true }))
      .on('data', (row: EchoRow) => {
        if (row.FAC_CHESAPEAKE_BAY_FLG === 'Y' && isDataCenter(row)) {
          results.push(row)
        }
      })
      .on('end', resolve)
      .on('error', reject)
  })

  return results
}
