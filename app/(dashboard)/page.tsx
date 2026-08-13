'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useViewer } from '@/app/lib/viewer'

// Landing route. Client-side because the role only exists in the browser: this
// used to redirect straight to /dashboard on the server, which sent leadership
// to a Home page that isn't their starting point.
//
// Only "/" is routed here — /dashboard stays reachable, so a principal can
// still click Home in the Teachers view group.
export default function DashboardRootPage() {
  const router = useRouter()
  const { viewer, roleResolved } = useViewer()

  const target = !roleResolved
    ? null
    : viewer?.navView === 'leadership'
      ? '/subject'
      : '/dashboard'

  useEffect(() => {
    if (target) router.replace(target)
  }, [target, router])

  return null
}
