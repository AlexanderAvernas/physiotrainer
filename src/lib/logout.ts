// src/lib/logout.ts
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

export const performLogout = async () => {
  console.log('🚪 Starting complete logout process...')

  try {
    // 1. Rensa Zustand state först
    const { clearAuth } = useAuthStore.getState()
    clearAuth()
    console.log('✅ Cleared Zustand auth state')

    // 2. Signout från Supabase med global scope
    const { error } = await supabase.auth.signOut({ scope: 'global' })

    if (error) {
      console.error('❌ Supabase logout error:', error)
    } else {
      console.log('✅ Supabase logout successful')
    }

    // 3. Rensa alla cookies manuellt
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    })
    console.log('✅ Cleared all cookies')

    // 4. Rensa sessionStorage och localStorage
    try {
      sessionStorage.clear()
      localStorage.removeItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
    } catch (e) {
      console.log('Cookie/storage clear partially failed, but continuing...')
    }

    // 5. Force redirect med window.location för att säkerställa full reset
    console.log('🔄 Redirecting to login...')
    window.location.href = '/login'

  } catch (error) {
    console.error('💥 Logout process failed completely:', error)
    // Även vid total failure, force redirect
    window.location.href = '/login'
  }
}
