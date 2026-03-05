'use client'

import { useEffect, useState, Suspense } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/providers/auth-provider'
import { toast } from 'sonner'

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const { user, needsOnboarding, pendingApproval, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  // Once auth-provider has resolved state, redirect away from login
  useEffect(() => {
    if (authLoading) return
    if (user) router.replace(redirect ?? '/dashboard')
    else if (needsOnboarding) router.replace(redirect ?? '/onboarding')
    else if (pendingApproval) router.replace('/pending-approval')
  }, [user, needsOnboarding, pendingApproval, authLoading, router, redirect])

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      // Routing is handled by the useEffect above once auth-provider updates
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        toast.error(err.message ?? 'Google sign-in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Sign in to NexusCoreJS</h1>
      <p className="mb-6 text-sm text-gray-500">Manage your organization&apos;s assets</p>

      <button
        onClick={handleGoogleLogin}
        disabled={loading || authLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </button>

      <p className="mt-6 text-center text-xs text-gray-400">
        Sign-in is by invitation or organization creation only.
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
