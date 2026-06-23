import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { CommunitySignals } from './collections/CommunitySignals'
import { DataSources } from './collections/DataSources'
import { Documents } from './collections/Documents'
import { Facilities } from './collections/Facilities'
import { Legislation } from './collections/Legislation'
import { OrganizationRelationships } from './collections/OrganizationRelationships'
import { Organizations } from './collections/Organizations'
import { Permits } from './collections/Permits'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Behind the Demand',
    },
  },
  collections: [
    Users,
    Organizations,
    OrganizationRelationships,
    Facilities,
    Permits,
    Legislation,
    CommunitySignals,
    DataSources,
    Documents,
  ],
  editor: lexicalEditor({}),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI ?? '',
    },
    schemaName: 'payload',
  }),
  graphQL: {
    schemaOutputFile: path.resolve(dirname, 'generated-schema.graphql'),
  },
  sharp,
})
