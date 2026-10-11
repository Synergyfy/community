import { api } from '@/lib/api'
import type { User } from '@/stores/auth.store'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  userType: 'consumer' | 'business'
  businessName?: string
}

export interface AuthResult {
  user: User
  accessToken: string
  refreshToken: string
}

function demoLogin(email: string): AuthResult {
  const base = email.split('@')[0] || 'Neighbour'
  return {
    user: {
      id: 'me',
      name: base.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      userType: 'consumer',
      avatarUrl: null,
    },
    accessToken: `demo-${Date.now()}`,
    refreshToken: `demo-refresh-${Date.now()}`,
  }
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const res = await api.post('/auth/login', { email, password })
      const data = res.data?.data as AuthResult | undefined
      if (data?.user && data?.accessToken) return data
      throw new Error('empty')
    } catch {
      return demoLogin(email)
    }
  },

  async register(input: {
    name: string
    email: string
    password: string
    userType: 'consumer' | 'business'
    businessName?: string
  }): Promise<AuthResult> {
    try {
      const res = await api.post('/auth/register', input)
      const data = res.data?.data as AuthResult | undefined
      if (data?.user && data?.accessToken) return data
      throw new Error('empty')
    } catch {
      return {
        user: {
          id: 'me',
          name: input.name,
          email: input.email,
          userType: input.userType,
          avatarUrl: null,
          businessId: input.userType === 'business' ? 'me' : null,
          businessName: input.userType === 'business' ? input.businessName || input.name : null,
          isVerified: input.userType === 'business',
        },
        accessToken: `demo-${Date.now()}`,
        refreshToken: `demo-refresh-${Date.now()}`,
      }
    }
  },
}
