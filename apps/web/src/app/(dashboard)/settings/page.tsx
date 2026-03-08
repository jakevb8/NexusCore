'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)

  const deleteAccountMutation = useMutation({
    mutationFn: () => api.delete('/auth/me'),
    onSuccess: async () => {
      toast.success('Your account has been deleted.')
      await logout()
      router.push('/login')
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? 'Failed to delete account. Please try again.'),
  })

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account preferences</p>
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Name</span>
            <span className="font-medium text-gray-900">{user.displayName ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Role</span>
            <span className="font-medium text-gray-900">{user.role.replace('_', ' ')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Organization</span>
            <span className="font-medium text-gray-900">{user.organization.name}</span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="mb-1 text-base font-semibold text-red-700">Danger Zone</h2>
        <p className="mb-4 text-sm text-gray-500">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete Account
        </button>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Delete your account?</h2>
            <p className="mb-1 text-sm text-gray-600">This will permanently delete:</p>
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>Your user profile</li>
              <li>
                Your organization <strong>{user.organization.name}</strong> and all its data, if you
                are the last member
              </li>
              <li>All associated assets, audit logs, and invites</li>
            </ul>
            <p className="mb-4 text-sm font-medium text-red-600">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleteAccountMutation.isPending}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? 'Deleting...' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
