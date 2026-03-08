import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delete Your Account | NexusCore',
  description: 'How to request deletion of your NexusCore account and associated data.',
}

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            NexusCore
          </p>
          <h1 className="mb-4 text-3xl font-bold">Account &amp; Data Deletion</h1>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
            You can request deletion of your NexusCore account and all associated data at any time.
            Follow the steps below.
          </p>
        </div>

        {/* Steps */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">How to request deletion</h2>
          <ol className="list-none space-y-4">
            {[
              {
                step: '1',
                title: 'Sign in to NexusCore',
                body: (
                  <>
                    Open the NexusCore app or go to{' '}
                    <a
                      href="https://nexus-core-rms.web.app"
                      className="text-blue-600 underline dark:text-blue-400"
                    >
                      nexus-core-rms.web.app
                    </a>{' '}
                    and sign in with your Google account.
                  </>
                ),
              },
              {
                step: '2',
                title: 'Open Settings',
                body: 'Tap the Settings link in the sidebar (web) or the Settings tab in the mobile app.',
              },
              {
                step: '3',
                title: 'Select "Delete Account"',
                body: 'Scroll to the Danger Zone section and click or tap "Delete Account". Confirm when prompted.',
              },
              {
                step: '4',
                title: 'Confirmation',
                body: 'You will receive confirmation that your account deletion request has been received. Deletion is processed within 30 days.',
              },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {step}
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Alternatively */}
        <section className="mb-10 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 text-base font-semibold">Can&apos;t access the app?</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Email us at{' '}
            <a
              href="mailto:support@nexuscore.app"
              className="text-blue-600 underline dark:text-blue-400"
            >
              support@nexuscore.app
            </a>{' '}
            from the email address associated with your account. Include the subject line{' '}
            <strong>Account Deletion Request</strong>. We will process your request within 30 days.
          </p>
        </section>

        {/* What gets deleted */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">What data is deleted</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {[
              'Your user profile (name, email address, role)',
              'Your organization and all its members, if you are the last member',
              'All assets, audit logs, and team invitations belonging to your organization',
              'Your Firebase Authentication record',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="font-bold text-green-600 dark:text-green-400">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* What is retained */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">What data is retained and why</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {[
              {
                item: 'Anonymised audit log records',
                reason:
                  'Retained for up to 90 days in anonymised form for security and compliance purposes. Your name and email are removed; only the action type and timestamp are kept.',
              },
              {
                item: 'Billing and transaction records',
                reason:
                  'If applicable, retained for the period required by law (typically 7 years).',
              },
            ].map(({ item, reason }) => (
              <li key={item} className="flex gap-2">
                <span className="flex-shrink-0 font-bold text-yellow-500">!</span>
                <span>
                  <strong className="text-gray-800 dark:text-gray-200">{item}:</strong> {reason}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">
          NexusCore &mdash; jakevb8 &mdash; Last updated: March 2026
        </p>
      </div>
    </main>
  )
}
