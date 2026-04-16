'use client'
import { create } from 'zustand'

export interface CartProduct {
  id: string
  title: string
  price: number
  type: string
  category: string
  images: string[]
  stock: number | null
  isActive: boolean
  creator: {
    id: string        // CreatorProfile.id
    displayName: string
    username: string
    avatar: string | null
  }
}

export interface CartItemData {
  id: string
  quantity: number
  selectedSize: string | null
  selectedColor: string | null
  addedAt: string
  unavailable?: boolean
  product: CartProduct
}

export interface CartGroup {
  creatorId: string
  displayName: string
  username: string
  avatar: string | null
  subtotal: number
  items: CartItemData[]
}

export interface CartState {
  items: CartItemData[]
  groups: CartGroup[]
  subtotal: number
  processingFee: number
  total: number
  itemCount: number
  isOpen: boolean
  isLoading: boolean
}

export interface CartActions {
  openCart: () => void
  closeCart: () => void
  setCart: (data: Omit<CartState, 'isOpen' | 'isLoading'>) => void
  setLoading: (v: boolean) => void
  loadFromServer: () => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  addItem: (productId: string, quantity: number, selectedSize?: string, selectedColor?: string) => Promise<{ ok: boolean; alreadyInCart?: boolean; error?: string }>
  mergeGuestCart: () => Promise<void>
}

const GUEST_CART_KEY = 'nd_guest_cart'

export const useCartStore = create<CartState & CartActions>((set, get) => ({
  items: [],
  groups: [],
  subtotal: 0,
  processingFee: 0,
  total: 0,
  itemCount: 0,
  isOpen: false,
  isLoading: false,

  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  setCart: (data) => set(data),
  setLoading: (v) => set({ isLoading: v }),

  loadFromServer: async () => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        set({ ...data, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  addItem: async (productId, quantity, selectedSize, selectedColor) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity, selectedSize, selectedColor }),
      })
      const data = await res.json()
      if (res.status === 409) {
        set({ isLoading: false })
        return { ok: false, alreadyInCart: true }
      }
      if (!res.ok) {
        set({ isLoading: false })
        return { ok: false, error: data.error ?? 'Failed to add item' }
      }
      set({ ...data, isLoading: false })
      return { ok: true }
    } catch {
      set({ isLoading: false })
      return { ok: false, error: 'Network error' }
    }
  },

  removeItem: async (id) => {
    const prev = get().items
    set({ items: prev.filter(i => i.id !== id) })
    try {
      const res = await fetch(`/api/cart/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        set({ items: prev })
        return
      }
      await get().loadFromServer()
    } catch {
      set({ items: prev })
    }
  },

  updateQuantity: async (id, quantity) => {
    try {
      const res = await fetch(`/api/cart/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      if (res.ok) {
        await get().loadFromServer()
      }
    } catch {}
  },

  clearCart: async () => {
    try {
      await fetch('/api/cart', { method: 'DELETE' })
      set({ items: [], groups: [], subtotal: 0, processingFee: 0, total: 0, itemCount: 0 })
    } catch {}
  },

  mergeGuestCart: async () => {
    try {
      const raw = localStorage.getItem(GUEST_CART_KEY)
      if (!raw) return
      const items = JSON.parse(raw)
      if (!Array.isArray(items) || items.length === 0) return
      await fetch('/api/cart/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      localStorage.removeItem(GUEST_CART_KEY)
      await get().loadFromServer()
    } catch {}
  },
}))
