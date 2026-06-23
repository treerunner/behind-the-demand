import { PUBLIC_CMS_URL } from '$env/static/public'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch(`${PUBLIC_CMS_URL}/api/facilities?limit=0`)
  const data = await res.json()
  return {
    facilityCount: data.totalDocs ?? 0,
  }
}
