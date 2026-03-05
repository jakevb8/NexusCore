'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { GlobalStats, AssetStatus } from '@nexus-core/shared'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts'

const STATUS_COLORS: Record<AssetStatus, string> = {
  [AssetStatus.AVAILABLE]: '#22c55e',
  [AssetStatus.IN_USE]: '#3b82f6',
  [AssetStatus.MAINTENANCE]: '#f59e0b',
  [AssetStatus.RETIRED]: '#6b7280',
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<GlobalStats>({
    queryKey: ['reports', 'stats'],
    queryFn: () => api.get('/reports/stats').then((r) => r.data),
    refetchInterval: 5 * 60 * 1000, // re-fetch every 5 min
  })

  const pieData = stats
    ? Object.entries(stats.byStatus)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: status.replace('_', ' '),
          value: count,
          color: STATUS_COLORS[status as AssetStatus],
        }))
    : []

  const barData = stats
    ? Object.entries(stats.byStatus).map(([status, count]) => ({
        status: status.replace('_', ' '),
        count,
        fill: STATUS_COLORS[status as AssetStatus],
      }))
    : []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Organization overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Assets" value={stats?.totalAssets ?? 0} />
        <StatCard
          label="Utilization Rate"
          value={`${stats?.utilizationRate ?? 0}%`}
          sub="In Use / Total"
        />
        <StatCard label="Available" value={stats?.byStatus?.[AssetStatus.AVAILABLE] ?? 0} />
        <StatCard label="Team Members" value={stats?.totalUsers ?? 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Asset Status Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Assets by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count">
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
