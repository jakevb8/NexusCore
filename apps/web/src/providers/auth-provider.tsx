'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'

interface AppUser {
  id: string
  email: string
  displayName: string | null
  role: string
  organizationId: string
  organization: { id: string; name: string; slug: string }
  firebaseUser: FirebaseUser
}

interface AuthContextValue {
  user: AppUser | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  needsOnboarding: boolean
  pendingApproval: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  firebaseUser: null,
  loading: true,
  needsOnboarding: false,
  pendingApproval: false,
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)
  const router = useRouter()

  const fetchAppUser = async (fbUser: FirebaseUser) => {
    try {
      const { data } = await api.get('/auth/me')
      setUser({ ...data, firebaseUser: fbUser })
      setNeedsOnboarding(false)
      setPendingApproval(false)
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // User exists in Firebase but not in our DB — needs onboarding
        setUser(null)
        setNeedsOnboarding(true)
        setPendingApproval(false)
      } else if (err?.response?.status === 403) {
        // User is registered but org is PENDING or REJECTED
        setUser(null)
        setNeedsOnboarding(false)
        setPendingApproval(true)
      }
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        setLoading(true)
        await fetchAppUser(fbUser)
      } else {
        setUser(null)
        setNeedsOnboarding(false)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setNeedsOnboarding(false)
    setPendingApproval(false)
    router.push('/login')
  }

  const refreshUser = async () => {
    if (firebaseUser) await fetchAppUser(firebaseUser)
  }

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, needsOnboarding, pendingApproval, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
