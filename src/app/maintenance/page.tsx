import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Under Maintenance — noizu.direct',
  robots: { index: false, follow: false },
}

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-500/8 blur-[80px] pointer-events-none" />

      {/* Animated grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(167,139,250,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,0.8) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">noizu<span className="text-violet-400">.direct</span></span>
          </div>
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-12 h-12 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-2xl border border-violet-500/30 animate-ping opacity-20" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-white tracking-tight">
            We&apos;re tuning<br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              things up
            </span>
          </h1>
          <p className="text-[#94a3b8] text-base leading-relaxed max-w-sm mx-auto">
            noizu.direct is currently undergoing scheduled maintenance. We&apos;re working hard to bring you something even better.
          </p>
        </div>

        {/* Status card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">Status</span>
            <span className="flex items-center gap-2 text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Maintenance in progress
            </span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">Platform</span>
            <span className="text-white font-medium">noizu.direct</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#64748b]">Expected</span>
            <span className="text-violet-400 font-medium">Back shortly</span>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="pt-4 border-t border-white/5">
          <p className="text-[#334155] text-xs tracking-wide uppercase">
            The creator marketplace for Southeast Asia
          </p>
        </div>
      </div>
    </div>
  )
}
