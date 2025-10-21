import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Info, Save, X, GripVertical, Trash2, User, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useRouter, useSearchParams } from 'next/navigation'

interface Exercise {
  id: string
  name: string
  description: string
  image_url_1: string | null
  image_url_2: string | null
  video_url: string | null
  equipment: string
  default_sets: number
  default_reps: number | null
  default_duration_seconds: number | null
}

interface Patient {
  id: string
  name: string
  birthdate: string | null
}

interface ProgramExercise {
  id: string
  exercise_id: string
  exercise_name: string
  sets: number
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number
  notes: string
  order_index: number
}

export default function ExerciseProgramBuilder() {
  const { user, profile } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [exercises, setExercises] = useState<Exercise[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>([])
  const [programName, setProgramName] = useState('')
  const [programDescription, setProgramDescription] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)

  // Hämta övningar och patienter
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Ladda program om programId finns i URL
  useEffect(() => {
    const programId = searchParams.get('programId')
    const patientId = searchParams.get('patientId')

    if (programId && user) {
      loadProgram(programId)
    } else if (patientId) {
      setSelectedPatient(patientId)
    }
  }, [searchParams, user])

  const loadData = async () => {
    setLoading(true)

    // Hämta övningar
    const { data: exerciseData, error: exerciseError } = await supabase
      .from('exercise_library')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (exerciseError) {
      console.error('Error loading exercises:', exerciseError)
    } else {
      setExercises(exerciseData || [])
    }

    // Hämta användarens patienter
    const { data: patientData, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user!.id)
      .order('name')

    if (patientError) {
      console.error('Error loading patients:', patientError)
    } else {
      setPatients(patientData || [])
    }

    setLoading(false)
  }

  const loadProgram = async (programId: string) => {
    setLoading(true)
    setIsEditMode(true)
    setEditingProgramId(programId)

    try {
      // Hämta program-info
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .eq('user_id', user!.id)
        .single()

      if (programError) throw programError

      setProgramName(program.name)
      setProgramDescription(program.description || '')
      setSelectedPatient(program.patient_id)

      // Hämta övningar i programmet
      const { data: programExercisesData, error: exercisesError } = await supabase
        .from('program_exercises')
        .select(`
          id,
          exercise_id,
          order_index,
          sets,
          reps,
          duration_seconds,
          rest_seconds,
          notes,
          exercise_library (
            name
          )
        `)
        .eq('program_id', programId)
        .order('order_index')

      if (exercisesError) throw exercisesError

      // Formatera övningar för state
      const formattedExercises: ProgramExercise[] = programExercisesData.map((ex: any) => ({
        id: ex.id,
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_library.name,
        sets: ex.sets,
        reps: ex.reps,
        duration_seconds: ex.duration_seconds,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes || '',
        order_index: ex.order_index
      }))

      setProgramExercises(formattedExercises)

    } catch (error) {
      console.error('Error loading program:', error)
      alert('Kunde inte ladda programmet')
      router.push('/dashboard/patients')
    } finally {
      setLoading(false)
    }
  }

  // Filter övningar baserat på sökning
  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Hitta vald patient
  const currentPatient = patients.find(p => p.id === selectedPatient)

  // Lägg till övning i program
  const addExerciseToProgram = (exercise: Exercise) => {
    const newExercise: ProgramExercise = {
      id: `program-ex-${Date.now()}`,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: exercise.default_sets,
      reps: exercise.default_reps,
      duration_seconds: exercise.default_duration_seconds,
      rest_seconds: 60,
      notes: '',
      order_index: programExercises.length
    }
    setProgramExercises([...programExercises, newExercise])
  }

  // Ta bort övning från program
  const removeExerciseFromProgram = (id: string) => {
    setProgramExercises(programExercises.filter(ex => ex.id !== id))
  }

  // Uppdatera övning i program
  const updateProgramExercise = (id: string, field: string, value: any) => {
    setProgramExercises(programExercises.map(ex =>
      ex.id === id ? { ...ex, [field]: value } : ex
    ))
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const items = [...programExercises]
    const draggedItemContent = items[draggedItem]
    items.splice(draggedItem, 1)
    items.splice(index, 0, draggedItemContent)

    setDraggedItem(index)
    setProgramExercises(items)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  // Spara eller uppdatera program
  const handleSaveProgram = async () => {
    if (!programName.trim()) {
      alert('Programmet måste ha ett namn')
      return
    }

    if (!selectedPatient) {
      alert('Du måste välja en patient')
      return
    }

    if (programExercises.length === 0) {
      alert('Programmet måste innehålla minst en övning')
      return
    }

    setSaving(true)

    try {
      if (isEditMode && editingProgramId) {
        // UPPDATERA befintligt program

        // 1. Uppdatera program-info
        const { error: programError } = await supabase
          .from('programs')
          .update({
            name: programName,
            description: programDescription,
            patient_id: selectedPatient
          })
          .eq('id', editingProgramId)

        if (programError) throw programError

        // 2. Radera gamla övningar
        const { error: deleteError } = await supabase
          .from('program_exercises')
          .delete()
          .eq('program_id', editingProgramId)

        if (deleteError) throw deleteError

        // 3. Lägg till nya övningar
        const exercisesToInsert = programExercises.map((ex, index) => ({
          program_id: editingProgramId,
          exercise_id: ex.exercise_id,
          order_index: index,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes
        }))

        const { error: exercisesError } = await supabase
          .from('program_exercises')
          .insert(exercisesToInsert)

        if (exercisesError) throw exercisesError

        alert(`Program "${programName}" uppdaterat!`)

      } else {
        // SKAPA nytt program

        // 1. Skapa programmet
        const { data: program, error: programError } = await supabase
          .from('programs')
          .insert({
            user_id: user!.id,
            patient_id: selectedPatient,
            name: programName,
            description: programDescription,
            is_template: false,
            is_global_template: false
          })
          .select()
          .single()

        if (programError) throw programError

        // 2. Lägg till övningar i programmet
        const exercisesToInsert = programExercises.map((ex, index) => ({
          program_id: program.id,
          exercise_id: ex.exercise_id,
          order_index: index,
          sets: ex.sets,
          reps: ex.reps,
          duration_seconds: ex.duration_seconds,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes
        }))

        const { error: exercisesError } = await supabase
          .from('program_exercises')
          .insert(exercisesToInsert)

        if (exercisesError) throw exercisesError

        alert(`Program "${programName}" sparat för ${currentPatient?.name}!`)
      }

      // Redirect tillbaka till patient-vy
      router.push('/dashboard/patients')

    } catch (error) {
      console.error('Error saving program:', error)
      alert('Ett fel uppstod när programmet skulle sparas')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleBackToPatients = () => {
    if (programExercises.length > 0) {
      if (!confirm('Du har osparade ändringar. Vill du verkligen lämna?')) {
        return
      }
    }
    router.push('/dashboard/patients')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Laddar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-[1800px] mx-auto px-6">
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
                  onClick={handleBackToPatients}
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
                >
                  Patienter
                </button>
                <button
                  className="text-indigo-600 hover:text-indigo-800 px-3 py-2 rounded-md text-sm font-medium bg-indigo-50"
                >
                  {isEditMode ? 'Redigera program' : 'Skapa program'}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Hej, <span className="font-medium">{profile?.full_name}</span>!
              </div>
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

      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToPatients}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Tillbaka till patienter"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Redigera träningsprogram' : 'Skapa träningsprogram'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isEditMode ? 'Uppdatera programmet och spara ändringar' : 'Välj patient, sök efter övningar och bygg programmet'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveProgram}
            disabled={programExercises.length === 0 || !selectedPatient || !programName.trim() || saving}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Sparar...' : isEditMode ? 'Uppdatera program' : 'Spara program'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="grid grid-cols-12 gap-6">

          {/* Left Side - Program Builder */}
          <div className="col-span-7 space-y-4">

            {/* Patient Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                {isEditMode ? 'Patient' : 'Välj patient'}
              </h2>

              {patients.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-3">Du har inga patienter ännu</p>
                  <button
                    onClick={() => router.push('/dashboard/patients')}
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    Gå till patienter för att lägga till
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <select
                    value={selectedPatient || ''}
                    onChange={(e) => setSelectedPatient(e.target.value || null)}
                    disabled={isEditMode}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Välj en patient --</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name}
                        {patient.birthdate && ` (${new Date().getFullYear() - new Date(patient.birthdate).getFullYear()} år)`}
                      </option>
                    ))}
                  </select>

                  {currentPatient && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {currentPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {isEditMode ? 'Redigerar program för:' : 'Skapar program för:'}
                        </p>
                        <p className="text-indigo-700 font-semibold">{currentPatient.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Program Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Programinformation</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Programnamn *
                  </label>
                  <input
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="T.ex. Rehab knä vecka 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beskrivning (valfritt)
                  </label>
                  <textarea
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    placeholder="Beskriv programmets syfte och mål..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Program Exercises */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Övningar i program ({programExercises.length})
              </h2>

              {programExercises.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">Inga övningar tillagda</p>
                  <p className="text-sm text-gray-500">Klicka på + vid en övning till höger för att lägga till</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {programExercises.map((ex, index) => (
                    <div
                      key={ex.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`bg-gray-50 rounded-lg p-4 border-2 transition-all ${
                        draggedItem === index ? 'border-indigo-500 opacity-50' : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button className="cursor-move mt-2 text-gray-400 hover:text-gray-600">
                          <GripVertical className="w-5 h-5" />
                        </button>

                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <h3 className="font-semibold text-gray-900">{ex.exercise_name}</h3>
                            </div>
                            <button
                              onClick={() => removeExerciseFromProgram(ex.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Set
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={ex.sets}
                                onChange={(e) => updateProgramExercise(ex.id, 'sets', parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>

                            {ex.reps !== null && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={ex.reps}
                                  onChange={(e) => updateProgramExercise(ex.id, 'reps', parseInt(e.target.value))}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            )}

                            {ex.duration_seconds !== null && (
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Tid (sek)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={ex.duration_seconds}
                                  onChange={(e) => updateProgramExercise(ex.id, 'duration_seconds', parseInt(e.target.value))}
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            )}

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Vila (sek)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={ex.rest_seconds}
                                onChange={(e) => updateProgramExercise(ex.id, 'rest_seconds', parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>

                          <div className="mt-3">
                            <input
                              type="text"
                              value={ex.notes}
                              onChange={(e) => updateProgramExercise(ex.id, 'notes', e.target.value)}
                              placeholder="Anteckningar (t.ex. 'fokus på form', 'öka belastning nästa vecka')"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Exercise Library */}
          <div className="col-span-5">
            <div className="bg-white rounded-lg shadow-sm border sticky top-6">
              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sök övningar..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Exercise List */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {exercises.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium mb-2">Inga övningar i biblioteket</p>
                    <p className="text-sm text-gray-500 mb-4">
                      Du behöver lägga till övningar i Supabase först
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm">
                      <p className="font-medium text-blue-900 mb-2">📝 Så lägger du till övningar:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Gå till Supabase Table Editor</li>
                        <li>Välj tabellen "exercise_library"</li>
                        <li>Klicka "Insert" → "Insert row"</li>
                        <li>Fyll i minst: name, description, equipment, default_sets, default_reps</li>
                      </ol>
                    </div>
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">Inga övningar matchade din sökning</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredExercises.map((exercise) => (
                      <div
                        key={exercise.id}
                        className="group p-4 hover:bg-gray-50 transition-colors relative"
                      >
                        <div className="flex gap-3">
                          {exercise.image_url_1 ? (
                            <img
                              src={exercise.image_url_1}
                              alt={exercise.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">Ingen bild</span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {exercise.name}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {exercise.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded capitalize">
                                {exercise.equipment}
                              </span>
                              <span className="text-xs text-gray-500">
                                {exercise.default_sets} × {exercise.default_reps || `${exercise.default_duration_seconds}s`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedExercise(exercise)}
                            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 border"
                            title="Visa mer info"
                          >
                            <Info className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => addExerciseToProgram(exercise)}
                            className="p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700"
                            title="Lägg till i program"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{selectedExercise.name}</h2>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {(selectedExercise.image_url_1 || selectedExercise.image_url_2) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedExercise.image_url_1 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Startposition</p>
                      <img
                        src={selectedExercise.image_url_1}
                        alt="Start"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  {selectedExercise.image_url_2 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Slutposition</p>
                      <img
                        src={selectedExercise.image_url_2}
                        alt="Slut"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Beskrivning</h3>
                <p className="text-gray-600">{selectedExercise.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Utrustning</p>
                  <p className="font-semibold text-gray-900 capitalize">{selectedExercise.equipment}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Set</p>
                  <p className="font-semibold text-gray-900">{selectedExercise.default_sets}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Reps/Tid</p>
                  <p className="font-semibold text-gray-900">
                    {selectedExercise.default_reps || `${selectedExercise.default_duration_seconds}s`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  addExerciseToProgram(selectedExercise)
                  setSelectedExercise(null)
                }}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Lägg till i program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
