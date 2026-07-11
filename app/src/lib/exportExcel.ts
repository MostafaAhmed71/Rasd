import ExcelJS from 'exceljs'
import type { Section, StudentWithGrade } from '../types/database'

export interface SectionExportData {
  section: Section
  instructorName: string
  students: StudentWithGrade[]
}

const COLORS = {
  peach: 'FFF8CBAD',
  lightBlue: 'FFBDD7EE',
  yellow: 'FFFFFF00',
  periwinkle: 'FFD9E1F2',
  orange: 'FFFCE4D6',
  green: 'FF92D050',
  white: 'FFFFFFFF',
  grey: 'FFF2F2F2',
  red: 'FFFF0000',
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
}

function styleCell(
  cell: ExcelJS.Cell,
  opts: {
    bold?: boolean
    color?: string
    bg?: string
    align?: Partial<ExcelJS.Alignment>
    size?: number
    border?: boolean
  } = {},
) {
  cell.font = {
    bold: opts.bold ?? false,
    color: opts.color ? { argb: opts.color } : { argb: 'FF000000' },
    size: opts.size ?? 11,
    name: 'Arial',
  }
  cell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
    ...opts.align,
  }
  if (opts.bg) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } }
  }
  if (opts.border !== false) {
    cell.border = thinBorder
  }
}

const SHEET_COLUMN_WIDTHS = [16, 28, 18, 16, 16, 12]

function getSheetWidthPx(widths: number[]): number {
  return widths.reduce((sum, width) => sum + Math.floor(width * 7 + 5), 0)
}

function getCenteredImageCol(widths: number[], imageWidthPx: number): number {
  const sheetWidth = getSheetWidthPx(widths)
  const offsetPx = Math.max(0, (sheetWidth - imageWidthPx) / 2)

  let accumulated = 0
  for (let i = 0; i < widths.length; i++) {
    const colPx = Math.floor(widths[i] * 7 + 5)
    if (accumulated + colPx > offsetPx) {
      return i + (offsetPx - accumulated) / colPx
    }
    accumulated += colPx
  }
  return 0
}

function applySheetColumns(ws: ExcelJS.Worksheet) {
  ws.columns = SHEET_COLUMN_WIDTHS.map((width) => ({ width }))
}

function getImageNaturalSize(buffer: ArrayBuffer): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('تعذر قراءة أبعاد الصورة'))
    }
    img.src = url
  })
}

async function addUniversityHeaderBanner(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
): Promise<number> {
  const response = await fetch('/nbu-header.png')
  if (!response.ok) {
    throw new Error('تعذر تحميل ترويسة الجامعة')
  }

  const buffer = await response.arrayBuffer()
  const { width, height } = await getImageNaturalSize(buffer)

  const imageId = workbook.addImage({
    buffer,
    extension: 'png',
  })

  // ارتفاع الصف بما يتناسب مع ارتفاع الصورة الطبيعي (بدون تكبير)
  ws.getRow(1).height = height * 0.75

  ws.addImage(imageId, {
    tl: { col: getCenteredImageCol(SHEET_COLUMN_WIDTHS, width), row: 0 },
    ext: { width, height },
  })

  return 2
}

function addInfoGrid(
  ws: ExcelJS.Worksheet,
  section: Section,
  instructorName: string,
  startRow: number,
  termFallback?: string | null,
) {
  const rows = [
    {
      rightLabel: 'Course Title\nاسم المقرر',
      rightValue: section.course_title ?? '—',
      leftLabel: 'Term',
      leftValue: section.term ?? termFallback ?? '—',
      valueRed: false,
      labelRed: false,
    },
    {
      rightLabel: 'Course Code\nرمز المقرر',
      rightValue: section.course_code ?? '—',
      leftLabel: 'Program',
      leftValue: section.program ?? '—',
      valueRed: false,
      labelRed: false,
    },
    {
      rightLabel: 'Section ID\nالرقم المرجعي',
      rightValue: String(section.section_number),
      leftLabel: 'مدرس المقرر',
      leftValue: instructorName,
      valueRed: false,
      labelRed: false,
    },
  ]

  rows.forEach((row, i) => {
    const rowNum = startRow + i
    ws.getRow(rowNum).height = 30

    // يمين: التسمية (إنجليزي + عربي)
    ws.mergeCells(`A${rowNum}:B${rowNum}`)
    const rightLabelCell = ws.getCell(`A${rowNum}`)
    rightLabelCell.value = row.rightLabel
    styleCell(rightLabelCell, {
      bold: true,
      bg: COLORS.white,
      color: row.labelRed ? COLORS.red : undefined,
    })

    // يمين: القيمة
    ws.mergeCells(`C${rowNum}:D${rowNum}`)
    const rightValueCell = ws.getCell(`C${rowNum}`)
    rightValueCell.value = row.rightValue
    styleCell(rightValueCell, {
      bold: row.valueRed,
      bg: COLORS.white,
      color: row.valueRed ? COLORS.red : undefined,
    })

    // يسار: التسمية
    const leftLabelCell = ws.getCell(`E${rowNum}`)
    leftLabelCell.value = row.leftLabel
    styleCell(leftLabelCell, { bold: true, bg: COLORS.white })

    // يسار: القيمة
    const leftValueCell = ws.getCell(`F${rowNum}`)
    leftValueCell.value = row.leftValue
    styleCell(leftValueCell, { bg: COLORS.white })
  })
}

