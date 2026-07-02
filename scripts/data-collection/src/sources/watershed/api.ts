const WBD = 'https://hydro.nationalmap.gov/arcgis/rest/services/wbd/MapServer'
const HEADERS = { 'User-Agent': 'BehindTheDemand kel723@lehigh.edu' }

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function queryLayer(layer: number, lat: number, lng: number, fields: string): Promise<Record<string, any> | null> {
  await sleep(150)
  const params = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: fields,
    returnGeometry: 'false',
    f: 'json',
  })
  const res = await fetch(`${WBD}/${layer}/query?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`USGS WBD layer ${layer}: ${res.status} ${res.statusText}`)
  const data = await res.json()
  return data.features?.[0]?.attributes ?? null
}

export interface WatershedResult {
  huc12: string
  huc12Name: string
  huc8Name: string
}

// Retry once on transient USGS failures (rate limit, timeout)
async function queryWithRetry(layer: number, lat: number, lng: number, fields: string): Promise<Record<string, any> | null> {
  try {
    return await queryLayer(layer, lat, lng, fields)
  } catch {
    await sleep(2000)
    return queryLayer(layer, lat, lng, fields).catch(() => null)
  }
}

export async function lookupWatershed(lat: number, lng: number): Promise<WatershedResult | null> {
  // Sequential calls — USGS public API is rate-sensitive under concurrent load
  const huc12Row = await queryWithRetry(6, lat, lng, 'huc12,name')
  if (!huc12Row) return null
  const huc8Row = await queryWithRetry(4, lat, lng, 'huc8,name')
  return {
    huc12: huc12Row.huc12 as string,
    huc12Name: huc12Row.name as string,
    huc8Name: huc8Row?.name ?? '',
  }
}
