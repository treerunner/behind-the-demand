import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    group: 'Provenance',
    defaultColumns: ['title', 'document_type', 'facility', 'published_date'],
    description: 'PDFs, permit filings, news articles, and supporting documents attached to facilities or permits.',
  },
  upload: {
    staticDir: 'media/documents',
    mimeTypes: ['application/pdf', 'image/*', 'text/plain', 'text/html'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'document_type',
      type: 'select',
      required: true,
      options: [
        { label: 'Permit Application', value: 'permit_application' },
        { label: 'Permit Decision', value: 'permit_decision' },
        { label: 'Environmental Impact Statement', value: 'eis' },
        { label: 'Site Plan / Engineering Drawing', value: 'site_plan' },
        { label: 'News Article', value: 'news_article' },
        { label: 'Press Release', value: 'press_release' },
        { label: 'Public Comment', value: 'public_comment' },
        { label: 'Meeting Minutes / Transcript', value: 'meeting_minutes' },
        { label: 'SEC Filing', value: 'sec_filing' },
        { label: 'Corporate Document', value: 'corporate_doc' },
        { label: 'Legal Filing', value: 'legal_filing' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'external_url',
      type: 'text',
      admin: { description: 'Link to original document if not uploaded here' },
    },

    // Associations
    {
      name: 'facility',
      type: 'relationship',
      relationTo: 'facilities',
    },
    {
      name: 'permit',
      type: 'relationship',
      relationTo: 'permits',
    },
    {
      name: 'legislation',
      type: 'relationship',
      relationTo: 'legislation',
    },
    {
      name: 'organization',
      type: 'relationship',
      relationTo: 'organizations',
    },

    { name: 'published_date', type: 'date' },
    { name: 'fetched_date', type: 'date' },
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
