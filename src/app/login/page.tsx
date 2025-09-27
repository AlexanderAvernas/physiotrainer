// src/app/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('Starting login process...')

    try {
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

        // VÄNTA på att auth state uppdateras innan redirect
        console.log('Waiting for auth state update...')

        // Kolla om AuthProvider har uppdaterat state
        const checkAuthState = () => {
          return new Promise<void>((resolve) => {
            const maxWait = 3000 // Max 3 sekunder
            const startTime = Date.now()

            const check = () => {
              const currentState = useAuthStore.getState()

              // Om vi har user i state ELLER för lång tid gått - fortsätt
              if (currentState.user?.id === data.user.id || (Date.now() - startTime) > maxWait) {
                console.log('Auth state ready or timeout reached, redirecting...')
                resolve()
              } else {
                // Vänta lite till och försök igen
                setTimeout(check, 100)
              }
            }

            check()
          })
        }

        await checkAuthState()

        console.log('About to redirect to dashboard...')

        // FÖRST - testa bara window.location direkt
        console.log('Using window.location.href directly...')
        window.location.href = '/dashboard'

        console.log('Redirect command executed')

        // Om vi når hit betyder det att window.location inte fungerade
        setTimeout(() => {
          console.log('Still here after window.location - something blocked it')
        }, 500)
      }

    } catch (error: unknown) {
      console.error('Login process failed:', error)
      if (error instanceof Error) {
        setError(`Ett fel uppstod: ${error.message}`)
      } else {
        setError('Ett oväntat fel uppstod. Försök igen.')
      }
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
