import type { CollectionConfig } from 'payload'

export const Organizations: CollectionConfig = {
  slug: 'organizations',
  admin: {
    useAsTitle: 'name',
    group: 'Entities',
    defaultColumns: ['name', 'type', 'ultimate_parent', 'ticker'],
    description: 'Legal entities — operators, holding companies, PE firms, shell LLCs, and subsidiaries.',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Common/brand name (e.g. "Google", "Blackstone")' },
    },
    {
      name: 'legal_name',
      type: 'text',
      admin: { description: 'Exact legal name as it appears on permits and filings' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Hyperscaler (Google, Microsoft, Amazon, Meta, Apple)', value: 'hyperscaler' },
        { label: 'Colo REIT (Equinix, Digital Realty)', value: 'colo_reit' },
        { label: 'Colo — Private', value: 'colo_private' },
        { label: 'Enterprise', value: 'enterprise' },
        { label: 'Private Equity', value: 'private_equity' },
        { label: 'Holding Company', value: 'holding_company' },
        { label: 'Shell LLC / SPV', value: 'shell_llc' },
        { label: 'Developer / Builder', value: 'developer' },
        { label: 'Utility', value: 'utility' },
        { label: 'Other', value: 'other' },
      ],
    },

    // Corporate hierarchy
    {
      name: 'corporate_hierarchy',
      type: 'group',
      label: 'Corporate Hierarchy',
      fields: [
        {
          name: 'parent_org',
          type: 'relationship',
          relationTo: 'organizations',
          admin: { description: 'Direct parent entity' },
        },
        {
          name: 'ultimate_parent',
          type: 'relationship',
          relationTo: 'organizations',
          admin: { description: 'Top of the ownership chain (denormalized for fast querying)' },
        },
        {
          name: 'ownership_pct',
          type: 'number',
          min: 0,
          max: 100,
          admin: { description: "Parent's ownership percentage of this entity (if known)" },
        },
        {
          name: 'acquisition_date',
          type: 'date',
          admin: { description: 'Date parent acquired this entity' },
        },
      ],
    },

    // Public company identifiers
    {
      name: 'identifiers',
      type: 'group',
      label: 'Public Identifiers',
      fields: [
        {
          name: 'ticker',
          type: 'text',
          admin: { description: 'Stock ticker (e.g. GOOGL, EQIX, DLR)' },
        },
        {
          name: 'sec_cik',
          type: 'text',
          admin: { description: 'SEC EDGAR CIK number — links to filings and subsidiary lists' },
        },
        {
          name: 'ein',
          type: 'text',
          admin: { description: 'IRS Employer ID — may appear on permit applications' },
        },
        {
          name: 'lei',
          type: 'text',
          admin: { description: 'Legal Entity Identifier (global standard)' },
        },
        {
          name: 'opencorporates_url',
          type: 'text',
          admin: { description: 'Link to OpenCorporates entity page' },
        },
      ],
    },

    // State registrations
    {
      name: 'registered_states',
      type: 'select',
      hasMany: true,
      options: ['MD', 'VA', 'PA', 'DE', 'WV', 'NY', 'DC'],
      admin: { description: 'States where this entity is registered to do business' },
    },
    {
      name: 'formation_state',
      type: 'text',
      admin: { description: 'State of incorporation (usually Delaware)' },
    },
    {
      name: 'website',
      type: 'text',
    },

    {
      name: 'data_sources',
      type: 'relationship',
      relationTo: 'data-sources',
      hasMany: true,
    },
    {
      name: 'notes',
      type: 'richText',
    },
  ],
}
