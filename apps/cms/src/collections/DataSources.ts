import type { CollectionConfig } from 'payload'

export const DataSources: CollectionConfig = {
  slug: 'data-sources',
  admin: {
    useAsTitle: 'name',
    group: 'Provenance',
    defaultColumns: ['name', 'source_type', 'state', 'last_fetched'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
    },
    {
      name: 'source_type',
      type: 'select',
      required: true,
      options: [
        { label: 'API', value: 'api' },
        { label: 'Web Scrape', value: 'web_scrape' },
        { label: 'Public Record / FOIA', value: 'public_record' },
        { label: 'Press Release', value: 'press_release' },
        { label: 'Regulatory Filing', value: 'regulatory_filing' },
        { label: 'News Article', value: 'news' },
        { label: 'NGO / Advocacy Database', value: 'ngo_database' },
        { label: 'Manual Entry', value: 'manual' },
      ],
    },
    {
      name: 'state',
      type: 'select',
      options: ['MD', 'VA', 'PA', 'DE', 'WV', 'NY', 'DC', 'Federal', 'Multi-state'],
    },
    {
      name: 'agency',
      type: 'text',
      admin: { description: 'e.g. Virginia DEQ, Maryland MDE, EPA ECHO' },
    },
    {
      name: 'published_date',
      type: 'date',
      admin: { description: 'Date the source was originally published (press release, article, filing date, etc.)' },
    },
    {
      name: 'fetched_at',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Timestamp when this data was fetched by the scraper' },
    },
    {
      name: 'last_fetched',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'fetch_frequency',
      type: 'select',
      options: [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    {
      name: 'credentials_required',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
