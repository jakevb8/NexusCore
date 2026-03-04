import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private resend: Resend | null = null
  private readonly frontendUrl: string

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY')
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'

    if (apiKey) {
      this.resend = new Resend(apiKey)
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not set — invite emails will not be sent. ' +
          'Set RESEND_API_KEY to enable email delivery.',
      )
    }
  }

  async sendInviteEmail({
    toEmail,
    inviteToken,
    organizationName,
    inviterName,
  }: {
    toEmail: string
    inviteToken: string
    organizationName: string
    inviterName: string
  }): Promise<void> {
    const inviteUrl = `${this.frontendUrl}/invite?token=${inviteToken}`

    if (!this.resend) {
      this.logger.log(`[DEV] Invite link for ${toEmail}: ${inviteUrl}`)
      return
    }

    try {
      await this.resend.emails.send({
        from: 'NexusCore <invites@nexuscore.app>',
        to: toEmail,
        subject: `${inviterName} invited you to join ${organizationName} on NexusCore`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:32px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">NexusCore</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">You&apos;ve been invited!</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                <strong style="color:#374151;">${inviterName}</strong> has invited you to join
                <strong style="color:#374151;">${organizationName}</strong> on NexusCore — a multi-tenant resource management platform.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                Click the button below to accept your invitation. This link expires in <strong>7 days</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${inviteUrl}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Fallback URL -->
              <p style="margin:32px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If the button doesn&apos;t work, copy and paste this link:<br />
                <a href="${inviteUrl}" style="color:#2563eb;word-break:break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                If you weren&apos;t expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
      })
      this.logger.log(`Invite email sent to ${toEmail}`)
    } catch (err) {
      // Log but don't throw — invite record is already created, link can be shared manually
      this.logger.error(`Failed to send invite email to ${toEmail}`, err)
    }
  }
}
