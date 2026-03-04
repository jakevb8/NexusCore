'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import api from '@/lib/api'
import { toast } from 'sonner'

export default function OnboardingPage() {
  const { firebaseUser, refreshUser } = useAuth()
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSlugChange = (value: string) => {
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-'),
    )
  }

  const handleOrgNameChange = (value: string) => {
    setOrgName(value)
    handleSlugChange(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return

    setLoading(true)
    try {
      await api.post('/auth/register', {
        organizationName: orgName,
        organizationSlug: slug,
        displayName: displayName || firebaseUser.email?.split('@')[0],
      })
      await refreshUser()
      toast.success('Organization created!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Set up your organization</h1>
        <p className="mb-6 text-sm text-gray-500">You&apos;ll be the admin of this workspace</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Your name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Organization name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              required
              placeholder="Acme Corp"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Organization URL slug
            </label>
            <div className="flex rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="flex items-center rounded-l-lg border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                nexus-core.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                pattern="[a-z0-9\-]+"
                minLength={3}
                placeholder="acme-corp"
                className="flex-1 rounded-r-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create organization'}
          </button>
        </form>
      </div>
    </div>
  )
}
