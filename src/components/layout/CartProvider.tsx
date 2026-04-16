'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useCartStore } from '@/lib/cart-store'
import { CartDrawer } from '@/components/ui/CartDrawer'

export function CartProvider() {
  const { data: session } = useSession()
  const { loadFromServer, mergeGuestCart } = useCartStore()

  useEffect(() => {
    if (session) {
      // Try to merge any guest cart first, then load
      mergeGuestCart().then(() => loadFromServer())
    }
  }, [session, loadFromServer, mergeGuestCart])

  return <CartDrawer />
}
