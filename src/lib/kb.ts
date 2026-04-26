import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { KB_MANIFEST, type KbDoc, type KbSection } from '@/content/kb/manifest'

const KB_ROOT = path.join(process.cwd(), 'src', 'content', 'kb')

// Renderer setup is global to the marked module — fine for our usage.
marked.setOptions({ gfm: true, breaks: false })

export interface LoadedKbDoc {
  slug: string
  title: string
  description?: string
  section: string
  html: string
  rawMarkdown: string
}

// Tiny YAML frontmatter parser. We only support `key: value` and string values
// — no nested keys, no arrays. Avoids pulling in gray-matter for two fields.
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  if (!raw.startsWith('---')) return { meta: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: raw }
  const fmBlock = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\r?\n/, '')
  const meta: Record<string, string> = {}
  for (const line of fmBlock.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key) meta[key] = val
  }
  return { meta, body }
}

function findManifestEntry(slug: string): { section: KbSection; doc: KbDoc } | null {
  for (const section of KB_MANIFEST) {
    const doc = section.docs.find(d => d.slug === slug)
    if (doc) return { section, doc }
  }
  return null
}

export async function loadKbDoc(slug: string): Promise<LoadedKbDoc | null> {
  const entry = findManifestEntry(slug)
  if (!entry) return null

  const filePath = path.join(KB_ROOT, `${slug}.md`)
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }

  const { meta, body } = parseFrontmatter(raw)
  const dirty = await marked.parse(body)
  const html = sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'h1', 'h2', 'img', 'figure', 'figcaption', 'mark', 'kbd', 'sup', 'sub',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      span: ['class'],
      div: ['class'],
      th: ['align', 'colspan', 'rowspan'],
      td: ['align', 'colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  })

  return {
    slug,
    title: meta.title || entry.doc.title,
    description: meta.description,
    section: entry.section.title,
    html,
    rawMarkdown: body,
  }
}

export function getKbManifest(): readonly KbSection[] {
  return KB_MANIFEST
}

export function getAllKbSlugs(): string[] {
  const slugs: string[] = []
  for (const section of KB_MANIFEST) {
    for (const doc of section.docs) slugs.push(doc.slug)
  }
  return slugs
}
