'use client'

import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function PendingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const checkApproval = async () => {
    setChecking(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .single()

      if (profile?.is_approved) {
        router.push('/dashboard')
      } else {
        alert('Du är fortfarande inte godkänd. Försök igen senare.')
      }
    }
    setChecking(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Väntar på godkännande
          </h1>

          <p className="text-gray-600 mb-6">
            Ditt konto håller på att granskas. Du kommer få tillgång så snart vi har godkänt dig.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Tips:</strong> Processen tar normalt 1-24 timmar.
              Kontakta oss om det tar längre tid.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={checkApproval}
              disabled={checking}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? 'Kontrollerar...' : 'Kontrollera status'}
            </button>

            <button
              onClick={handleLogout}
              className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
            >
              Logga ut
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
