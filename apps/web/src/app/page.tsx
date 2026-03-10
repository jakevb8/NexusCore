import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'NexusCore — Resource Management',
  description:
    'NexusCore is a multi-tenant resource management platform for teams. Track assets, manage your team, and view reports across web and mobile.',
}

export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full max-w-md text-center">
        {/* Logo / brand */}
        <p className="mb-3 text-sm font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
          NexusCore
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Resource Management</h1>
        <p className="mb-10 text-base leading-relaxed text-gray-500 dark:text-gray-400">
          Track assets, manage your team, and view utilisation reports — from web, iOS, or Android.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            Go to dashboard
          </Link>
        </div>

        {/* Footer links — required by Google OAuth consent screen verification */}
        <div className="mt-16 flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-600">
          <Link
            href="/privacy-policy"
            className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            Privacy Policy
          </Link>
          <a
            href="mailto:jakev.dev@gmail.com"
            className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </main>
  )
}
