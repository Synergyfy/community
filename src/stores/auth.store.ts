import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/config'

export interface User {
  id: string
  name: string
  email?: string
  userType: 'public' | 'business' | 'consumer' | 'admin'
  avatarUrl?: string | null
  businessId?: string | null
  businessName?: string | null
  isVerified?: boolean
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  authStatus: 'initializing' | 'authenticated' | 'unauthenticated'
  setUser: (user: User | null) => void
  setTokens: (accessToken: string | null, refreshToken: string | null) => void
  setAuthStatus: (status: AuthState['authStatus']) => void
  signIn: (user: User, accessToken: string, refreshToken: string) => void
  bootstrapAuth: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      authStatus: 'initializing',
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setAuthStatus: (authStatus) => set({ authStatus }),
      signIn: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken, authStatus: 'authenticated' }),
      bootstrapAuth: () => {
        const { user, accessToken } = get()
        set({ authStatus: user && accessToken ? 'authenticated' : 'unauthenticated' })
      },
      logout: () => set({ user: null, accessToken: null, refreshToken: null, authStatus: 'unauthenticated' }),
    }),
    {
      name: STORAGE_KEYS.USER,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.bootstrapAuth()
      },
    },
  ),
)
