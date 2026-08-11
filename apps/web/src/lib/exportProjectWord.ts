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
  LevelFormat,
  ImageRun,
} from 'docx'
import type { Project, SubProject, TodoList, Attachment, ItemPriority } from '../types'
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

const HEADER_FILL = 'EEF2FF'
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 }

// ─── Petits constructeurs de mise en page ─────────────────────────────────────

function h2(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, text, spacing: { before: 260, after: 120 } })
}
function h3(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, text, spacing: { before: 180, after: 100 } })
}
function h4(text: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_4, text, spacing: { before: 140, after: 80 } })
}
function bodyText(text: string, opts: { italics?: boolean; muted?: boolean } = {}) {
  const runs = text.split('\n').flatMap((line, i) => {
    const run = new TextRun({ text: line, italics: opts.italics, color: opts.muted ? '64748B' : undefined })
    return i === 0 ? [run] : [new TextRun({ text: '', break: 1 }), run]
  })
  return new Paragraph({ children: runs, spacing: { after: 120 } })
}
function labelValue(label: string, value: string) {
  return new Paragraph({
    children: [new TextRun({ text: `${label} : `, bold: true }), new TextRun({ text: value })],
    spacing: { after: 40 },
  })
}
function cell(text: string, opts: { widthPct?: number; header?: boolean; bold?: boolean; strike?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  return new TableCell({
    width: opts.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.header ? { fill: HEADER_FILL } : undefined,
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: opts.align,
        children: [new TextRun({ text, bold: opts.bold ?? opts.header, strike: opts.strike })],
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

// ─── Composants du projet (composite) ─────────────────────────────────────────

function subProjectSection(sp: SubProject): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [h3(`${sp.name || 'Composant sans nom'} — ${sp.role || 'Rôle non défini'}`)]
  out.push(labelValue('Type', TYPE_LABELS[sp.type] ?? sp.type))
  out.push(...techLines(sp.languages, sp.frameworks, sp.tools))
  if (sp.description) out.push(bodyText(sp.description, { muted: true }))
  return out
}

// ─── Listes de tâches ──────────────────────────────────────────────────────────

function todoListBlock(list: TodoList): (Paragraph | Table)[] {
  const done = list.items.filter((i) => i.completed).length
  const out: (Paragraph | Table)[] = [h4(`${list.title} (${done}/${list.items.length})`)]

  if (list.items.length === 0) {
    out.push(bodyText('Aucune tâche dans cette liste.', { italics: true, muted: true }))
    return out
  }

  const header = new TableRow({
    tableHeader: true,
    children: [cell('', { widthPct: 8, header: true }), cell('Tâche', { widthPct: 72, header: true }), cell('Priorité', { widthPct: 20, header: true })],
  })
  const rows = list.items.map(
    (item) =>
      new TableRow({
        children: [
          cell(item.completed ? '☑' : '☐', { widthPct: 8, align: AlignmentType.CENTER }),
          cell(item.text, { widthPct: 72, strike: item.completed }),
          cell(ITEM_PRIORITY_LABELS[item.priority], { widthPct: 20 }),
        ],
      })
  )
  out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] }))
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
    new Paragraph({ children: [new TextRun({ text: attachment.title, bold: true })], spacing: { before: 100, after: 60 } }),
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
    (a) =>
      new TableRow({
        children: [
          cell(a.title, { widthPct: 30 }),
          cell(a.description ?? '—', { widthPct: 40 }),
          cell(formatSize(a.size), { widthPct: 15 }),
          cell(new Date(a.createdAt).toLocaleDateString('fr-FR'), { widthPct: 15 }),
        ],
      })
  )
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] })
}

// ─── Génération du document ────────────────────────────────────────────────────

export async function exportProjectToWord(project: Project): Promise<void> {
  const children: (Paragraph | Table)[] = []

  const isComposite = !!project.isComposite && (project.subProjects ?? []).length > 0
  const subProjects = project.subProjects ?? []
  const globalLists = project.todoLists.filter((l) => !l.subProjectId)
  const subProjectGroups = subProjects.map((sp) => ({ sp, lists: project.todoLists.filter((l) => l.subProjectId === sp.id) }))
  const allItems = project.todoLists.flatMap((l) => l.items)
  const doneItems = allItems.filter((i) => i.completed).length
  const progress = allItems.length === 0 ? 0 : Math.round((doneItems / allItems.length) * 100)

  // En-tête
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      text: project.name,
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: project.color.replace('#', '') } },
      spacing: { after: 200 },
    })
  )
  children.push(labelValue('Statut', STATUS_LABELS[project.status] ?? project.status))
  children.push(labelValue('Priorité', PRIORITY_LABELS[project.priority] ?? project.priority))
  children.push(labelValue('Type', isComposite ? `Composite (${subProjects.length} composants)` : TYPE_LABELS[project.type] ?? project.type))
  children.push(labelValue('Démarré le', new Date(project.startDate).toLocaleDateString('fr-FR')))
  if (project.dueDate) children.push(labelValue('Échéance', new Date(project.dueDate).toLocaleDateString('fr-FR')))
  children.push(labelValue('Dernière mise à jour', new Date(project.updatedAt).toLocaleDateString('fr-FR')))
  children.push(labelValue('Progression', `${progress} % (${doneItems}/${allItems.length} tâches complétées)`))

  // Description
  if (project.description) {
    children.push(h2('Description'))
    children.push(bodyText(project.description))
  }

  // Composants (projet composite)
  if (isComposite) {
    children.push(h2('Composants du projet'))
    subProjects.forEach((sp) => children.push(...subProjectSection(sp)))
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
      children.push(h3(`${sp.name} — ${sp.role}`))
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
    sections: [{ properties: {}, children }],
  })

  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.slice(0, 60).replace(/[^a-z0-9]/gi, '_')}.docx`
  a.click()
  URL.revokeObjectURL(url)
}
