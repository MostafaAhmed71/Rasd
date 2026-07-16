-- Edge Function: إنشاء مستخدم بصلاحية المدير (Service Role)
-- انشرها عبر: supabase functions deploy create-user
-- وأضف السر: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await caller.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'جلسة غير صالحة' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await caller
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      !profile ||
      (profile.role !== 'executive_director' && profile.role !== 'admin')
    ) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح — للمدير التنفيذي فقط' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const email = String(body.email ?? '').trim()
    const password = String(body.password ?? '')
    const fullName = String(body.full_name ?? '').trim()
    const role = String(body.role ?? 'instructor')

    if (!email || !password || password.length < 6 || !fullName) {
      return new Response(JSON.stringify({ ok: false, error: 'بيانات ناقصة' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['instructor', 'program_coordinator', 'executive_director'].includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: 'دور غير صالح' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (data.user) {
      await admin.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        role,
      })
    }

    return new Response(JSON.stringify({ ok: true, userId: data.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
