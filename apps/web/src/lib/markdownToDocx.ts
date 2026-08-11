import { marked } from 'marked'
import { Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, ShadingType, BorderStyle } from 'docx'

// ─── Conversion Markdown (notes projet) → éléments docx ──────────────────────
// S'appuie sur marked.lexer() pour obtenir l'arbre de tokens (déjà utilisé par
// ProjectNotesModal pour le rendu WYSIWYG), qu'on parcourt pour produire des
// Paragraph/Table docx équivalents.

type InlineStyle = { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean }

const HEADING_BY_DEPTH: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_3,
  2: HeadingLevel.HEADING_4,
  3: HeadingLevel.HEADING_5,
  4: HeadingLevel.HEADING_6,
  5: HeadingLevel.HEADING_6,
  6: HeadingLevel.HEADING_6,
}

function collectRuns(tokens: unknown[] | undefined, style: InlineStyle, runs: TextRun[]): void {
  if (!tokens) return
  for (const raw of tokens) {
    const t = raw as { type: string; text?: string; raw?: string; tokens?: unknown[] }
    switch (t.type) {
      case 'strong':
        collectRuns(t.tokens, { ...style, bold: true }, runs)
        break
      case 'em':
        collectRuns(t.tokens, { ...style, italics: true }, runs)
        break
      case 'del':
        collectRuns(t.tokens, { ...style, strike: true }, runs)
        break
      case 'codespan':
        runs.push(new TextRun({ text: t.text ?? '', font: 'Consolas', shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' } }))
        break
      case 'link':
      case 'image':
        collectRuns(t.tokens && t.tokens.length > 0 ? t.tokens : undefined, style, runs)
        if (!t.tokens || t.tokens.length === 0) {
          runs.push(new TextRun({ text: t.text ?? '', bold: style.bold, italics: style.italics, strike: style.strike }))
        }
        break
      case 'br':
        runs.push(new TextRun({ text: '', break: 1 }))
        break
      case 'text':
      case 'escape':
        if (t.tokens && t.tokens.length > 0) collectRuns(t.tokens, style, runs)
        else runs.push(new TextRun({ text: t.text ?? t.raw ?? '', bold: style.bold, italics: style.italics, strike: style.strike, font: style.code ? 'Consolas' : undefined }))
        break
      default:
        if (t.tokens) collectRuns(t.tokens, style, runs)
        else if (t.text) runs.push(new TextRun({ text: t.text, bold: style.bold, italics: style.italics, strike: style.strike }))
    }
  }
}

function inlineToRuns(tokens: unknown[] | undefined): TextRun[] {
  const runs: TextRun[] = []
  collectRuns(tokens, {}, runs)
  return runs.length > 0 ? runs : [new TextRun({ text: '' })]
}

function walkList(items: unknown[], ordered: boolean, depth: number, out: (Paragraph | Table)[]): void {
  for (const raw of items) {
    const item = raw as { tokens?: unknown[]; task?: boolean; checked?: boolean }
    const inlineTokens = (item.tokens ?? []).filter((tt) => (tt as { type: string }).type !== 'list')
    const nestedLists = (item.tokens ?? []).filter((tt) => (tt as { type: string }).type === 'list')

    const runs: TextRun[] = []
    if (item.task) runs.push(new TextRun({ text: item.checked ? '☑ ' : '☐ ' }))
    runs.push(...inlineFromBlockTokens(inlineTokens))

    out.push(
      new Paragraph({
        children: runs,
        bullet: !ordered ? { level: depth } : undefined,
        numbering: ordered ? { reference: 'notes-numbering', level: depth } : undefined,
        indent: { left: 360 * (depth + 1) },
        spacing: { after: 40 },
      })
    )
    if (nestedLists.length > 0) {
      for (const nl of nestedLists) {
        const list = nl as { items: unknown[]; ordered: boolean }
        walkList(list.items, list.ordered, depth + 1, out)
      }
    }
  }
}

function inlineFromBlockTokens(tokens: unknown[]): TextRun[] {
  // Les tokens d'un item de liste sont souvent enveloppés dans un 'text' ou 'paragraph' unique
  const runs: TextRun[] = []
  for (const raw of tokens) {
    const t = raw as { type: string; tokens?: unknown[] }
    if (t.type === 'text' || t.type === 'paragraph') {
      collectRuns(t.tokens, {}, runs)
    } else {
      collectRuns([t], {}, runs)
    }
  }
  return runs.length > 0 ? runs : [new TextRun({ text: '' })]
}

function walkBlocks(tokens: unknown[], out: (Paragraph | Table)[]): void {
  for (const raw of tokens) {
    const t = raw as {
      type: string
      depth?: number
      text?: string
      tokens?: unknown[]
      items?: unknown[]
      ordered?: boolean
      header?: unknown[]
      rows?: unknown[][]
    }
    switch (t.type) {
      case 'heading':
        out.push(
          new Paragraph({
            heading: HEADING_BY_DEPTH[t.depth ?? 3] ?? HeadingLevel.HEADING_6,
            children: inlineToRuns(t.tokens),
            spacing: { before: 160, after: 80 },
          })
        )
        break
      case 'paragraph':
        out.push(new Paragraph({ children: inlineToRuns(t.tokens), spacing: { after: 100 } }))
        break
      case 'list':
        walkList(t.items ?? [], !!t.ordered, 0, out)
        break
      case 'blockquote':
        if (t.tokens) {
          const inner: (Paragraph | Table)[] = []
          walkBlocks(t.tokens, inner)
          for (const p of inner) {
            if (p instanceof Paragraph) out.push(p)
          }
        }
        break
      case 'code':
        out.push(
          new Paragraph({
            children: [new TextRun({ text: t.text ?? '', font: 'Consolas', size: 20 })],
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            spacing: { after: 100 },
          })
        )
        break
      case 'hr':
        out.push(new Paragraph({ text: '', border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' } } }))
        break
      case 'table': {
        const header = (t.header ?? []) as { tokens?: unknown[] }[]
        const rows = (t.rows ?? []) as { tokens?: unknown[] }[][]
        const makeCell = (cell: { tokens?: unknown[] }, isHeader: boolean) =>
          new TableCell({
            width: { size: Math.floor(100 / Math.max(header.length, 1)), type: WidthType.PERCENTAGE },
            shading: isHeader ? { fill: 'EEF2FF' } : undefined,
            children: [new Paragraph({ children: inlineToRuns(cell.tokens) })],
          })
        out.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: header.map((c) => makeCell(c, true)) }),
              ...rows.map((row) => new TableRow({ children: row.map((c) => makeCell(c, false)) })),
            ],
          })
        )
        break
      }
      case 'space':
      default:
        break
    }
  }
}

export function markdownToDocx(markdown: string | undefined): (Paragraph | Table)[] {
  if (!markdown || !markdown.trim()) return []
  const tokens = marked.lexer(markdown, { gfm: true })
  const out: (Paragraph | Table)[] = []
  walkBlocks(tokens as unknown[], out)
  return out
}
