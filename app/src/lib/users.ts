import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { UserRole } from '../types/database'

export type CreatableRole = 'instructor' | 'program_coordinator' | 'executive_director'

export const CREATABLE_ROLES: { value: CreatableRole; label: string }[] = [
  { value: 'instructor', label: 'عضو هيئة تدريس' },
  { value: 'program_coordinator', label: 'منسق/ة برنامج' },
  { value: 'executive_director', label: 'المدير التنفيذي' },
]

export interface CreateUserInput {
  email: string
  password: string
  fullName: string
  role: CreatableRole
}

/**
 * إنشاء حساب من لوحة المدير دون التأثير على جلسة المدير الحالية.
 * يستخدم عميلاً منفصلاً لـ signUp ثم يحدّث الدور عبر جلسة المدير.
 */
export async function createUserAccount(
  input: CreateUserInput,
): Promise<{ error: string | null; userId?: string }> {
  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  // محاولة Edge Function إن وُجدت (موصى بها للإنتاج)
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: input.email.trim(),
        password: input.password,
        full_name: input.fullName.trim(),
        role: input.role,
      },
    })
    if (!error && data && (data as { ok?: boolean }).ok) {
      return { error: null, userId: (data as { userId?: string }).userId }
    }
  } catch {
    // نتابع بالطريقة البديلة
  }

  const temp = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  })

  const { data, error } = await temp.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.fullName.trim(),
        role: input.role,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  const userId = data.user?.id
  if (!userId) {
    return { error: 'تم إنشاء الطلب لكن لم يُرجع معرّف المستخدم. تحقق من إعدادات تأكيد البريد في Supabase.' }
  }

  // تأكيد الدور والاسم عبر صلاحيات المدير التنفيذي
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: input.fullName.trim(),
      role: input.role,
    },
    { onConflict: 'id' },
  )

  if (profileError) {
    // قد يفشل الإدراج بسبب RLS بينما التحديث ينجح
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: input.fullName.trim(),
        role: input.role,
      })
      .eq('id', userId)

    if (updateError) {
      return {
        error: `تم إنشاء الحساب في Auth لكن تعذّر ضبط الدور: ${updateError.message}`,
        userId,
      }
    }
  }

  await temp.auth.signOut()
  return { error: null, userId }
}

export async function updateUserRole(
  userId: string,
  role: CreatableRole,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  return { error: error?.message ?? null }
}

export async function updateUserName(
  userId: string,
  fullName: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export function isCreatableRole(role: UserRole | string): role is CreatableRole {
  return (
    role === 'instructor' ||
    role === 'program_coordinator' ||
    role === 'executive_director'
  )
}
