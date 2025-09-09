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
  lastUserId: string | null  // Track user changes

  // Actions
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearAuth: () => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  lastUserId: null,

  setUser: (user) => {
    const currentState = get()
    const newUserId = user?.id || null

    console.log('Setting user:', newUserId || 'null')

    // Detect user change
    if (currentState.lastUserId && newUserId && currentState.lastUserId !== newUserId) {
      console.log('🔄 User change detected! Clearing profile...')
      set({
        user,
        profile: null, // Clear profile on user change
        error: null,
        lastUserId: newUserId
      })
    } else {
      set({
        user,
        error: null,
        lastUserId: newUserId
      })
    }
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
    console.log('🧹 Clearing auth state completely')
    set({
      user: null,
      profile: null,
      isLoading: false,
      error: null,
      lastUserId: null
    })
  },

  reset: () => {
    console.log('🔄 Resetting auth state to loading')
    set({
      user: null,
      profile: null,
      isLoading: true,
      error: null,
      lastUserId: null
    })
  }
}))
