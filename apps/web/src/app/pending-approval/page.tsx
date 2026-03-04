'use client'

import { useAuth } from '@/providers/auth-provider'

export default function PendingApprovalPage() {
  const { logout, firebaseUser } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <span className="text-2xl">⏳</span>
        </div>
        <h1 className="mb-2 text-xl font-bold text-gray-900">Awaiting approval</h1>
        <p className="mb-1 text-sm text-gray-600">
          Your organization registration is being reviewed by an administrator.
        </p>
        <p className="mb-6 text-sm text-gray-400">
          You will receive access once it is approved. Check back later.
        </p>
        {firebaseUser?.email && (
          <p className="mb-6 text-xs text-gray-400">
            Signed in as <span className="font-medium">{firebaseUser.email}</span>
          </p>
        )}
        <button
          onClick={logout}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
