'use client'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, FolderOpen } from 'lucide-react'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useAppStore } from '@/lib/store'
import { useSession } from '@/hooks/useSession'

export default function ProjectsPage() {
  const { isReady } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)
  const { projects, isLoading } = useProjects(orgId)

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Organize costs by project</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

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
        {projects.map((p) => (
          <Card key={p.id}>
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${p.color ?? '#6B7280'}15` }}>
                  <FolderOpen className="h-5 w-5" style={{ color: p.color ?? '#6B7280' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  {p.description && <p className="text-sm text-gray-500">{p.description}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">No projects yet. Create one to organize your API costs.</p>
          </div>
        )}
      </div>
    </div>
  )
}
