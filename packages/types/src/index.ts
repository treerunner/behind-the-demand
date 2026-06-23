export type FacilityStatus =
  | 'proposed'
  | 'permitted'
  | 'under_construction'
  | 'operational'
  | 'decommissioned'
  | 'cancelled'
  | 'unknown'

export type WatershedState = 'MD' | 'VA' | 'PA' | 'DE' | 'WV' | 'NY' | 'DC'

export type WatershedSubbasin =
  | 'potomac'
  | 'susquehanna'
  | 'patuxent'
  | 'rappahannock'
  | 'york'
  | 'james'
  | 'eastern_shore'
  | 'patapsco_back'
  | 'other'

export type OrgType =
  | 'hyperscaler'
  | 'colo_reit'
  | 'colo_private'
  | 'enterprise'
  | 'private_equity'
  | 'holding_company'
  | 'shell_llc'
  | 'developer'
  | 'utility'
  | 'other'

export type OrgRole =
  | 'operator'
  | 'owner'
  | 'tenant'
  | 'permit_applicant'
  | 'developer'
  | 'registered_agent'

export type PermitType =
  | 'air_quality'
  | 'water_withdrawal'
  | 'generator'
  | 'stormwater'
  | 'zoning'
  | 'building'
  | 'wetlands'
  | 'combined'
  | 'other'

export type PermitStatus =
  | 'applied'
  | 'pending'
  | 'approved'
  | 'denied'
  | 'withdrawn'
  | 'expired'
  | 'active'
  | 'revoked'

export type LegislationStatus =
  | 'proposed'
  | 'introduced'
  | 'committee'
  | 'passed'
  | 'enacted'
  | 'failed'
  | 'vetoed'
  | 'repealed'
  | 'active'

export type Sentiment = 'supportive' | 'opposed' | 'mixed' | 'neutral'

// Lightweight summary types for API responses (not full Payload documents)
export interface FacilitySummary {
  id: string
  name: string
  slug: string
  status: FacilityStatus
  state: WatershedState
  county: string
  lat?: number
  lng?: number
  watershed_verified: boolean
  watershed_subbasin?: WatershedSubbasin
  power_capacity_mw?: number
  water_usage_mgd?: number
}

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  type: OrgType
  ticker?: string
  ultimate_parent?: { id: string; name: string }
}
