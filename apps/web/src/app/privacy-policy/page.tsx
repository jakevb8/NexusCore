import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | NexusCore',
  description: 'Privacy policy for the NexusCore resource management app.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            NexusCore
          </p>
          <h1 className="mb-4 text-3xl font-bold">Privacy Policy</h1>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
            This policy explains what data NexusCore collects, how it is used, and your rights
            regarding that data. NexusCore is a multi-tenant resource management application
            available on web and Android.
          </p>
        </div>

        {/* 1. Data we collect */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">1. Data we collect</h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">Account information</p>
              <p className="mt-0.5">
                When you register, we collect your name, email address, and organization name. These
                are provided by you during sign-up and are used to create and identify your account.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Google Sign-In identity
              </p>
              <p className="mt-0.5">
                NexusCore uses Google Sign-In exclusively (via Firebase Authentication). During
                sign-in, Google provides us with your email address, display name, and a unique
                Firebase user identifier (UID). We do not receive your Google password.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">Asset and team data</p>
              <p className="mt-0.5">
                Data you create within the app — including asset records, CSV imports, team member
                invitations (which include third-party email addresses), and audit log entries — is
                stored on our servers and associated with your organization.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Authentication tokens
              </p>
              <p className="mt-0.5">
                A short-lived Firebase ID token (JWT) is attached to every request made to our
                servers. This token contains your UID and email and is used to verify your identity
                on each request. It is not stored separately.
              </p>
            </div>
          </div>
        </section>

        {/* 2. How we use your data */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">2. How we use your data</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {[
              'To create and manage your account and organization',
              'To authenticate you on every request and enforce role-based access control',
              'To provide the core features of the app (asset management, team management, reporting)',
              'To send team invitation emails on your behalf when you invite members',
              'To maintain audit logs of changes made within your organization',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="flex-shrink-0 font-bold text-blue-600 dark:text-blue-400">→</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            We do not use your data for advertising, sell it to third parties, or use it for any
            purpose beyond operating and improving NexusCore.
          </p>
        </section>

        {/* 3. Third parties */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">3. Third-party services</h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Google / Firebase Authentication
              </p>
              <p className="mt-0.5">
                We use Firebase Authentication for sign-in. Google receives your account identity
                (email, UID) as part of the OAuth and token-verification flow. Firebase is governed
                by{' '}
                <a
                  href="https://policies.google.com/privacy"
                  className="text-blue-600 underline dark:text-blue-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google&apos;s Privacy Policy
                </a>
                .
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Resend (transactional email)
              </p>
              <p className="mt-0.5">
                When you invite a team member, we use Resend to deliver the invitation email. The
                recipient&apos;s email address is transmitted to Resend for this purpose only and is
                not stored by Resend beyond delivery.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Railway (hosting) &amp; Neon (database)
              </p>
              <p className="mt-0.5">
                Our API server runs on Railway and our database runs on Neon (PostgreSQL). All data
                you submit is stored in these services. Both are infrastructure providers and do not
                independently process your personal data for their own purposes.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Data retention */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">4. Data retention</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your data is retained for as long as your account is active. When you delete your
            account, your user profile, organization (if you are the last member), all assets,
            invitations, and your Firebase Authentication record are permanently deleted
            immediately. Audit log entries that referenced your account are anonymised (your user ID
            is set to null) rather than deleted, to preserve traceability for other organization
            members.
          </p>
        </section>

        {/* 5. Your rights */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">5. Your rights</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You may request access to, correction of, or deletion of your personal data at any time.
            To delete your account and all associated data, sign in to NexusCore, go to Settings,
            and select &quot;Delete Account&quot;. For other requests or if you cannot access the
            app, email us at{' '}
            <a
              href="mailto:jakev.dev@gmail.com"
              className="text-blue-600 underline dark:text-blue-400"
            >
              jakev.dev@gmail.com
            </a>
            .
          </p>
        </section>

        {/* 6. Security */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">6. Security</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            All data in transit is encrypted via HTTPS/TLS. Authentication is handled by Firebase,
            which uses industry-standard OAuth 2.0. We do not store passwords. Access to
            organization data is enforced by role-based access control on every API endpoint.
          </p>
        </section>

        {/* 7. Children */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">7. Children&apos;s privacy</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            NexusCore is intended for business use and is not directed at children under 13. We do
            not knowingly collect personal information from children under 13.
          </p>
        </section>

        {/* 8. Changes */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">8. Changes to this policy</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We may update this policy from time to time. The &quot;Last updated&quot; date below
            reflects the most recent revision. Continued use of NexusCore after changes are posted
            constitutes acceptance of the updated policy.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-10 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 text-base font-semibold">Contact</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            If you have any questions about this privacy policy, contact us at{' '}
            <a
              href="mailto:jakev.dev@gmail.com"
              className="text-blue-600 underline dark:text-blue-400"
            >
              jakev.dev@gmail.com
            </a>
            .
          </p>
        </section>

        <p className="mt-12 text-xs text-gray-400 dark:text-gray-600">
          NexusCore &mdash; jakevb8 &mdash; Last updated: March 2026
        </p>
      </div>
    </main>
  )
}
