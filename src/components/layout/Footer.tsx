import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#16161f] border-t border-[#2a2a3a] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo + tagline */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center mb-3">
              <span className="text-xl font-bold text-white">NOIZU</span>
              <span className="text-xl font-bold text-[#00d4aa]">-DIRECT</span>
            </Link>
            <p className="text-sm text-[#8888aa]">Your fave creators. Direct to you.</p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f5] mb-4">Marketplace</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Browse Products
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Find Creators
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Creators */}
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f5] mb-4">Creators</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Start Selling
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Creator Handbook
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Fees &amp; Payouts
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f5] mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[#8888aa] hover:text-[#f0f0f5] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#2a2a3a] pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-[#8888aa]">
            &copy; 2025 NOIZU-DIRECT. All rights reserved.
          </p>
          <p className="text-sm text-[#8888aa]">
            Made with ♥ in Southeast Asia
          </p>
        </div>
      </div>
    </footer>
  )
}
