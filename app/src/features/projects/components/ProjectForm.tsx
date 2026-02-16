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
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
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
        <h3 className="text-lg font-semibold text-gray-900">Add Project</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Project Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production API" />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
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
              {isLoading ? 'Creating...' : 'Add Project'}
            </Button>
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
