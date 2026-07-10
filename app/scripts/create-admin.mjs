import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [key, ...rest] = line.split('=')
      return [key, rest.join('=')]
    }),
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const email = 'admin@g.com'
const password = 'admin123'

const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: 'مسؤول النظام',
      role: 'admin',
    },
  },
})

if (error) {
  console.error('خطأ:', error.message)
  process.exit(1)
}

if (data.user && !data.session) {
  console.log('تم إنشاء الحساب. قد تحتاج لتأكيد البريد أو تعطيل Confirm email في Supabase.')
} else if (data.session) {
  console.log('تم إنشاء حساب Admin وتسجيل الدخول بنجاح.')
} else {
  console.log('تم إرسال الطلب. تحقق من لوحة Supabase.')
}

console.log(`البريد: ${email}`)
