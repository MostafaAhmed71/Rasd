import { useCallback, useEffect, useState } from 'react'
import { Alert } from '../../components/Alert'
import { useAuth } from '../../contexts/AuthContext'
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus'
import { supabase } from '../../lib/supabase'
import type { GeneralTask } from '../../types/database'

const DEFAULT_TITLES = [
  'تحديث بيانات التواصل',
  'تسليم تقرير منتصف الفصل',
  'حضور اجتماع القسم',
  'مراجعة توصيف مقرر',
]

export function TasksPage() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<GeneralTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')

  const ensureDefaults = useCallback(async (instructorId: string) => {
    const { data } = await supabase
      .from('general_tasks')
      .select('id')
      .eq('instructor_id', instructorId)
      .limit(1)

    if ((data?.length ?? 0) > 0) return

    await supabase.from('general_tasks').insert(
      DEFAULT_TITLES.map((title) => ({
        instructor_id: instructorId,
        title,
        is_done: false,
      })),
    )
  }, [])

  const loadTasks = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setError(null)
    await ensureDefaults(profile.id)

    const { data, error: err } = await supabase
      .from('general_tasks')
      .select('*')
      .eq('instructor_id', profile.id)
      .order('created_at')

    if (err) setError(err.message)
    else setTasks((data as GeneralTask[]) ?? [])
    setLoading(false)
  }, [profile?.id, ensureDefaults])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useRefreshOnFocus(() => loadTasks())

  const toggleTask = async (task: GeneralTask) => {
    const next = !task.is_done
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t)))
    const { error: err } = await supabase
      .from('general_tasks')
      .update({ is_done: next })
      .eq('id', task.id)
    if (err) {
      setError(err.message)
      void loadTasks()
    }
  }

  const addTask = async () => {
    if (!profile?.id || !newTitle.trim()) return
    const { error: err } = await supabase.from('general_tasks').insert({
      instructor_id: profile.id,
      title: newTitle.trim(),
      is_done: false,
    })
    if (err) setError(err.message)
    else {
      setNewTitle('')
      void loadTasks()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-primary-dark">مهام أخرى</h2>
        <p className="mt-1 text-sm text-text-secondary">قائمة مهام إدارية عامة</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="panel flex gap-2 p-4">
        <input
          className="field-input"
          placeholder="مهمة جديدة..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addTask()
          }}
        />
        <button type="button" className="btn-primary shrink-0" onClick={() => void addTask()}>
          إضافة
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-40 w-full" />
      ) : (
        <ul className="panel divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={task.is_done}
                onChange={() => void toggleTask(task)}
                className="h-5 w-5 accent-primary-dark"
              />
              <span
                className={`flex-1 text-sm ${
                  task.is_done ? 'text-text-secondary line-through' : 'text-text-primary'
                }`}
              >
                {task.title}
              </span>
              {task.is_done && <span className="text-primary">✓</span>}
            </li>
          ))}
          {tasks.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-text-secondary">لا توجد مهام</li>
          )}
        </ul>
      )}
    </div>
  )
}
