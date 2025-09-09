// src/components/AuthProvider.tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { setUser, setProfile, setLoading, clearAuth, reset, user } = useAuthStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)
  const initializationRef = useRef(false)
  const retryCountRef = useRef(0)

  // Enhanced initialization with retry logic
  const initializeAuth = useCallback(async (isRetry = false) => {
    if (initializationRef.current && !isRetry) return

    console.log('🚀 Initializing auth state...', isRetry ? '(retry)' : '')

    if (!isRetry) {
      initializationRef.current = true
      reset() // Set loading state
    }

    setIsRefreshing(true)

    try {
      // Try multiple approaches to get user
      let currentUser = null
      let userError = null

      // Method 1: Direct getUser
      const userResult = await supabase.auth.getUser()
      currentUser = userResult.data.user
      userError = userResult.error

      // Method 2: If no user found, try getting session (sometimes more reliable after login)
      if (!currentUser && !userError) {
        console.log('🔄 No user from getUser, trying getSession...')
        const sessionResult = await supabase.auth.getSession()
        currentUser = sessionResult.data.session?.user || null
        userError = sessionResult.error
      }

      // Method 3: Wait a bit and retry if we still have no user but no error
      if (!currentUser && !userError && retryCountRef.current < 3) {
        console.log('🔄 No user found, retrying in 500ms...')
        retryCountRef.current++

        setTimeout(() => {
          if (mountedRef.current) {
            initializeAuth(true)
          }
        }, 500)
        return
      }

      if (userError || !currentUser) {
        console.log('❌ No valid user found during initialization')
        clearAuth()
        retryCountRef.current = 0
        return
      }

      console.log('✅ Found user during initialization:', currentUser.id)
      retryCountRef.current = 0 // Reset retry counter on success
      setUser(currentUser)

      // Load profile for authenticated user
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profile && !profileError) {
          setProfile(profile)
          console.log('✅ Profile loaded successfully')
        } else {
          console.error('❌ Failed to load profile:', profileError)
          setProfile(null)
        }
      } catch (profileError) {
        console.error('❌ Profile loading error:', profileError)
        setProfile(null)
      }

    } catch (error) {
      console.error('💥 Auth initialization failed:', error)

      // If initialization fails completely, retry once more
      if (retryCountRef.current < 2) {
        retryCountRef.current++
        setTimeout(() => {
          if (mountedRef.current) {
            initializeAuth(true)
          }
        }, 1000)
        return
      }

      clearAuth()
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [setUser, setProfile, setLoading, clearAuth, reset])

  // Force refresh function for tab focus events
  const forceRefresh = useCallback(async () => {
    if (!mountedRef.current || isRefreshing) return

    console.log('🔄 Force refreshing auth state...')
    setIsRefreshing(true)

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        console.log('❌ Force refresh: No valid user')
        clearAuth()
        return
      }

      // Check if this is a different user than what we currently have
      const currentState = useAuthStore.getState()
      if (currentState.user?.id !== currentUser.id) {
        console.log('🔄 Different user detected during refresh!')
        setUser(currentUser)

        // Load new user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        setProfile(profile)
      } else {
        console.log('✅ Same user confirmed during refresh')
      }

    } catch (error) {
      console.error('💥 Force refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, setUser, setProfile, clearAuth])

  // Initial auth setup with delay to avoid race conditions
  useEffect(() => {
    // Small delay to ensure any previous auth operations are complete
    const initTimer = setTimeout(() => {
      if (mountedRef.current) {
        initializeAuth()
      }
    }, 100)

    return () => clearTimeout(initTimer)
  }, [initializeAuth])

  // Auth state change listener with improved handling
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      console.log('🎯 Auth event:', event, session?.user?.id || 'no user')

      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('🚪 User signed out, clearing state')
        clearAuth()
        retryCountRef.current = 0
      } else if (event === 'SIGNED_IN') {
        console.log('🚪 User signed in:', session.user.id)

        // Reset retry counter on successful sign in
        retryCountRef.current = 0

        // Always update user on sign in
        setUser(session.user)

        // Load profile
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setProfile(profile)
          console.log('✅ Profile loaded after sign in')
        } catch (error) {
          console.error('Error loading profile for new user:', error)
          setProfile(null)
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed for user:', session.user.id)
        // Update user on token refresh
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, clearAuth])

  // Tab/window focus refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        console.log('👀 Tab visible, checking auth...')

        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }

        refreshTimeoutRef.current = setTimeout(() => {
          forceRefresh()
        }, 100)
      }
    }

    const handleFocus = () => {
      if (mountedRef.current) {
        console.log('🎯 Window focused, checking auth...')
        forceRefresh()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [forceRefresh])

  return <>{children}</>
}
