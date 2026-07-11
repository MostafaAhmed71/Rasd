import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { Profile, Program } from '../../types/database'

export function ExecutiveProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [instructors, setInstructors] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedCoordinator, setSelectedCoordinator] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [programsRes, instructorsRes] = await Promise.all([
      supabase.from('programs').select('*, profiles:coordinator_id(full_name)').order('name'),
      supabase
        .from('profiles')
        .select('*')
        .in('role', ['instructor', 'program_coordinator'])
        .order('full_name'),
    ])
    if (programsRes.error) setError(programsRes.error.message)
    else setPrograms((programsRes.data as Program[]) ?? [])
    setInstructors((instructorsRes.data as Profile[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useRefreshOnFocus(() => load())

  const createProgram = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const { error: err } = await supabase.from('programs').insert({ name: newName.trim() })
    if (err) setError(err.message)
    else {
      setNewName('')
      setMessage('تم إنشاء البرنامج')
      void load()
    }
  }

  const assignCoordinator = async (programId: string) => {
    if (!selectedCoordinator) return
    const { error: err } = await supabase
      .from('programs')
      .update({ coordinator_id: selectedCoordinator })
      .eq('id', programId)

    if (err) {
      setError(err.message)
      return
    }

    await supabase
      .from('profiles')
      .update({ role: 'program_coordinator' })
      .eq('id', selectedCoordinator)

    setAssigningId(null)
    setSelectedCoordinator('')
    setMessage('تم تعيين المنسق')
    void load()
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">
          كل البرامج وتعيين المنسقين
        </h2>
        <p className="mt-1 text-sm text-text-secondary">إدارة البرامج وترقية الأعضاء لمنسقين</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <form onSubmit={(e) => void createProgram(e)} className="panel flex gap-2 p-4">
        <input
          className="field-input"
          placeholder="اسم برنامج جديد..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">
          إضافة برنامج
        </button>
      </form>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => {
            const coordinatorName =
              (program.profiles as { full_name: string | null } | null)?.full_name ?? null
            const isAssigning = assigningId === program.id
            return (
              <article key={program.id} className="panel flex flex-col p-5">
                <h3 className="font-display text-lg font-bold text-primary-dark">{program.name}</h3>
                <p className="mt-2 text-sm text-text-secondary">
                  المنسق: {coordinatorName ?? 'لم يُعيَّن'}
                </p>

                {isAssigning ? (
                  <div className="mt-4 space-y-2">
                    <select
                      className="field-input"
                      value={selectedCoordinator}
                      onChange={(e) => setSelectedCoordinator(e.target.value)}
                    >
                      <option value="">اختر عضواً...</option>
                      {instructors.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.full_name ?? inst.id}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-primary flex-1 text-sm"
                        onClick={() => void assignCoordinator(program.id)}
                      >
                        تأكيد
                      </button>
                      <button
                        type="button"
                        className="btn-secondary flex-1 text-sm"
                        onClick={() => {
                          setAssigningId(null)
                          setSelectedCoordinator('')
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`mt-auto pt-4 text-sm ${coordinatorName ? 'btn-secondary' : 'btn-primary'} w-full`}
                    onClick={() => setAssigningId(program.id)}
                  >
                    {coordinatorName ? 'تغيير المنسق' : 'تعيين منسق'}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
