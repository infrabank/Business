'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { Plus, FolderOpen } from 'lucide-react'

const mockProjects = [
  { id: '1', name: 'Production API', color: '#3B82F6', cost: 1842.30, keys: 3, desc: 'Main production workloads' },
  { id: '2', name: 'Development', color: '#10B981', cost: 653.18, keys: 2, desc: 'Dev and staging environments' },
  { id: '3', name: 'Testing', color: '#F59E0B', cost: 352.05, keys: 1, desc: 'QA and automated tests' },
]

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Organize costs by project</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Project</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((p) => (
          <Card key={p.id}>
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${p.color}15` }}>
                  <FolderOpen className="h-5 w-5" style={{ color: p.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-500">{p.desc}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">{p.keys} API keys</span>
                <span className="font-semibold text-gray-900">{formatCurrency(p.cost)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
