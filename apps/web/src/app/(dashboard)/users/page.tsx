'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Role } from '@nexus-core/shared'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700',
  ORG_MANAGER: 'bg-blue-100 text-blue-700',
  EMPLOYEE: 'bg-gray-100 text-gray-600',
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>(Role.ASSET_MANAGER)
  const [showInvite, setShowInvite] = useState(false)
  const isManager = me?.role === Role.ORG_MANAGER || me?.role === Role.SUPERADMIN

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  })

  const { data: invites } = useQuery({
    queryKey: ['invites'],
    queryFn: () => api.get('/users/invites').then((r) => r.data),
    enabled: isManager,
  })

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/users/invite', { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites'] })
      setInviteEmail('')
      setShowInvite(false)
      toast.success(`Invite sent to ${inviteEmail}`)
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to send invite'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-500">{users?.length ?? 0} members</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowInvite(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Invite member
          </button>
        )}
      </div>

      {/* Members table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
              <th className="px-6 py-3">Member</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usersLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : users?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                          {(u.displayName ?? u.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.displayName ?? '—'}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[u.role]}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invites */}
      {isManager && invites && invites.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-700">Pending Invites</h2>
          <div className="rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites
                  .filter((i: any) => !i.acceptedAt)
                  .map((invite: any) => (
                    <tr key={invite.id}>
                      <td className="px-6 py-4 text-gray-700">{invite.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[invite.role]}`}
                        >
                          {invite.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Invite a team member</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value={Role.ASSET_MANAGER}>Asset Manager</option>
                  <option value={Role.ORG_MANAGER}>Org Manager</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowInvite(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => inviteMutation.mutate()}
                disabled={!inviteEmail || inviteMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
