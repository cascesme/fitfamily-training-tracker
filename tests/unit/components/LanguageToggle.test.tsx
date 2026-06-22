import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockSetLocale = jest.fn()
jest.mock('@/app/actions/locale', () => ({
  setLocale: mockSetLocale,
}))

jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
}))

import { useLocale } from 'next-intl'
import { LanguageToggle } from '@/components/layout/LanguageToggle'

describe('LanguageToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSetLocale.mockResolvedValue(undefined)
  })

  it('renders EN and ES buttons', () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument()
  })

  it('disables the active locale button', () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    expect(screen.getByRole('button', { name: 'ES' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'EN' })).not.toBeDisabled()
  })

  it('clicking EN when locale is es calls setLocale("en") then refresh', async () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    })
    expect(mockSetLocale).toHaveBeenCalledWith('en')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('clicking ES when locale is en calls setLocale("es") then refresh', async () => {
    ;(useLocale as jest.Mock).mockReturnValue('en')
    render(<LanguageToggle />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'ES' }))
    })
    expect(mockSetLocale).toHaveBeenCalledWith('es')
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('active locale button has visible border, inactive does not', () => {
    ;(useLocale as jest.Mock).mockReturnValue('es')
    render(<LanguageToggle />)
    const esBtn = screen.getByRole('button', { name: 'ES' })
    const enBtn = screen.getByRole('button', { name: 'EN' })
    expect(esBtn.className).toContain('border')
    expect(enBtn.className).not.toContain('border')
  })
})
