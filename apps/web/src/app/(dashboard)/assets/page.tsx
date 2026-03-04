'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { AssetDto, AssetStatus, UpdateAssetDto, CreateAssetDto } from '@nexus-core/shared'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { Role } from '@nexus-core/shared'
import Papa from 'papaparse'

const STATUS_BADGE: Record<AssetStatus, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  IN_USE: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  RETIRED: 'bg-gray-100 text-gray-600',
}

function AssetModal({
  asset,
  onClose,
  onSave,
}: {
  asset?: AssetDto
  onClose: () => void
  onSave: (data: CreateAssetDto | UpdateAssetDto) => void
}) {
  const [form, setForm] = useState({
    name: asset?.name ?? '',
    sku: asset?.sku ?? '',
    description: asset?.description ?? '',
    status: asset?.status ?? AssetStatus.AVAILABLE,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{asset ? 'Edit Asset' : 'New Asset'}</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {!asset && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AssetStatus })}
            >
              {Object.values(AssetStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {asset ? 'Save changes' : 'Create asset'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AssetsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<'create' | AssetDto | null>(null)
  const [auditAsset, setAuditAsset] = useState<AssetDto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const isManager = user?.role === Role.ORG_MANAGER || user?.role === Role.SUPERADMIN

  const { data, isLoading } = useQuery({
    queryKey: ['assets', { page, search }],
    queryFn: () =>
      api
        .get('/assets', { params: { page, perPage: 20, search: search || undefined } })
        .then((r) => r.data),
  })

  const { data: auditLogs } = useQuery({
    queryKey: ['audit', auditAsset?.id],
    queryFn: () => api.get(`/audit/asset/${auditAsset!.id}`).then((r) => r.data),
    enabled: !!auditAsset,
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateAssetDto) => api.post('/assets', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      setModal(null)
      toast.success('Asset created')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetDto }) => api.put(`/assets/${id}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      setModal(null)
      toast.success('Asset updated')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Asset deleted')
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to delete'),
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post('/assets/import/csv', form)
    },
    onSuccess: (r) => {
      const { created, skipped } = r.data
      qc.invalidateQueries({ queryKey: ['assets'] })
      toast.success(`Imported ${created} assets, skipped ${skipped}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Import failed'),
  })

  const handleSave = (formData: any) => {
    if (modal === 'create') {
      createMutation.mutate(formData)
    } else if (modal && typeof modal === 'object') {
      updateMutation.mutate({ id: (modal as AssetDto).id, dto: formData })
    }
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500">{data?.meta?.total ?? 0} total assets</p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Import CSV
            </button>
            <button
              onClick={() => setModal('create')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + New Asset
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or SKU..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
      />

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">SKU</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data?.map((asset: AssetDto) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {asset.name}
                      {asset.description && (
                        <p className="text-xs text-gray-400">{asset.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">{asset.sku}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[asset.status]}`}
                      >
                        {asset.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAuditAsset(asset)}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          History
                        </button>
                        {isManager && (
                          <>
                            <button
                              onClick={() => setModal(asset)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(asset.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.meta && data.meta.total > data.meta.perPage && (
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
            <p className="text-xs text-gray-500">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.meta.total)} of{' '}
              {data.meta.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= data.meta.total}
                className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Asset Modal */}
      {modal && (
        <AssetModal
          asset={modal === 'create' ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Audit History Drawer */}
      {auditAsset && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setAuditAsset(null)}
        >
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900">Asset History</h2>
              <p className="text-sm text-gray-500">
                {auditAsset.name} · {auditAsset.sku}
              </p>
            </div>
            <div className="divide-y divide-gray-100 p-4">
              {auditLogs?.map((log: any) => (
                <div key={log.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium text-gray-700">
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    by {log.actor?.displayName ?? log.actor?.email ?? log.actorId}
                  </p>
                  {log.changes?.after && (
                    <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                      {JSON.stringify(log.changes.after, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {auditLogs?.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">No history yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