function addGradesTable(ws: ExcelJS.Worksheet, students: StudentWithGrade[], startRow: number) {
  const headerRow = startRow
  const dataStart = startRow + 1

  const headers: {
    col: string
    title: string
    weight?: number
    bg: string
    titleRed?: boolean
  }[] = [
    { col: 'A', title: 'الرقم الجامعي\nStudent Id', bg: COLORS.peach },
    { col: 'B', title: 'اسم الطالب\nStudent Name', bg: COLORS.peach },
    { col: 'C', title: 'مجموع أعمال السنة', weight: 40, bg: COLORS.yellow },
    { col: 'D', title: 'الاختبار النصفي', weight: 20, bg: COLORS.lightBlue },
    { col: 'E', title: 'الاختبار النهائي', weight: 40, bg: COLORS.orange },
    { col: 'F', title: 'المجموع', weight: 100, bg: COLORS.green, titleRed: true },
  ]

  headers.forEach((h) => {
    const cell = ws.getCell(`${h.col}${headerRow}`)
    cell.value = h.weight ? `${h.title}\n${h.weight}` : h.title
    styleCell(cell, {
      bold: true,
      bg: h.bg,
      color: h.titleRed ? COLORS.red : undefined,
    })
  })

  ws.getRow(headerRow).height = 36

  const minRows = Math.max(students.length, 30)
  for (let i = 0; i < minRows; i++) {
    const rowNum = dataStart + i
    const student = students[i]
    const g = student?.grades
    const row = ws.getRow(rowNum)

    const values = [
      student?.university_id ?? '',
      student?.full_name ?? '',
      g?.coursework_score ?? '',
      g?.midterm_score ?? '',
      g?.final_exam_score ?? '',
      g?.total_score ?? '',
    ]

    values.forEach((val, colIdx) => {
      const cell = row.getCell(colIdx + 1)
      cell.value = val
      const colLetter = String.fromCharCode(65 + colIdx)
      let bg = COLORS.white
      if (colLetter === 'A' || colLetter === 'B') bg = COLORS.peach
      if (colLetter === 'C') bg = COLORS.yellow
      if (colLetter === 'D') bg = COLORS.lightBlue
      if (colLetter === 'E') bg = COLORS.orange
      if (colLetter === 'F') bg = COLORS.green
      styleCell(cell, {
        bg,
        bold: colLetter === 'F' && val !== '',
      })
    })
    row.height = 20
  }
}

async function addSectionSheet(
  workbook: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet,
  data: SectionExportData,
) {
  const { section, instructorName, students } = data
  const termFallback = students[0]?.period ?? null

  applySheetColumns(ws)

  const infoStartRow = await addUniversityHeaderBanner(workbook, ws)
  addInfoGrid(ws, section, instructorName, infoStartRow, termFallback)

  const gradesStartRow = infoStartRow + 4
  addGradesTable(ws, students, gradesStartRow)

  ws.views = [{ rightToLeft: true }]
}

export async function exportSectionGradesToExcel(data: SectionExportData): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'بوابة أعضاء هيئة التدريس'
  workbook.created = new Date()

  const sheetName = `مرجع ${data.section.section_number}`.slice(0, 31)
  const ws = workbook.addWorksheet(sheetName)
  await addSectionSheet(workbook, ws, data)

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export async function exportGradesToExcel(sectionsData: SectionExportData[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'بوابة أعضاء هيئة التدريس'
  workbook.created = new Date()

  for (const data of sectionsData) {
    const sheetName = `مرجع ${data.section.section_number}`.slice(0, 31)
    const ws = workbook.addWorksheet(sheetName)
    await addSectionSheet(workbook, ws, data)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
