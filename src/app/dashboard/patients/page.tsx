// src/app/dashboard/patients/page.tsx
'use client'


import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import AddPatientModal from '@/components/AddPatientModal'
import { User, FileText, Edit, Trash2, Plus, ChevronRight } from 'lucide-react'

interface Patient {
  id: string
  name: string
  birthdate: string | null
  created_at: string | null
}

interface Program {
  id: string
  name: string
  description: string | null
  created_at: string
  exercise_count: number
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientPrograms, setPatientPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPrograms, setLoadingPrograms] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { user, profile } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      loadPatients()
    }
  }, [user])

  const loadPatients = async () => {
    if (!user) return

    setLoading(true)
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading patients:', error)
    } else {
      setPatients(data || [])
    }
    setLoading(false)
  }

  const loadPatientPrograms = async (patientId: string) => {
    setLoadingPrograms(true)

    // Hämta program för patienten
    const { data: programs, error: programsError } = await supabase
      .from('programs')
      .select('id, name, description, created_at')
      .eq('patient_id', patientId)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (programsError) {
      console.error('Error loading programs:', programsError)
      setPatientPrograms([])
      setLoadingPrograms(false)
      return
    }

    // Hämta antal övningar för varje program
    const programsWithCount = await Promise.all(
      (programs || []).map(async (program) => {
        const { count } = await supabase
          .from('program_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('program_id', program.id)

        return {
          ...program,
          exercise_count: count || 0
        }
      })
    )

    setPatientPrograms(programsWithCount)
    setLoadingPrograms(false)
  }

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    loadPatientPrograms(patient.id)
  }

  const handleOpenProgram = (programId: string) => {
    // Navigera till exercises-sidan med program-id
    router.push(`/dashboard/exercices?programId=${programId}`)
  }

  const handleCreateProgram = (patient: Patient) => {
    // Navigera till exercises-sidan med patient förvald
    router.push(`/dashboard/exercices?patientId=${patient.id}`)
  }

  const handleDeleteProgram = async (programId: string, programName: string) => {
    if (!confirm(`Är du säker på att du vill radera programmet "${programName}"?`)) {
      return
    }

    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', programId)

    if (error) {
      alert('Ett fel uppstod när programmet skulle raderas')
      console.error('Error deleting program:', error)
    } else {
      // Ladda om program för vald patient
      if (selectedPatient) {
        loadPatientPrograms(selectedPatient.id)
      }
    }
  }

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return null
    const today = new Date()
    const birth = new Date(birthdate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Okänt datum'
    return new Date(dateString).toLocaleDateString('sv-SE')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Laddar...</div>
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
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xl font-semibold text-gray-900 hover:text-indigo-600"
              >
                Fysio<span className="text-indigo-600">SaaS</span>
              </button>
              <div className="hidden md:flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Dashboard
                </button>
                <button
                  className="text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium bg-indigo-50"
                >
                  Patienter
                </button>
                <button
                  onClick={() => router.push('/dashboard/exercises')}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Skapa program
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
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Patienter</h1>
              <p className="text-gray-600 mt-1">Hantera dina patienter och deras träningsprogram</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Lägg till patient
            </button>
          </div>

          {/* Patients Grid */}
          {loading ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : patients.length === 0 ? (
            <div className="bg-white rounded-lg shadow">
              <div className="p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Inga patienter ännu</h3>
                <p className="text-gray-500 mb-6">Lägg till din första patient för att komma igång</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Lägg till patient
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side - Patient List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b">
                    <h2 className="font-semibold text-gray-900">Alla patienter ({patients.length})</h2>
                  </div>
                  <div className="divide-y max-h-[calc(100vh-300px)] overflow-y-auto">
                    {patients.map((patient) => {
                      const age = calculateAge(patient.birthdate)
                      const isSelected = selectedPatient?.id === patient.id

                      return (
                        <button
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className={`w-full p-4 hover:bg-gray-50 transition-colors text-left ${
                            isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-indigo-600' : 'bg-indigo-100'
                              }`}>
                                <span className={`text-lg font-medium ${
                                  isSelected ? 'text-white' : 'text-indigo-600'
                                }`}>
                                  {patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{patient.name}</h3>
                                {age !== null && (
                                  <p className="text-sm text-gray-500">{age} år</p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 ${
                              isSelected ? 'text-indigo-600' : 'text-gray-400'
                            }`} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Side - Patient Details & Programs */}
              <div className="lg:col-span-2">
                {selectedPatient ? (
                  <div className="space-y-6">
                    {/* Patient Info Card */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">
                              {selectedPatient.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.name}</h2>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              {selectedPatient.birthdate && (
                                <>
                                  <span>Född: {formatDate(selectedPatient.birthdate)}</span>
                                  <span>•</span>
                                  <span>{calculateAge(selectedPatient.birthdate)} år</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCreateProgram(selectedPatient)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center text-sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Nytt program
                        </button>
                      </div>
                    </div>

                    {/* Programs List */}
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Träningsprogram
                        </h3>
                      </div>

                      {loadingPrograms ? (
                        <div className="p-6">
                          <div className="animate-pulse space-y-4">
                            {[...Array(2)].map((_, i) => (
                              <div key={i} className="h-20 bg-gray-200 rounded"></div>
                            ))}
                          </div>
                        </div>
                      ) : patientPrograms.length === 0 ? (
                        <div className="p-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-600 mb-1">Inga program ännu</p>
                          <p className="text-sm text-gray-500 mb-4">
                            Skapa ett träningsprogram för {selectedPatient.name}
                          </p>
                          <button
                            onClick={() => handleCreateProgram(selectedPatient)}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors text-sm"
                          >
                            Skapa program
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {patientPrograms.map((program) => (
                            <div
                              key={program.id}
                              className="p-6 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                    {program.name}
                                  </h4>
                                  {program.description && (
                                    <p className="text-sm text-gray-600 mb-2">
                                      {program.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <FileText className="w-4 h-4" />
                                      {program.exercise_count} övningar
                                    </span>
                                    <span>•</span>
                                    <span>Skapad: {formatDate(program.created_at)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <button
                                    onClick={() => handleOpenProgram(program.id)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    title="Öppna och redigera"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProgram(program.id, program.name)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Radera program"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">Välj en patient</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Klicka på en patient till vänster för att se deras program
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Patient Modal */}
      <AddPatientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPatientAdded={loadPatients}
      />
    </div>
  )
}
