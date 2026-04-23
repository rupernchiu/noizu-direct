import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireStaffActor } from '@/lib/staffPolicy'
import { OrphanPurgeButton } from './OrphanPurgeButton'
import { DeleteWithReasonButton } from './DeleteWithReasonButton'

const DAYS = 24 * 60 * 60 * 1000
const ORPHAN_CUTOFF_DAYS = 7
const KYC_RETENTION_DAYS = 90
const DISPUTE_RETENTION_DAYS = 540

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function daysAgo(d: Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / DAYS))
}

function truncateKey(key: string): string {
  if (key.length <= 48) return key
  return `${key.slice(0, 24)}…${key.slice(-20)}`
}

export default async function PrivateFilesHousekeepingPage() {
  await requireStaffActor('files.housekeeping')

  const now = Date.now()
  const orphanCutoff = new Date(now - ORPHAN_CUTOFF_DAYS * DAYS)
  const kycCutoff = new Date(now - KYC_RETENTION_DAYS * DAYS)
  const disputeCutoff = new Date(now - DISPUTE_RETENTION_DAYS * DAYS)

  const [orphans, rejectedApps, disputeCandidates] = await Promise.all([
    prisma.creatorApplication.findMany({
      where: { status: 'DRAFT', updatedAt: { lt: orphanCutoff } },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
      },
    }),
    // KycUpload has no user relation in the Prisma schema, so we gather the
    // userIds of REJECTED applications first and filter uploads by userId.
    prisma.creatorApplication.findMany({
      where: { status: 'REJECTED' },
      select: { userId: true },
    }),
    prisma.disputeEvidence.findMany({
      where: {
        supersededAt: null,
        uploadedAt: { lt: disputeCutoff },
        dispute: {
          status: { in: ['RESOLVED_REFUND', 'RESOLVED_RELEASE', 'CLOSED'] },
        },
      },
      orderBy: { uploadedAt: 'asc' },
      take: 100,
      include: {
        dispute: { select: { id: true, status: true, resolvedAt: true } },
      },
    }),
  ])

  const rejectedUserIds = rejectedApps.map((a) => a.userId)

  const kycCandidatesRaw = rejectedUserIds.length
    ? await prisma.kycUpload.findMany({
        where: {
          userId: { in: rejectedUserIds },
          supersededAt: null,
          createdAt: { lt: kycCutoff },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
      })
    : []

  const kycUserIds = Array.from(new Set(kycCandidatesRaw.map((u) => u.userId)))
  const kycUsers = kycUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: kycUserIds } },
        select: { id: true, email: true, name: true },
      })
    : []
  const kycUserById = new Map(kycUsers.map((u) => [u.id, u]))

  const kycCandidates = kycCandidatesRaw.map((upload) => ({
    ...upload,
    user: kycUserById.get(upload.userId) ?? { id: upload.userId, email: '—', name: '—' },
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Private File Housekeeping</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Audit-logged deletion queue for private bucket objects past their retention window.
        </p>
      </div>

      {/* ── Section A: Orphan KYC applications ──────────────────────────── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Orphan KYC applications
                <span className="ml-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-border text-muted-foreground">
                  {orphans.length}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                <code className="font-mono">DRAFT</code> applications inactive for {ORPHAN_CUTOFF_DAYS}+ days.
                Purging deletes every KYC upload for the user and then the application row.
                Policy tag: <code className="font-mono">ORPHAN_7D</code>
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">App created</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Last updated</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Reminder</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orphans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No orphan drafts found.
                  </td>
                </tr>
              )}
              {orphans.map((app) => {
                const reminderSent = app.kycReminderSentAt != null
                return (
                  <tr key={app.id} className="hover:bg-background/40 transition-colors">
                    <td className="px-3 py-1.5">
                      <p className="text-xs font-medium text-foreground">{app.user.name || '—'}</p>
                      <p className="text-[11px] text-muted-foreground">{app.user.email}</p>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">{fmtDate(app.createdAt)}</td>
                    <td className="px-3 py-1.5">
                      <p className="text-xs text-foreground">{fmtDate(app.updatedAt)}</p>
                      <p className="text-[11px] text-muted-foreground">{daysAgo(app.updatedAt)}d ago</p>
                    </td>
                    <td className="px-3 py-1.5">
                      {reminderSent ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400">
                          Sent {fmtDate(app.kycReminderSentAt!)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-border text-muted-foreground">
                          Not sent
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <OrphanPurgeButton applicationId={app.id} userEmail={app.user.email} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section B: KYC retention candidates ─────────────────────────── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            KYC retention candidates
            <span className="ml-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-border text-muted-foreground">
              {kycCandidates.length}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live KYC uploads {KYC_RETENTION_DAYS}+ days old whose application is <code className="font-mono">REJECTED</code>.
            Policy tag: <code className="font-mono">KYC_REJECTED_90D</code>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">r2Key</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Uploaded</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {kycCandidates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No KYC files past retention.
                  </td>
                </tr>
              )}
              {kycCandidates.map((upload) => (
                <tr key={upload.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-3 py-1.5">
                    <p className="text-xs font-medium text-foreground">{upload.user.name || '—'}</p>
                    <p className="text-[11px] text-muted-foreground">{upload.user.email}</p>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-border text-muted-foreground">
                      {upload.category}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <code className="text-[11px] font-mono text-muted-foreground" title={upload.r2Key}>
                      {truncateKey(upload.r2Key)}
                    </code>
                  </td>
                  <td className="px-3 py-1.5">
                    <p className="text-xs text-foreground">{fmtDate(upload.createdAt)}</p>
                    <p className="text-[11px] text-muted-foreground">{daysAgo(upload.createdAt)}d ago</p>
                  </td>
                  <td className="px-3 py-1.5">
                    <DeleteWithReasonButton kind="kyc" targetId={upload.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section C: Dispute evidence retention candidates ─────────────── */}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Dispute evidence retention candidates
            <span className="ml-2 px-1.5 py-0.5 rounded text-[11px] font-bold bg-border text-muted-foreground">
              {disputeCandidates.length}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Evidence files {DISPUTE_RETENTION_DAYS}+ days old for closed/resolved disputes.
            Policy tag: <code className="font-mono">DISPUTE_CLOSED_540D</code>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Dispute</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">r2Key</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Uploaded</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Resolved</th>
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {disputeCandidates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No dispute evidence past retention.
                  </td>
                </tr>
              )}
              {disputeCandidates.map((ev) => (
                <tr key={ev.id} className="hover:bg-background/40 transition-colors">
                  <td className="px-3 py-1.5">
                    <Link href={`/admin/disputes/${ev.dispute.id}`} className="text-xs text-primary hover:underline">
                      #{ev.dispute.id.slice(-8).toUpperCase()}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{ev.dispute.status}</p>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-border text-muted-foreground">
                      {ev.role}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    <code className="text-[11px] font-mono text-muted-foreground" title={ev.r2Key}>
                      {truncateKey(ev.r2Key)}
                    </code>
                  </td>
                  <td className="px-3 py-1.5">
                    <p className="text-xs text-foreground">{fmtDate(ev.uploadedAt)}</p>
                    <p className="text-[11px] text-muted-foreground">{daysAgo(ev.uploadedAt)}d ago</p>
                  </td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{fmtDateTime(ev.dispute.resolvedAt)}</td>
                  <td className="px-3 py-1.5">
                    <DeleteWithReasonButton kind="dispute-evidence" targetId={ev.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
