'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { GlobalStats, AssetStatus } from '@nexus-core/shared'
import { useAuth } from '@/providers/auth-provider'
import { Role } from '@nexus-core/shared'

const STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: 'Available',
  IN_USE: 'In Use',
  MAINTENANCE: 'Maintenance',
  RETIRED: 'Retired',
}

export default function ReportsPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === Role.SUPERADMIN

  const { data: orgStats } = useQuery<GlobalStats>({
    queryKey: ['reports', 'org-stats'],
    queryFn: () => api.get('/reports/stats').then((r) => r.data),
  })

  const { data: systemStats } = useQuery<GlobalStats & { totalOrganizations: number }>({
    queryKey: ['reports', 'system-stats'],
    queryFn: () => api.get('/reports/system').then((r) => r.data),
    enabled: isSuperAdmin,
  })

  const stats = isSuperAdmin ? systemStats : orgStats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">
          {isSuperAdmin ? 'System-wide analytics' : 'Organization analytics'} · Cached for 5 minutes
        </p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-sm text-gray-500">Total Assets</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalAssets}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-sm text-gray-500">Utilization Rate</p>
              <p className="mt-1 text-3xl font-bold text-blue-600">{stats.utilizationRate}%</p>
              <p className="mt-1 text-xs text-gray-400">
                {stats.byStatus[AssetStatus.IN_USE]} of {stats.totalAssets} in use
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-sm text-gray-500">Team Members</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            {isSuperAdmin && 'totalOrganizations' in stats && (
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-500">Organizations</p>
                <p className="mt-1 text-3xl font-bold text-purple-600">{stats.totalOrganizations}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Asset Breakdown</h2>
            <div className="space-y-3">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const pct = stats.totalAssets > 0 ? (count / stats.totalAssets) * 100 : 0
                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-700">{STATUS_LABELS[status as AssetStatus]}</span>
                      <span className="font-medium text-gray-900">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
