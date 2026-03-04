'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Sign-up is handled via the login page (Google OAuth only — no separate signup flow)
export default function SignupPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return null
}
