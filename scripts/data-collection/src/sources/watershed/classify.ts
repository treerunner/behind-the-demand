// HUC-4 codes that drain to the Chesapeake Bay:
//   0205 = Susquehanna   0206 = Upper Chesapeake
//   0207 = Potomac       0208 = Lower Chesapeake
// Anything else in the Mid-Atlantic region (02xx) drains to the Delaware Bay, Hudson, or Atlantic.
const CHESAPEAKE_HUC4 = new Set(['0205', '0206', '0207', '0208'])

export function isChesapeakeBayWatershed(huc12: string): boolean {
  return CHESAPEAKE_HUC4.has(huc12.slice(0, 4))
}

// Map HUC-8 name + HUC-4 prefix to our subbasin schema values.
// HUC-4 uniquely identifies Susquehanna and Potomac; HUC-8 name disambiguates
// Upper Chesapeake (0206) and Lower Chesapeake (0208).
export function classifySubbasin(huc12: string, huc8Name: string): string {
  const huc4 = huc12.slice(0, 4)
  if (huc4 === '0205') return 'susquehanna'
  if (huc4 === '0207') return 'potomac'

  const n = huc8Name.toLowerCase()

  if (huc4 === '0206') {
    if (n.includes('patuxent')) return 'patuxent'
    if (/patapsco|gunpowder|back river|severn|magothy/.test(n)) return 'patapsco_back'
    if (/choptank|chester|sassafras|elk|nanticoke|wicomico|pocomoke|eastern shore/.test(n)) return 'eastern_shore'
    return 'other'
  }

  if (huc4 === '0208') {
    if (n.includes('rappahannock')) return 'rappahannock'
    if (n.includes('james')) return 'james'
    if (n.includes('york')) return 'york'
    return 'other'
  }

  return 'other'
}
