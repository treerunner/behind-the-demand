export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({
    hasSecret: !!process.env.PAYLOAD_SECRET,
    secretLen: process.env.PAYLOAD_SECRET?.length ?? 0,
    hasDatabaseUri: !!process.env.DATABASE_URI,
    nodeEnv: process.env.NODE_ENV,
  })
}
