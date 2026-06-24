import type { CollectionConfig } from 'payload'

export const Facilities: CollectionConfig = {
  slug: 'facilities',
  admin: {
    useAsTitle: 'name',
    group: 'Data Centers',
    defaultColumns: ['name', 'status', 'state', 'power_capacity_mw', 'watershed_verified'],
    description: 'Proposed and existing data centers within or near the Chesapeake watershed.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      options: [
        { label: 'Proposed', value: 'proposed' },
        { label: 'Permitted', value: 'permitted' },
        { label: 'Under Construction', value: 'under_construction' },
        { label: 'Operational', value: 'operational' },
        { label: 'Decommissioned', value: 'decommissioned' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Unknown', value: 'unknown' },
      ],
      admin: { position: 'sidebar' },
    },

    // Organizations with roles
    {
      name: 'organizations',
      type: 'array',
      label: 'Organizations',
      admin: { description: 'All entities connected to this facility, by role' },
      fields: [
        {
          name: 'organization',
          type: 'relationship',
          relationTo: 'organizations',
          required: true,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          options: [
            { label: 'Operator', value: 'operator' },
            { label: 'Owner (Real Estate)', value: 'owner' },
            { label: 'Tenant / Anchor Customer', value: 'tenant' },
            { label: 'Permit Applicant', value: 'permit_applicant' },
            { label: 'Developer / Builder', value: 'developer' },
            { label: 'Registered Agent', value: 'registered_agent' },
          ],
        },
        {
          name: 'since_date',
          type: 'date',
        },
        {
          name: 'notes',
          type: 'text',
        },
      ],
    },

    // Location
    {
      name: 'location',
      type: 'group',
      label: 'Location',
      fields: [
        {
          name: 'address',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'county',
          type: 'text',
        },
        {
          name: 'state',
          type: 'select',
          options: ['MD', 'VA', 'PA', 'DE', 'WV', 'NY', 'DC'],
        },
        {
          name: 'zip',
          type: 'text',
        },
        {
          name: 'lat',
          type: 'number',
          admin: { description: 'Decimal degrees (WGS84)' },
        },
        {
          name: 'lng',
          type: 'number',
          admin: { description: 'Decimal degrees (WGS84)' },
        },
        {
          name: 'geocode_source',
          type: 'select',
          options: [
            { label: 'Manual (from permit)', value: 'manual_permit' },
            { label: 'Manual (from deed/parcel)', value: 'manual_parcel' },
            { label: 'Geocoded from address', value: 'geocoded' },
            { label: 'Not yet geocoded', value: 'pending' },
          ],
          defaultValue: 'pending',
        },
      ],
    },

    // Watershed
    {
      name: 'watershed',
      type: 'group',
      label: 'Watershed',
      fields: [
        {
          name: 'verified',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Confirmed inside Chesapeake Bay watershed via PostGIS ST_Within check' },
        },
        {
          name: 'verified_date',
          type: 'date',
        },
        {
          name: 'subbasin',
          type: 'select',
          options: [
            { label: 'Potomac', value: 'potomac' },
            { label: 'Susquehanna', value: 'susquehanna' },
            { label: 'Patuxent', value: 'patuxent' },
            { label: 'Rappahannock', value: 'rappahannock' },
            { label: 'York', value: 'york' },
            { label: 'James', value: 'james' },
            { label: 'Eastern Shore', value: 'eastern_shore' },
            { label: 'Patapsco / Back', value: 'patapsco_back' },
            { label: 'Other', value: 'other' },
          ],
          admin: { description: 'Which tributary basin the facility falls within' },
        },
        {
          name: 'huc12',
          type: 'text',
          admin: { description: 'USGS 12-digit Hydrologic Unit Code' },
        },
      ],
    },

    // Physical capacity
    {
      name: 'capacity',
      type: 'group',
      label: 'Physical & Power Capacity',
      fields: [
        {
          name: 'site_area_acres',
          type: 'number',
        },
        {
          name: 'building_sqft',
          type: 'number',
          admin: { description: 'Total building square footage across all phases' },
        },
        {
          name: 'power_capacity_mw',
          type: 'number',
          admin: { description: 'Nameplate / proposed maximum capacity (MW)' },
        },
        {
          name: 'power_it_load_mw',
          type: 'number',
          admin: { description: 'IT load (MW) — subset of total capacity consumed by servers' },
        },
        {
          name: 'pue',
          type: 'number',
          admin: { description: 'Power Usage Effectiveness ratio (1.0 = perfect; typical is 1.2–1.6)' },
        },
        {
          name: 'cooling_type',
          type: 'select',
          options: [
            { label: 'Air-cooled', value: 'air' },
            { label: 'Water-cooled', value: 'water' },
            { label: 'Hybrid', value: 'hybrid' },
            { label: 'Unknown', value: 'unknown' },
          ],
        },
        {
          name: 'water_usage_mgd',
          type: 'number',
          admin: { description: 'Water consumption in million gallons per day (key watershed impact metric)' },
        },
        {
          name: 'water_source',
          type: 'text',
          admin: { description: 'e.g. "Loudoun Water", "Well #3", "Occoquan Reservoir"' },
        },
      ],
    },

    // Timeline
    {
      name: 'timeline',
      type: 'group',
      label: 'Timeline',
      fields: [
        { name: 'announced_date', type: 'date' },
        { name: 'permit_application_date', type: 'date' },
        { name: 'permit_approved_date', type: 'date' },
        { name: 'groundbreaking_date', type: 'date' },
        { name: 'expected_online_date', type: 'date' },
        { name: 'operational_date', type: 'date' },
        { name: 'decommission_date', type: 'date' },
      ],
    },

    // External source IDs — stable identifiers from upstream databases, used for idempotent upserts
    {
      name: 'external_ids',
      type: 'group',
      label: 'External IDs',
      admin: { description: 'Stable identifiers from upstream data sources. Used by collection scripts to upsert without creating duplicates.' },
      fields: [
        {
          name: 'echo_registry_id',
          type: 'text',
          index: true,
          admin: { description: 'EPA ECHO / FRS Registry ID' },
        },
        {
          name: 'pjm_queue_id',
          type: 'text',
          index: true,
          admin: { description: 'PJM Interconnection Queue project ID' },
        },
        {
          name: 'state_permit_id',
          type: 'text',
          admin: { description: 'State-level permit or facility ID (e.g. VA DEQ STARS #)' },
        },
      ],
    },

    // Provenance
    {
      name: 'data_sources',
      type: 'relationship',
      relationTo: 'data-sources',
      hasMany: true,
    },
    {
      name: 'last_verified',
      type: 'date',
      admin: { position: 'sidebar', description: 'Date this record was last reviewed for accuracy' },
    },
    {
      name: 'confidence',
      type: 'select',
      admin: { position: 'sidebar' },
      options: [
        { label: 'High — confirmed from permit or official source', value: 'high' },
        { label: 'Medium — corroborated from multiple secondary sources', value: 'medium' },
        { label: 'Low — single secondary source or inference', value: 'low' },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
    },
  ],
}
