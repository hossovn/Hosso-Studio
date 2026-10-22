'use client'
import { createContext, useContext } from 'react'
import type { EditorPreview } from './editor-preview-state'

const Context = createContext<EditorPreview | null>(null)
export const EditorPreviewProvider = Context.Provider
export const useEditorPreview = () => useContext(Context)
