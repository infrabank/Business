'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  confirmLabel?: string
  variant?: 'danger' | 'warning'
  isLoading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmLabel = '확인',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('')
  const isMatch = inputValue === confirmText

  useEffect(() => {
    if (isOpen) {
      setInputValue('')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose()
    },
    [onClose, isLoading],
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const colors = variant === 'danger'
    ? { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' }
    : { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isLoading ? undefined : onClose}
      />
      <div className={`relative mx-4 w-full max-w-md rounded-xl border ${colors.border} ${colors.bg} p-6 shadow-xl`}>
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className={`h-6 w-6 ${colors.icon}`} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <p className="mb-4 text-sm text-gray-600">{description}</p>

        <p className="mb-2 text-sm font-medium text-gray-700">
          계속하려면 <span className="font-mono font-bold">{confirmText}</span>을(를) 입력하세요:
        </p>
        <Input
          id="confirm-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={confirmText}
          autoFocus
        />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            취소
          </Button>
          <button
            onClick={onConfirm}
            disabled={!isMatch || isLoading}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${colors.btn}`}
          >
            {isLoading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
