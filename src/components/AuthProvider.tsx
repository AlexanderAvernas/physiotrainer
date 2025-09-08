// 'use client'

// import { useEffect } from 'react'
// import { supabase } from '@/lib/supabase/client'
// import { useAuthStore } from '@/stores/authStore'

// export default function AuthProvider({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   const { setUser, setProfile, setLoading } = useAuthStore()

//   useEffect(() => {
//     // SÄKER: Hämta initial användare med getUser()
//     const getInitialUser = async () => {
//       const { data: { user } } = await supabase.auth.getUser()
//       setUser(user)

//       if (user) {
//         const { data: profile } = await supabase
//           .from('profiles')
//           .select('*')
//           .eq('id', user.id)
//           .single()

//         setProfile(profile)
//       }

//       setLoading(false)
//     }

//     getInitialUser()

//     // Lyssna på auth changes
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange(async (event, session) => {
//       // Detta är OK - session kommer från auth event, inte localStorage
//       setUser(session?.user ?? null)

//       if (session?.user) {
//         const { data: profile } = await supabase
//           .from('profiles')
//           .select('*')
//           .eq('id', session.user.id)
//           .single()

//         setProfile(profile)
//       } else {
//         setProfile(null)
//       }
//     })

//     return () => subscription.unsubscribe()
//   }, [setUser, setProfile, setLoading])

//   return <>{children}</>
// }

// src/components/AuthProvider.tsx
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
  const { setUser, setProfile, setLoading, clearAuth } = useAuthStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Force refresh när tabs blir aktiva
  const forceRefresh = useCallback(async () => {
    if (!mountedRef.current || isRefreshing) return

    console.log('Force refreshing auth state...')
    setIsRefreshing(true)
    setLoading(true)

    try {
      // 1. Försök refresha session först
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshData.session?.user && !refreshError) {
        console.log('Session refreshed successfully')
        setUser(refreshData.session.user)

        // Hämta profil
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', refreshData.session.user.id)
          .single()

        if (profile && !profileError) {
          setProfile(profile)
        } else {
          console.error('Failed to load profile after refresh:', profileError)
        }
      } else {
        // 2. Om refresh misslyckas, försök getUser
        console.log('Session refresh failed, trying getUser...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (user && !userError) {
          setUser(user)

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profile && !profileError) {
            setProfile(profile)
          }
        } else {
          // 3. Helt reset om allt misslyckas
          console.log('All auth methods failed, clearing auth state')
          clearAuth()
        }
      }
    } catch (error) {
      console.error('Force refresh failed:', error)
      clearAuth()
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [isRefreshing, setUser, setProfile, setLoading, clearAuth])

  // Initial auth load
  useEffect(() => {
    forceRefresh()
  }, [forceRefresh])

  // Lyssna på auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      console.log('Auth state changed:', event, session?.user?.id || 'no user')

      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('User signed out, clearing all auth state')
        clearAuth()
        // Force rensa alla Supabase caches
        await supabase.auth.signOut()
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('User signed in:', session.user.id)
        setUser(session.user)

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setProfile(profile)
        } catch (error) {
          console.error('Error loading profile on auth change:', error)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, clearAuth])

  // Aggressiv tab/focus hantering
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        console.log('Tab became visible, force refreshing...')

        // Vänta lite innan refresh för att låta browser stabilisera
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
        console.log('Window focused, force refreshing...')
        forceRefresh()
      }
    }

    // Extra aggressiv - lyssna även på mouse movement efter tab switch
    const handleMouseMove = () => {
      if (document.visibilityState === 'visible' && mountedRef.current && !isRefreshing) {
        // Ta bort event listener efter första mouse move
        document.removeEventListener('mousemove', handleMouseMove)

        // Mini-delay för att inte spamma
        setTimeout(() => {
          forceRefresh()
        }, 50)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Lägg till mouse move listener när tab blir synlig
    const addMouseListener = () => {
      if (document.visibilityState === 'visible') {
        document.addEventListener('mousemove', handleMouseMove, { once: true })
      }
    }

    document.addEventListener('visibilitychange', addMouseListener)

    return () => {
      mountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', addMouseListener)
      document.removeEventListener('mousemove', handleMouseMove)

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [forceRefresh, isRefreshing])

  return <>{children}</>
}
