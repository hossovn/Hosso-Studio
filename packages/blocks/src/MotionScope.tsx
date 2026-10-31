'use client'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Scope = { paused: boolean; register: () => () => void }
const MotionContext = createContext<Scope | null>(null)

export const useMotionScope = () => useContext(MotionContext)

export function MotionScope({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const [paused, setPaused] = useState(false)
  const [loops, setLoops] = useState(0)
  const register = useCallback(() => {
    setLoops((count) => count + 1)
    return () => setLoops((count) => count - 1)
  }, [])
  const scope = useMemo(() => ({ paused: enabled && paused, register }), [enabled, paused, register])
  return <MotionContext.Provider value={scope}>
    <div data-motion-scope="" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
      {enabled && loops > 0 && <button type="button" aria-label={paused ? 'Tiếp tục chuyển động' : 'Tạm dừng chuyển động'} aria-pressed={paused} onClick={() => setPaused((value) => !value)} style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, minWidth: 44, minHeight: 44, padding: 8, borderRadius: 8, background: '#fff', color: '#111827', border: '1px solid #9ca3af', cursor: 'pointer', pointerEvents: 'auto' }}>{paused ? '▶' : 'Ⅱ'}</button>}
    </div>
  </MotionContext.Provider>
}
