'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface ProjectFormProps {
  onSubmit: (data: { name: string; description?: string; color?: string }) => void
  onCancel?: () => void
  isLoading?: boolean
}

const COLOR_OPTIONS = [
  { value: '#3B82F6', label: '파랑' },
  { value: '#10B981', label: '초록' },
  { value: '#F59E0B', label: '노랑' },
  { value: '#EF4444', label: '빨강' },
  { value: '#8B5CF6', label: '보라' },
  { value: '#EC4899', label: '분홍' },
]

export function ProjectForm({ onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3B82F6')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ name, description: description || undefined, color })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">프로젝트 추가</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="프로젝트 이름" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Production API" />
          <Input label="설명" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="선택사항" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">색상</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${color === c.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!name || isLoading}>
              {isLoading ? '생성 중...' : '프로젝트 추가'}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>취소</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
