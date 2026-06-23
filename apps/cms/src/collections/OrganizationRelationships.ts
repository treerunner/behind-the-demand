import type { CollectionConfig } from 'payload'

export const OrganizationRelationships: CollectionConfig = {
  slug: 'organization-relationships',
  admin: {
    useAsTitle: 'relationship_type',
    group: 'Entities',
    defaultColumns: ['from_org', 'relationship_type', 'to_org', 'ownership_pct', 'since_date'],
    description: 'Complex equity arrangements: joint ventures, partial PE stakes, time-bound acquisitions.',
  },
  fields: [
    {
      name: 'from_org',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: { description: 'The entity in the "from" position (e.g. the subsidiary)' },
    },
    {
      name: 'relationship_type',
      type: 'select',
      required: true,
      options: [
        { label: 'Subsidiary of', value: 'subsidiary_of' },
        { label: 'Backed by (PE/VC)', value: 'backed_by' },
        { label: 'Joint venture with', value: 'joint_venture_with' },
        { label: 'Acquired by', value: 'acquired_by' },
        { label: 'Leases from', value: 'leases_from' },
        { label: 'Operates on behalf of', value: 'operates_for' },
        { label: 'Registered agent for', value: 'registered_agent_for' },
      ],
    },
    {
      name: 'to_org',
      type: 'relationship',
      relationTo: 'organizations',
      required: true,
      admin: { description: 'The entity in the "to" position (e.g. the parent/acquirer)' },
    },
    {
      name: 'ownership_pct',
      type: 'number',
      min: 0,
      max: 100,
      admin: { description: 'Equity stake percentage, if known' },
    },
    {
      name: 'since_date',
      type: 'date',
      admin: { description: 'When this relationship began' },
    },
    {
      name: 'until_date',
      type: 'date',
      admin: { description: 'When this relationship ended (leave blank if current)' },
    },
    {
      name: 'deal_value_usd',
      type: 'number',
      admin: { description: 'Transaction value in USD (for acquisitions, if known)' },
    },
    {
      name: 'source',
      type: 'relationship',
      relationTo: 'data-sources',
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
