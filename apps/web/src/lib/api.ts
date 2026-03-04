import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
})

// Attach Firebase ID token to every request.
// We call auth.currentUser.getIdToken() with forceRefresh=false — Firebase
// returns the cached token if it is still valid (>5 min remaining), or
// silently refreshes it. Using auth.currentUser directly (not a stale closure)
// ensures we always see the latest signed-in user.
api.interceptors.request.use(async (config) => {
  // Wait for Firebase to finish its initial auth state resolution before
  // trying to get a token. authStateReady() resolves immediately if auth
  // is already settled (e.g. on subsequent requests).
  await auth.authStateReady()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
