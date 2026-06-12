declare module '@celsowm/markdown-wysiwyg' {
  interface MarkdownWYSIWYGOptions {
    initialValue?: string
    showToolbar?: boolean
    onUpdate?: (value: string) => void
    initialMode?: 'wysiwyg' | 'markdown'
    tableGridMaxRows?: number
    tableGridMaxCols?: number
    buttons?: unknown[]
  }
  export default class MarkdownWYSIWYG {
    constructor(elementId: string, options?: MarkdownWYSIWYGOptions)
    getValue(): string
    setValue(markdown: string, isInitialSetup?: boolean): void
    switchToMode(mode: 'wysiwyg' | 'markdown', isInitialSetup?: boolean): void
    destroy(): void
  }
}
