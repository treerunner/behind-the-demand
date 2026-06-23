import type { CollectionConfig } from 'payload'

export const Legislation: CollectionConfig = {
  slug: 'legislation',
  admin: {
    useAsTitle: 'title',
    group: 'Policy',
    defaultColumns: ['title', 'bill_number', 'type', 'status', 'jurisdiction', 'introduced_date'],
    description:
      'Proposed and enacted legislation, regulations, and ordinances relevant to data centers in the watershed region.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Short descriptive title (does not need to be the official bill title)' },
    },
    {
      name: 'official_title',
      type: 'text',
      admin: { description: 'Exact official bill or regulation title' },
    },
    {
      name: 'bill_number',
      type: 'text',
      admin: { description: 'e.g. "HB 1234", "SB 789", "DRPA-2024-001"' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'State Bill', value: 'state_bill' },
        { label: 'Federal Bill', value: 'federal_bill' },
        { label: 'Local Ordinance', value: 'local_ordinance' },
        { label: 'State Regulation / Rulemaking', value: 'state_regulation' },
        { label: 'Federal Regulation', value: 'federal_regulation' },
        { label: 'Executive Order', value: 'executive_order' },
        { label: 'Moratorium', value: 'moratorium' },
        { label: 'Zoning Code Amendment', value: 'zoning_amendment' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'proposed',
      options: [
        { label: 'Proposed / Draft', value: 'proposed' },
        { label: 'Introduced', value: 'introduced' },
        { label: 'In Committee', value: 'committee' },
        { label: 'Passed (Awaiting Signature)', value: 'passed' },
        { label: 'Signed / Enacted', value: 'enacted' },
        { label: 'Failed / Died', value: 'failed' },
        { label: 'Vetoed', value: 'vetoed' },
        { label: 'Repealed', value: 'repealed' },
        { label: 'Active / In Force', value: 'active' },
      ],
    },
    {
      name: 'precatory',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Precatory legislation — expresses intent or aspiration without binding enforcement (e.g. resolutions, policy statements)',
      },
    },
    {
      name: 'jurisdiction',
      type: 'group',
      label: 'Jurisdiction',
      fields: [
        {
          name: 'level',
          type: 'select',
          options: [
            { label: 'Federal', value: 'federal' },
            { label: 'State', value: 'state' },
            { label: 'County', value: 'county' },
            { label: 'Municipal', value: 'municipal' },
            { label: 'Regional', value: 'regional' },
          ],
        },
        {
          name: 'state',
          type: 'select',
          options: ['MD', 'VA', 'PA', 'DE', 'WV', 'NY', 'DC', 'Multi-state'],
        },
        {
          name: 'county_or_city',
          type: 'text',
          admin: { description: 'e.g. "Loudoun County", "Prince William County", "Baltimore City"' },
        },
        {
          name: 'legislative_body',
          type: 'text',
          admin: { description: 'e.g. "Maryland General Assembly", "Loudoun County Board of Supervisors"' },
        },
      ],
    },
    {
      name: 'sponsors',
      type: 'array',
      label: 'Sponsors / Sponsors',
      fields: [
        { name: 'name', type: 'text' },
        {
          name: 'role',
          type: 'select',
          options: [
            { label: 'Primary Sponsor', value: 'primary' },
            { label: 'Co-sponsor', value: 'cosponsor' },
            { label: 'Committee Chair', value: 'committee_chair' },
          ],
        },
        { name: 'party', type: 'text' },
        { name: 'district', type: 'text' },
      ],
    },

    // What it covers
    {
      name: 'topics',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Water Usage / Withdrawal Limits', value: 'water_usage' },
        { label: 'Air Quality / Emissions', value: 'air_quality' },
        { label: 'Power / Grid Capacity', value: 'power_grid' },
        { label: 'Zoning / Land Use', value: 'zoning' },
        { label: 'Tax Incentives / Abatements', value: 'tax_incentives' },
        { label: 'Environmental Review (NEPA/SEPA)', value: 'env_review' },
        { label: 'Generator / Backup Power', value: 'generators' },
        { label: 'Data Center Moratorium', value: 'moratorium' },
        { label: 'Community Benefit Agreements', value: 'cba' },
        { label: 'Transparency / Disclosure', value: 'transparency' },
        { label: 'Other', value: 'other' },
      ],
    },

    // Related facilities and other legislation
    {
      name: 'related_facilities',
      type: 'relationship',
      relationTo: 'facilities',
      hasMany: true,
      admin: { description: 'Specific facilities this legislation targets or affects' },
    },
    {
      name: 'related_legislation',
      type: 'relationship',
      relationTo: 'legislation',
      hasMany: true,
      admin: { description: 'Companion bills, predecessor legislation, or direct responses' },
    },

    // Dates
    { name: 'introduced_date', type: 'date' },
    { name: 'committee_hearing_date', type: 'date' },
    { name: 'passed_date', type: 'date' },
    { name: 'enacted_date', type: 'date' },
    { name: 'effective_date', type: 'date' },

    {
      name: 'full_text_url',
      type: 'text',
      admin: { description: 'Link to official bill text or regulation' },
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
      name: 'summary',
      type: 'richText',
      admin: { description: 'Plain-language summary of what this legislation does or proposes' },
    },
  ],
}
