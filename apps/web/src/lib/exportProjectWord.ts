import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeightRule,
  LevelFormat,
  ImageRun,
  Footer,
  PageNumber,
} from 'docx'
import type { Project, SubProject, TodoList, Attachment, ItemPriority, ProjectStatus, Priority } from '../types'
import { getBlob } from '../hooks/useFiles'
import { markdownToDocx } from './markdownToDocx'

const TYPE_LABELS: Record<string, string> = {
  web: 'Web', mobile: 'Mobile', api: 'API / Backend', desktop: 'Desktop',
  data: 'Data / BI', devops: 'DevOps', design: 'Design', other: 'Autre',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Actif', paused: 'En pause', completed: 'Terminé', archived: 'Archivé',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', critical: 'Critique',
}
const ITEM_PRIORITY_LABELS: Record<ItemPriority, string> = { low: 'Basse', medium: 'Moyenne', high: 'Haute' }

const STATUS_COLORS: Record<ProjectStatus, string> = { active: '15803D', paused: 'A16207', completed: '1D4ED8', archived: '64748B' }
const PRIORITY_COLORS: Record<Priority, string> = { low: '15803D', medium: 'A16207', high: 'C2410C', critical: 'B91C1C' }
const ITEM_PRIORITY_COLORS: Record<ItemPriority, string> = { low: '0369A1', medium: 'A16207', high: 'B91C1C' }

// ─── Palette sobre : encre, gris, filets ───────────────────────────────────────

const INK = '1F2937'
const MUTED = '6B7280'
const RULE = 'D1D5DB'
const HAIRLINE = { style: BorderStyle.SINGLE, size: 4, color: RULE }
const TABLE_HEAD_BG = '1F2937'
const ZEBRA = 'F8FAFC'
const CELL_MARGINS = { top: 90, bottom: 90, left: 130, right: 130 }
const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const NO_BORDERS = { top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER, insideHorizontal: NONE_BORDER, insideVertical: NONE_BORDER }

function clean(hex: string): string {
  return hex.replace('#', '').toUpperCase()
}

// ─── Titres de section numérotés ───────────────────────────────────────────────

function makeSectionHeadings(accentHex: string) {
  const accent = clean(accentHex)
  let counter = 0
  const h2 = (text: string) => {
    counter += 1
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      border: { bottom: HAIRLINE },
      spacing: { before: 380, after: 160 },
      children: [
        new TextRun({ text: String(counter).padStart(2, '0') + '   ', bold: true, color: accent, size: 26 }),
        new TextRun({ text, bold: true, color: INK, size: 26 }),
      ],
    })
  }
  const h3 = (text: string, swatch?: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 260, after: 120 },
      children: [
        ...(swatch ? [new TextRun({ text: '■  ', color: clean(swatch), size: 20 })] : []),
        new TextRun({ text, bold: true, color: INK, size: 22 }),
      ],
    })
  return { h2, h3 }
}
function h4(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_4,
    spacing: { before: 200, after: 90 },
    children: [new TextRun({ text, bold: true, color: INK, size: 20 })],
  })
}

// ─── Petits constructeurs de mise en page ─────────────────────────────────────

function spacer(after = 120) {
  return new Paragraph({ text: '', spacing: { after } })
}
function bodyText(text: string, opts: { italics?: boolean; muted?: boolean } = {}) {
  const runs = text.split('\n').flatMap((line, i) => {
    const run = new TextRun({ text: line, italics: opts.italics, color: opts.muted ? MUTED : INK })
    return i === 0 ? [run] : [new TextRun({ text: '', break: 1 }), run]
  })
  return new Paragraph({ children: runs, spacing: { after: 120 } })
}
function labelValue(label: string, value: string) {
  return new Paragraph({
    children: [new TextRun({ text: `${label} : `, bold: true, color: INK }), new TextRun({ text: value, color: INK })],
    spacing: { after: 50 },
  })
}
function cell(
  text: string,
  opts: { widthPct?: number; header?: boolean; bold?: boolean; strike?: boolean; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; fill?: string } = {}
) {
  return new TableCell({
    width: opts.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { fill: TABLE_HEAD_BG } : opts.fill ? { fill: opts.fill } : undefined,
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: opts.bold ?? opts.header, strike: opts.strike, color: opts.header ? 'FFFFFF' : (opts.color ?? INK) })],
      }),
    ],
  })
}

