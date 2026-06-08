'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Mode = 'trainer' | 'trainee'

interface ModeContextValue {
  mode: Mode
  setMode: (mode: Mode) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('trainee')

  useEffect(() => {
    const stored = localStorage.getItem('fitfamily-mode') as Mode | null
    if (stored === 'trainer' || stored === 'trainee') setModeState(stored)
  }, [])

  const setMode = (m: Mode) => {
    localStorage.setItem('fitfamily-mode', m)
    setModeState(m)
  }

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used within ModeProvider')
  return ctx
}
