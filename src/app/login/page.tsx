// src/app/login/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log('User already logged in, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, router])

  // Clear any existing auth state when component mounts
  useEffect(() => {
    console.log('Login page mounted, ensuring clean state...')
    clearAuth()
  }, [clearAuth])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Starting login process...')

    try {
      // Clear any existing session first
      await supabase.auth.signOut({ scope: 'global' })

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 200))

      // Attempt login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (loginError) {
        console.error('Login error:', loginError)
        setError(loginError.message)
        return
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id)

        // Wait longer for auth state to propagate properly
        console.log('Waiting for auth state to propagate...')

        // Use a longer delay and multiple checks
        let authStateReady = false
        let attempts = 0
        const maxAttempts = 10

        while (!authStateReady && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 300))

          // Check if auth state has propagated by verifying the session
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData.session?.user?.id === data.user.id) {
            console.log('Auth state confirmed, ready to redirect')
            authStateReady = true
          } else {
            attempts++
            console.log(`Waiting for auth state... attempt ${attempts}/${maxAttempts}`)
          }
        }

        if (!authStateReady) {
          console.log('Auth state not fully ready, but proceeding with redirect')
        }

        // Use replace to avoid back button issues and add a small additional delay
        redirectTimeoutRef.current = setTimeout(() => {
          console.log('Redirecting to dashboard...')
          router.replace('/dashboard')
        }, 100)
      }

    } catch (error: any) {
      console.error('Login process failed:', error)
      setError('Ett oväntat fel uppstod. Försök igen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Logga in på ditt konto
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Eller{' '}
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              skapa ett nytt konto
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10"
                placeholder="Email"
                disabled={loading}
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10"
                placeholder="Lösenord"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
