// src/lib/logout.ts
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export const performLogout = async () => {
  console.log('🚪 Starting complete logout process...')

  try {
    // 1. Clear Zustand state first
    const { clearAuth } = useAuthStore.getState()
    clearAuth()
    console.log('✅ Cleared Zustand auth state')

    // 2. Sign out from Supabase with global scope
    const { error } = await supabase.auth.signOut({ scope: 'global' })

    if (error) {
      console.error('❌ Supabase logout error:', error)
    } else {
      console.log('✅ Supabase logout successful')
    }

    // 3. Manual cookie clearing (more targeted)
    const cookies = document.cookie.split(";")
    cookies.forEach(function(cookie) {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()

      // Only clear auth-related cookies
      if (name.includes('sb-') || name.includes('auth') || name.includes('supabase')) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
      }
    })
    console.log('✅ Cleared auth cookies')

    // 4. Clear specific storage items
    try {
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]
      if (projectRef) {
        sessionStorage.removeItem(`sb-${projectRef}-auth-token`)
        localStorage.removeItem(`sb-${projectRef}-auth-token`)
      }

      // Clear any other auth-related items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('sb-') || key.includes('auth') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })

      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('sb-') || key.includes('auth') || key.includes('supabase')) {
          sessionStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.log('Storage clear partially failed, but continuing...', e)
    }

    // 5. Force full page reload to login to ensure clean state
    console.log('🔄 Redirecting to login with full reload...')
    window.location.href = '/login'

  } catch (error) {
    console.error('💥 Logout process failed completely:', error)
    // Even on total failure, force redirect
    window.location.href = '/login'
  }
}
