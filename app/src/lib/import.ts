import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { ImportRow } from '../types/database'

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  'اسم الطالب': 'full_name',
  'الرقم الجامعي': 'university_id',
  'التخصص': 'major',
  'المقرر': 'course',
  'النوع': 'type',
  'الفترة': 'period',
  'اسم الدكتور': 'instructor_name',
  'مدرس المقرر': 'instructor_name',
  'عضو التدريس': 'instructor_name',
  'اسم عضو التدريس': 'instructor_name',
  'الرقم المرجعي': 'section_number',
  'رقم الشعبة': 'section_number',
  'رمز المقرر': 'course_code',
}

function normalizeHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ')
}

function parseRow(raw: Record<string, unknown>): ImportRow | null {
  const mapped: Partial<ImportRow> = {}

  for (const [key, value] of Object.entries(raw)) {
    const field = COLUMN_MAP[normalizeHeader(key)]
    if (!field) continue
    if (field === 'section_number') {
      const num = Number(String(value ?? '').trim())
      if (!Number.isFinite(num)) continue
      mapped.section_number = num
    } else {
      mapped[field] = String(value ?? '').trim() as never
    }
  }

  if (!mapped.university_id || !mapped.full_name || !mapped.section_number) {
    return null
  }

  return mapped as ImportRow
}

export async function parseImportFile(file: File): Promise<ImportRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data.map(parseRow).filter((r): r is ImportRow => r !== null)
          resolve(rows)
        },
        error: (err) => reject(err),
      })
    })
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
  return json.map(parseRow).filter((r): r is ImportRow => r !== null)
}
