import type { CollectionConfig } from 'payload'

export const CommunitySignals: CollectionConfig = {
  slug: 'community-signals',
  admin: {
    useAsTitle: 'title',
    group: 'Policy',
    defaultColumns: ['title', 'signal_type', 'sentiment', 'jurisdiction', 'date'],
    description:
      'Community sentiment — town halls, public comments, advocacy, news coverage, petitions, editorials.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Brief descriptive title for this signal' },
    },
    {
      name: 'signal_type',
      type: 'select',
      required: true,
      options: [
        { label: 'Town Hall / Public Meeting', value: 'town_hall' },
        { label: 'Public Comment (regulatory)', value: 'public_comment' },
        { label: 'News Article', value: 'news_article' },
        { label: 'Editorial / Op-Ed', value: 'editorial' },
        { label: 'Petition', value: 'petition' },
        { label: 'Advocacy Group Statement', value: 'advocacy_group' },
        { label: 'Elected Official Statement', value: 'elected_official' },
        { label: 'Letter to Agency / Council', value: 'letter' },
        { label: 'Social Media Campaign', value: 'social_media' },
        { label: 'Community Survey', value: 'survey' },
        { label: 'Protest / Demonstration', value: 'protest' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'sentiment',
      type: 'select',
      required: true,
      options: [
        { label: 'Supportive', value: 'supportive' },
        { label: 'Opposed', value: 'opposed' },
        { label: 'Mixed / Conditional', value: 'mixed' },
        { label: 'Neutral / Informational', value: 'neutral' },
      ],
    },

    // Source of the signal
    {
      name: 'source_name',
      type: 'text',
      admin: { description: 'Organization, outlet, or person generating this signal (e.g. "Friends of the Rappahannock", "Washington Post")' },
    },
    {
      name: 'source_url',
      type: 'text',
    },
    {
      name: 'author',
      type: 'text',
      admin: { description: 'Individual author or speaker, if applicable' },
    },

    // Scale / reach
    {
      name: 'reach',
      type: 'group',
      label: 'Scale & Reach',
      fields: [
        {
          name: 'signature_count',
          type: 'number',
          admin: { description: 'Petition signatures or attendance count' },
        },
        {
          name: 'comment_count',
          type: 'number',
          admin: { description: 'Number of public comments submitted' },
        },
      ],
    },

    // Jurisdiction
    {
      name: 'jurisdiction',
      type: 'group',
      label: 'Jurisdiction',
      fields: [
        {
          name: 'state',
          type: 'select',
          options: ['MD', 'VA', 'PA', 'DE', 'WV', 'NY', 'DC', 'Multi-state', 'Regional'],
        },
        {
          name: 'county_or_city',
          type: 'text',
        },
      ],
    },

    { name: 'date', type: 'date', required: true },

    // Connections
    {
      name: 'related_facilities',
      type: 'relationship',
      relationTo: 'facilities',
      hasMany: true,
    },
    {
      name: 'related_legislation',
      type: 'relationship',
      relationTo: 'legislation',
      hasMany: true,
    },
    {
      name: 'related_permits',
      type: 'relationship',
      relationTo: 'permits',
      hasMany: true,
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
      name: 'key_quotes',
      type: 'array',
      label: 'Key Quotes',
      admin: { description: 'Pull quotes for editorial use' },
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'speaker', type: 'text' },
        { name: 'speaker_title', type: 'text' },
        { name: 'context', type: 'text' },
      ],
    },
    {
      name: 'notes',
      type: 'richText',
    },
  ],
}