function techLines(languages: string[], frameworks: string[], tools: string[]): Paragraph[] {
  const lines: Paragraph[] = []
  if (languages.length > 0) lines.push(labelValue('Langages', languages.join(', ')))
  if (frameworks.length > 0) lines.push(labelValue('Frameworks', frameworks.join(', ')))
  if (tools.length > 0) lines.push(labelValue('Outils', tools.join(', ')))
  return lines
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

// ─── En-tête de document ────────────────────────────────────────────────────────

function coverBlock(project: Project, subtitle: string): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: 'FICHE PROJET', bold: true, color: clean(project.color), size: 18 })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: project.name, bold: true, color: INK, size: 60, font: 'Cambria' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 20, color: clean(project.color), space: 12 } },
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: subtitle, color: MUTED, size: 21 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`, italics: true, color: MUTED, size: 17 })],
      spacing: { after: 260 },
    }),
  ]
}

// ─── Grille de statistiques (statut / priorité / dates) ───────────────────────

function statGrid(cells: { label: string; value: string; color?: string }[]): Table {
  const widthPct = Math.floor(100 / cells.length)
  const borders = { top: HAIRLINE, bottom: HAIRLINE, left: HAIRLINE, right: HAIRLINE, insideHorizontal: HAIRLINE, insideVertical: HAIRLINE }
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    rows: [
      new TableRow({
        children: cells.map(
          (c) =>
            new TableCell({
              width: { size: widthPct, type: WidthType.PERCENTAGE },
              shading: { fill: ZEBRA },
              margins: { top: 160, bottom: 160, left: 180, right: 180 },
              children: [
                new Paragraph({ children: [new TextRun({ text: c.label.toUpperCase(), size: 15, bold: true, color: MUTED })], spacing: { after: 50 } }),
                new Paragraph({ children: [new TextRun({ text: c.value, size: 23, bold: true, color: c.color ?? INK })] }),
              ],
            })
        ),
      }),
    ],
  })
}

function progressSection(accentHex: string, progress: number, done: number, total: number): (Paragraph | Table)[] {
  const accent = clean(accentHex)
  const barCells = [
    ...(progress > 0 ? [new TableCell({ width: { size: progress, type: WidthType.PERCENTAGE }, shading: { fill: accent }, children: [new Paragraph({ text: '' })] })] : []),
    ...(progress < 100 ? [new TableCell({ width: { size: 100 - progress, type: WidthType.PERCENTAGE }, shading: { fill: 'E5E7EB' }, children: [new Paragraph({ text: '' })] })] : []),
  ]
  return [
    new Paragraph({
      children: [
        new TextRun({ text: 'Progression globale', bold: true, color: INK }),
        new TextRun({ text: `   ${progress} %`, bold: true, color: accent }),
        new TextRun({ text: `   ·   ${done}/${total} tâches complétées`, color: MUTED }),
      ],
      spacing: { before: 260, after: 90 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({ height: { value: 140, rule: HeightRule.EXACT }, children: barCells })],
    }),
  ]
}

// ─── Composants du projet (composite) ─────────────────────────────────────────

function subProjectCard(sp: SubProject, fallbackColor: string): (Paragraph | Table)[] {
  const swatch = sp.color ?? fallbackColor
  const content: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: '■  ', color: clean(swatch), size: 22 }),
        new TextRun({ text: sp.name || 'Composant sans nom', bold: true, size: 23, color: INK }),
        new TextRun({ text: `   —   ${sp.role || 'Rôle non défini'}`, color: MUTED, size: 19 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: (TYPE_LABELS[sp.type] ?? sp.type).toUpperCase(), bold: true, size: 14, color: MUTED })],
      spacing: { after: 110 },
    }),
    ...techLines(sp.languages, sp.frameworks, sp.tools),
  ]
  if (sp.description) content.push(bodyText(sp.description, { muted: true }))

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: HAIRLINE, bottom: HAIRLINE, left: HAIRLINE, right: HAIRLINE },
    rows: [new TableRow({ children: [new TableCell({ margins: { top: 200, bottom: 200, left: 240, right: 240 }, children: content })] })],
  })
  return [table, spacer(180)]
}

// ─── Listes de tâches ──────────────────────────────────────────────────────────

function todoListBlock(list: TodoList): (Paragraph | Table)[] {
  const done = list.items.filter((i) => i.completed).length
  const out: (Paragraph | Table)[] = [h4(`${list.title}  ·  ${done}/${list.items.length}`)]

  if (list.items.length === 0) {
    out.push(bodyText('Aucune tâche dans cette liste.', { italics: true, muted: true }))
    return out
  }

  const header = new TableRow({
    tableHeader: true,
    children: [cell('', { widthPct: 8, header: true }), cell('Tâche', { widthPct: 70, header: true }), cell('Priorité', { widthPct: 22, header: true })],
  })
  const rows = list.items.map(
    (item, i) =>
      new TableRow({
        children: [
          cell(item.completed ? '☑' : '☐', { widthPct: 8, align: AlignmentType.CENTER, fill: i % 2 ? ZEBRA : undefined }),
          cell(item.text, { widthPct: 70, strike: item.completed, color: item.completed ? MUTED : undefined, fill: i % 2 ? ZEBRA : undefined }),
          cell(ITEM_PRIORITY_LABELS[item.priority], { widthPct: 22, bold: true, color: ITEM_PRIORITY_COLORS[item.priority], fill: i % 2 ? ZEBRA : undefined }),
        ],
      })
  )
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: HAIRLINE, bottom: HAIRLINE, left: HAIRLINE, right: HAIRLINE, insideHorizontal: HAIRLINE, insideVertical: HAIRLINE }, rows: [header, ...rows] }))
  out.push(spacer(160))
  return out
}

// ─── Pièces jointes ────────────────────────────────────────────────────────────

const MIME_TO_IMAGE_TYPE: Record<string, 'jpg' | 'png' | 'gif' | 'bmp'> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
}

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth || 400, height: img.naturalHeight || 300 })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 400, height: 300 })
    }
    img.src = url
  })
}

async function attachmentImageBlock(attachment: Attachment): Promise<Paragraph[] | null> {
  const type = MIME_TO_IMAGE_TYPE[attachment.mimeType]
  if (!type) return null
  const blob = await getBlob(attachment.id)
  if (!blob) return null
  const [buffer, dims] = await Promise.all([blob.arrayBuffer(), getImageDimensions(blob)])
  const maxWidth = 420
  const scale = dims.width > maxWidth ? maxWidth / dims.width : 1
  return [
    new Paragraph({ children: [new TextRun({ text: attachment.title, bold: true, color: INK })], spacing: { before: 100, after: 60 } }),
    new Paragraph({
      children: [
        new ImageRun({
          type,
          data: buffer,
          transformation: { width: Math.round(dims.width * scale), height: Math.round(dims.height * scale) },
        }),
      ],
      spacing: { after: 160 },
    }),
  ]
}

function attachmentsTable(attachments: Attachment[]): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell('Nom', { widthPct: 30, header: true }),
      cell('Description', { widthPct: 40, header: true }),
      cell('Taille', { widthPct: 15, header: true }),
      cell('Ajouté le', { widthPct: 15, header: true }),
    ],
  })
  const rows = attachments.map(
    (a, i) =>
      new TableRow({
        children: [
          cell(a.title, { widthPct: 30, fill: i % 2 ? ZEBRA : undefined }),
          cell(a.description ?? '—', { widthPct: 40, fill: i % 2 ? ZEBRA : undefined }),
          cell(formatSize(a.size), { widthPct: 15, fill: i % 2 ? ZEBRA : undefined }),
          cell(new Date(a.createdAt).toLocaleDateString('fr-FR'), { widthPct: 15, fill: i % 2 ? ZEBRA : undefined }),
        ],
      })
  )
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: HAIRLINE, bottom: HAIRLINE, left: HAIRLINE, right: HAIRLINE, insideHorizontal: HAIRLINE, insideVertical: HAIRLINE }, rows: [header, ...rows] })
}

// ─── Pied de page ───────────────────────────────────────────────────────────────

function makeFooter(projectName: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: HAIRLINE },
        spacing: { before: 120 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: projectName, color: MUTED, size: 16 }),
          new TextRun({ text: '   ·   Page ', color: MUTED, size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], color: MUTED, size: 16 }),
          new TextRun({ text: ' / ', color: MUTED, size: 16 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: MUTED, size: 16 }),
        ],
      }),
    ],
  })
}

// ─── Génération du document ────────────────────────────────────────────────────

export async function exportProjectToWord(project: Project): Promise<void> {
  const children: (Paragraph | Table)[] = []
  const { h2, h3 } = makeSectionHeadings(project.color)

  const isComposite = !!project.isComposite && (project.subProjects ?? []).length > 0
  const subProjects = project.subProjects ?? []
  const globalLists = project.todoLists.filter((l) => !l.subProjectId)
  const subProjectGroups = subProjects.map((sp) => ({ sp, lists: project.todoLists.filter((l) => l.subProjectId === sp.id) }))
  const allItems = project.todoLists.flatMap((l) => l.items)
  const doneItems = allItems.filter((i) => i.completed).length
  const progress = allItems.length === 0 ? 0 : Math.round((doneItems / allItems.length) * 100)

  // En-tête
  const subtitleParts = [isComposite ? `Projet composite  ·  ${subProjects.length} composants` : TYPE_LABELS[project.type] ?? project.type, STATUS_LABELS[project.status]]
  children.push(...coverBlock(project, subtitleParts.join('   ·   ')))

  // Grille de statistiques
  const statCells = [
    { label: 'Statut', value: STATUS_LABELS[project.status] ?? project.status, color: STATUS_COLORS[project.status] },
    { label: 'Priorité', value: PRIORITY_LABELS[project.priority] ?? project.priority, color: PRIORITY_COLORS[project.priority] },
    { label: 'Démarré le', value: new Date(project.startDate).toLocaleDateString('fr-FR') },
    ...(project.dueDate ? [{ label: 'Échéance', value: new Date(project.dueDate).toLocaleDateString('fr-FR') }] : [{ label: 'Mis à jour le', value: new Date(project.updatedAt).toLocaleDateString('fr-FR') }]),
  ]
  children.push(statGrid(statCells))
  children.push(...progressSection(project.color, progress, doneItems, allItems.length))

  // Description
  if (project.description) {
    children.push(h2('Description'))
    children.push(bodyText(project.description))
  }

  // Composants (projet composite)
  if (isComposite) {
    children.push(h2('Composants du projet'))
    subProjects.forEach((sp) => children.push(...subProjectCard(sp, project.color)))
  }

  // Stack technologique globale
  const techGlobal = techLines(project.languages, project.frameworks, project.tools)
  if (techGlobal.length > 0) {
    children.push(h2(isComposite ? 'Stack globale' : 'Stack technologique'))
    children.push(...techGlobal)
  }

  // Tags
  if (project.tags.length > 0) {
    children.push(h2('Tags'))
    children.push(bodyText(project.tags.join(', ')))
  }

  // Listes de tâches
  children.push(h2(`Listes de tâches (${project.todoLists.length})`))
  if (project.todoLists.length === 0) {
    children.push(bodyText('Aucune liste de tâches pour ce projet.', { italics: true, muted: true }))
  } else if (!isComposite) {
    project.todoLists.forEach((list) => children.push(...todoListBlock(list)))
  } else {
    subProjectGroups.forEach(({ sp, lists }) => {
      children.push(h3(`${sp.name} — ${sp.role}`, sp.color ?? project.color))
      if (lists.length === 0) children.push(bodyText('Aucune liste pour ce composant.', { italics: true, muted: true }))
      else lists.forEach((list) => children.push(...todoListBlock(list)))
    })
    children.push(h3('Global'))
    if (globalLists.length === 0) children.push(bodyText('Aucune liste transverse.', { italics: true, muted: true }))
    else globalLists.forEach((list) => children.push(...todoListBlock(list)))
  }

  // Notes
  const notesBlocks = markdownToDocx(project.notes)
  if (notesBlocks.length > 0) {
    children.push(h2('Notes'))
    children.push(...notesBlocks)
  }

  // Pièces jointes
  const attachments = project.attachments ?? []
  if (attachments.length > 0) {
    children.push(h2(`Pièces jointes (${attachments.length})`))
    children.push(attachmentsTable(attachments))
    for (const attachment of attachments) {
      const imageBlock = await attachmentImageBlock(attachment)
      if (imageBlock) children.push(...imageBlock)
    }
  }

  const doc = new Document({
    creator: 'Project Manager',
    title: project.name,
    description: project.description || undefined,
    numbering: {
      config: [
        {
          reference: 'notes-numbering',
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 360, hanging: 260 } } } },
            { level: 1, format: LevelFormat.DECIMAL, text: '%2.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 260 } } } },
          ],
        },
      ],
    },
    sections: [{ properties: {}, footers: { default: makeFooter(project.name) }, children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.slice(0, 60).replace(/[^a-z0-9]/gi, '_')}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
