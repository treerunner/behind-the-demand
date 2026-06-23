import type { CollectionConfig } from 'payload'

export const Permits: CollectionConfig = {
  slug: 'permits',
  admin: {
    useAsTitle: 'permit_number',
    group: 'Data Centers',
    defaultColumns: ['facility', 'permit_type', 'status', 'issuing_agency', 'application_date'],
    description: 'Regulatory filings and permits tied to specific facilities.',
  },
  fields: [
    {
      name: 'facility',
      type: 'relationship',
      relationTo: 'facilities',
      required: true,
    },
    {
      name: 'permit_number',
      type: 'text',
      admin: { description: 'Official permit / docket / application number' },
    },
    {
      name: 'permit_type',
      type: 'select',
      required: true,
      options: [
        { label: 'Air Quality', value: 'air_quality' },
        { label: 'Water Withdrawal / NPDES', value: 'water_withdrawal' },
        { label: 'Generator / Backup Power', value: 'generator' },
        { label: 'Stormwater', value: 'stormwater' },
        { label: 'Zoning / Special Use', value: 'zoning' },
        { label: 'Building / Site Plan', value: 'building' },
        { label: 'Wetlands / 404', value: 'wetlands' },
        { label: 'Combined / Multi-media', value: 'combined' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'applied',
      options: [
        { label: 'Applied', value: 'applied' },
        { label: 'Pending Review', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Denied', value: 'denied' },
        { label: 'Withdrawn', value: 'withdrawn' },
        { label: 'Expired', value: 'expired' },
        { label: 'Active', value: 'active' },
        { label: 'Revoked', value: 'revoked' },
      ],
    },
    {
      name: 'issuing_agency',
      type: 'text',
      admin: { description: 'e.g. "Virginia DEQ", "Maryland MDE", "EPA Region 3"' },
    },
    {
      name: 'issuing_state',
      type: 'select',
      options: ['MD', 'VA', 'PA', 'DE', 'WV', 'NY', 'DC', 'Federal'],
    },
    {
      name: 'applicant_org',
      type: 'relationship',
      relationTo: 'organizations',
      admin: { description: 'The legal entity that submitted the application (often a shell LLC)' },
    },

    // Generator-specific fields (common for data centers)
    {
      name: 'generator_details',
      type: 'group',
      label: 'Generator Details',
      admin: {
        description: 'Fill in for generator / backup power permit applications',
        condition: (data) => data.permit_type === 'generator',
      },
      fields: [
        {
          name: 'unit_count',
          type: 'number',
          admin: { description: 'Number of generator units applied for' },
        },
        {
          name: 'unit_capacity_kw',
          type: 'number',
          admin: { description: 'Capacity per unit in kilowatts' },
        },
        {
          name: 'total_capacity_kw',
          type: 'number',
          admin: { description: 'Total generator capacity in kilowatts' },
        },
        {
          name: 'fuel_type',
          type: 'select',
          options: [
            { label: 'Diesel', value: 'diesel' },
            { label: 'Natural Gas', value: 'natural_gas' },
            { label: 'Dual Fuel', value: 'dual_fuel' },
            { label: 'Propane', value: 'propane' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'annual_test_hours',
          type: 'number',
          admin: { description: 'Permitted hours per year for testing/maintenance' },
        },
        {
          name: 'nox_tpy',
          type: 'number',
          admin: { description: 'NOx emissions limit in tons per year' },
        },
        {
          name: 'pm25_tpy',
          type: 'number',
          admin: { description: 'PM2.5 emissions limit in tons per year' },
        },
      ],
    },

    // Water withdrawal fields
    {
      name: 'water_details',
      type: 'group',
      label: 'Water Withdrawal Details',
      admin: {
        condition: (data) => data.permit_type === 'water_withdrawal',
      },
      fields: [
        {
          name: 'withdrawal_rate_mgd',
          type: 'number',
          admin: { description: 'Permitted withdrawal rate in million gallons per day' },
        },
        {
          name: 'water_body',
          type: 'text',
          admin: { description: 'Source water body or aquifer' },
        },
        {
          name: 'discharge_rate_mgd',
          type: 'number',
        },
        {
          name: 'discharge_location',
          type: 'text',
        },
      ],
    },

    // Dates
    {
      name: 'application_date',
      type: 'date',
    },
    {
      name: 'decision_date',
      type: 'date',
    },
    {
      name: 'expiration_date',
      type: 'date',
    },
    {
      name: 'public_comment_deadline',
      type: 'date',
      admin: { description: 'Deadline for public comment on this application' },
    },

    {
      name: 'documents',
      type: 'relationship',
      relationTo: 'documents',
      hasMany: true,
    },
    {
      name: 'data_sources',
      type: 'relationship',
      relationTo: 'data-sources',
      hasMany: true,
    },
    {
      name: 'description',
      type: 'richText',
    },
  ],
}
