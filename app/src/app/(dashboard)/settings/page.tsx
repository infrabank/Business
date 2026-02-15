'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and organization</p>
      </div>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Profile</h2></CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input id="name" label="Name" defaultValue="Solo Founder" />
            <Input id="email" label="Email" type="email" defaultValue="founder@llmcost.io" />
            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Organization</h2></CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={(e) => e.preventDefault()}>
            <Input id="orgName" label="Organization Name" defaultValue="My Company" />
            <Input id="slug" label="URL Slug" defaultValue="my-company" />
            <Input id="billingEmail" label="Billing Email" type="email" defaultValue="billing@company.com" />
            <Button type="submit">Update Organization</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">Subscription</h2></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="info">Pro Plan</Badge>
            <span className="text-sm text-gray-600">$99/month</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">Unlimited providers, 1-year history, team management</p>
          <Button variant="outline" className="mt-4">Manage Subscription</Button>
        </CardContent>
      </Card>
    </div>
  )
}
