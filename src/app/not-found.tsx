import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d12] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-extrabold text-[#7c3aed] mb-4">404</div>
        <h1 className="text-2xl font-bold text-[#f0f0f5] mb-2">Page not found</h1>
        <p className="text-[#8888aa] mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="px-6 py-3 bg-[#7c3aed] text-white font-semibold rounded-xl hover:bg-[#6d28d9] transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
