// src/app/dashboard/page.tsx
'use client'

import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import AddPatientModal from '@/components/AddPatientModal'
import { performLogout } from '@/lib/logout'

export default function DashboardPage() {
  const { user, profile, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stats, setStats] = useState({
    patients: 0,
    programs: 0,
    exercises: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    console.log('Loading dashboard stats...')
    setError(null)

    try {
      // Verifiera user först
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        console.error('User verification failed in dashboard:', userError)
        router.push('/login')
        return
      }

      // Parallella API-anrop för bättre prestanda
      const [patientsResult, programsResult, exercisesResult] = await Promise.allSettled([
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id),

        supabase
          .from('programs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', currentUser.id),

        supabase
          .from('exercise_library')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
      ])

      // Hantera resultat
      const patientCount = patientsResult.status === 'fulfilled'
        ? (patientsResult.value.count || 0)
        : 0

      const programCount = programsResult.status === 'fulfilled'
        ? (programsResult.value.count || 0)
        : 0

      const exerciseCount = exercisesResult.status === 'fulfilled'
        ? (exercisesResult.value.count || 0)
        : 0

      // Logga fel men fortsätt ändå
      if (patientsResult.status === 'rejected') {
        console.error('Failed to load patients count:', patientsResult.reason)
      }
      if (programsResult.status === 'rejected') {
        console.error('Failed to load programs count:', programsResult.reason)
      }
      if (exercisesResult.status === 'rejected') {
        console.error('Failed to load exercises count:', exercisesResult.reason)
      }

      setStats({
        patients: patientCount,
        programs: programCount,
        exercises: exerciseCount
      })

      console.log('Dashboard stats loaded:', { patientCount, programCount, exerciseCount })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      setError('Kunde inte ladda dashboard-data')
    } finally {
      setLoading(false)
    }
  }, [user?.id, router])

  // Ladda stats när user är tillgänglig
  useEffect(() => {
    if (!authLoading && user) {
      loadStats()
    } else if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, loadStats, router])

  // Force refresh på tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !loading) {
        console.log('Dashboard tab visible, refreshing stats...')
        loadStats()
      }
    }

    const handleFocus = () => {
      if (user && !loading) {
        console.log('Dashboard focused, refreshing stats...')
        loadStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, loading, loadStats])

  const handleLogout = () => {
  performLogout()
}

  const handleRetry = () => {
    setLoading(true)
    loadStats()
  }

  // Visa loading medan auth laddar
  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Laddar dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">
                Fysio<span className="text-indigo-600">SaaS</span>
              </h1>
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium bg-indigo-50"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/dashboard/patients')}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Patienter
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Hej, <span className="font-medium">{profile.full_name}</span>!
              </div>
              {profile.is_admin && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                  Admin
                </span>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm"
              >
                Logga ut
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Dashboard-fel</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200"
                  >
                    Försök igen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Välkommen till din dashboard!
            </h2>
            <p className="text-indigo-100">
              Här kan du hantera dina patienter, skapa träningsprogram och följa framsteg.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Patienter</p>
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      stats.patients
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Program</p>
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      stats.programs
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Övningar</p>
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? (
                      <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      stats.exercises
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Snabbåtgärder</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group"
                >
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">Lägg till patient</span>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/dashboard/patients')}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group"
                >
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">Patienter</span>
                  </div>
                </button>

                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">Skapa program</span>
                  </div>
                </button>

                <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">Bläddra övningar</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Senaste aktivitet</h3>
              <div className="space-y-4">
                <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Välkommen till FysioSaaS!</p>
                    <p className="text-sm text-gray-500">Du är nu godkänd och kan börja använda systemet.</p>
                  </div>
                </div>

                <div className="text-center py-8 text-gray-500">
                  <p>Ingen tidigare aktivitet att visa.</p>
                  <p className="text-sm">Börja genom att lägga till din första patient!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPatientAdded={() => {
          loadStats()
          setIsModalOpen(false)
        }}
      />
    </div>
  )
}
