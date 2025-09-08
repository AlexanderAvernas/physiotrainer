// src/stores/authStore.ts
import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  reset: () => void
}

// Skapa store UTAN persistence - detta kan orsaka problem
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  setUser: (user) => {
    console.log('Setting user:', user?.id || 'null')
    set({
      user,
      error: null
    })
  },

  setProfile: (profile) => {
    console.log('Setting profile:', profile?.id || 'null')
    set({
      profile,
      error: null
    })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  setError: (error) => {
    console.error('Auth error:', error)
    set({ error, isLoading: false })
  },

  clearAuth: () => {
    console.log('Clearing auth state')
    set({
      user: null,
      profile: null,
      isLoading: false,
      error: null
    })
  },

  reset: () => {
    console.log('Resetting auth state')
    set({
      user: null,
      profile: null,
      isLoading: true,
      error: null
    })
  }
}))
