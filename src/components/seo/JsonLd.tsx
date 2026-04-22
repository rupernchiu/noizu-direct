import { headers } from 'next/headers'

interface JsonLdProps {
  data: object | object[]
}

export async function JsonLd({ data }: JsonLdProps) {
  const schemas = Array.isArray(data) ? data : [data]
  // CSP is nonce-based; even application/ld+json scripts need the nonce to
  // pass script-src on strict policies. We read it from the request header
  // set by src/middleware.ts.
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          nonce={nonce}
          // React 19 strips `nonce` from client markup for security (so a
          // server nonce can't be exfiltrated via client-read DOM). The SSR
          // HTML still carries it for CSP script-src to pass — the resulting
          // nonce="X" vs nonce="" diff is expected and cosmetic.
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
