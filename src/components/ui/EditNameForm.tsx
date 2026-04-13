'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function EditNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setMessage('Name updated successfully.')
      } else {
        const data = await res.json()
        setMessage(data.error ?? 'Failed to update name.')
      }
    } catch {
      setMessage('An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[#f0f0f5] mb-1">Display Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg bg-[#1e1e2a] border border-[#2a2a3a] px-3 py-2 text-sm text-[#f0f0f5] placeholder-[#8888aa] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
        />
      </div>
      {message && (
        <p className="text-sm text-[#00d4aa]">{message}</p>
      )}
      <Button type="submit" disabled={loading} className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white">
        {loading ? 'Saving…' : 'Save Name'}
      </Button>
    </form>
  )
}
