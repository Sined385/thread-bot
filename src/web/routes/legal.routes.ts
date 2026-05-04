import { Router, Request, Response } from 'express';

const router = Router();

const baseStyle = `
  body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; max-width: 720px; margin: 48px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 28px; letter-spacing: -0.02em; margin-bottom: 4px; }
  h2 { font-size: 18px; margin-top: 28px; }
  p, li { font-size: 15px; }
  .meta { color: #6a6a6a; font-size: 13px; margin-bottom: 32px; }
  a { color: #1a1a1a; }
`;

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — Thread Bot</title>
<style>${baseStyle}</style>
</head><body>
${body}
</body></html>`;
}

router.get('/privacy', (_req: Request, res: Response) => {
  const updated = '2026-05-04';
  res.type('html').send(
    htmlPage(
      'Privacy Policy',
      `
      <h1>Privacy Policy</h1>
      <p class="meta">Last updated: ${updated}</p>

      <p>Thread Bot ("we", "us") helps a single Threads account owner draft, review, and publish posts and replies. This page describes what we collect, why, and how to remove it.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> the email address, display name, workspace name, and (optional) workspace website you provide at signup. Your password is stored as a one-way bcrypt hash; the plaintext is never persisted.</li>
        <li><strong>Threads connection:</strong> the access token issued by Threads OAuth, your Threads user ID, username, profile picture URL, granted scopes, and token expiry. Used solely to read mentions and replies and to publish posts on your behalf when you approve them.</li>
        <li><strong>Telegram connection (optional):</strong> the chat ID of the Telegram conversation you choose to link, so we can send you draft-approval messages.</li>
        <li><strong>Bot configuration:</strong> the personality, audience, content, scheduling, and guardrail settings you enter in onboarding and on the Bot settings page.</li>
        <li><strong>Drafts and published posts:</strong> the content of every draft generated for your review, the resulting published Threads media IDs, and timestamps.</li>
        <li><strong>Webhook events:</strong> Threads-side events (mentions, replies) we receive on your behalf, retained for processing and audit.</li>
        <li><strong>Session cookie:</strong> a single HttpOnly cookie carrying a signed JWT that identifies your session for 30 days. We do not use third-party tracking cookies.</li>
      </ul>

      <h2>How we use it</h2>
      <p>We use your data exclusively to operate the service: generate drafts using your settings, deliver them to you for approval, publish them to Threads with your access token, monitor mentions/replies, and refresh tokens before they expire.</p>

      <h2>Sharing</h2>
      <p>We do not sell your data. We share specific pieces with the following third parties only as required to deliver the service:</p>
      <ul>
        <li><strong>OpenAI</strong> — the prompts and context (your bot settings, comments being replied to) we send to generate draft text.</li>
        <li><strong>Meta / Threads</strong> — the OAuth flow, token exchange, post publishing, and conversation reads.</li>
        <li><strong>Telegram</strong> — the draft text and metadata sent to your linked chat for approval.</li>
        <li><strong>Our hosting provider</strong> — server logs and database storage.</li>
      </ul>

      <h2>Retention</h2>
      <p>Your data is kept for as long as your account exists. You can delete your account and associated data by contacting us at the address below. When you revoke the Threads app, we receive a deauthorization callback and remove the corresponding access token.</p>

      <h2>Your rights</h2>
      <p>You can request a copy of your data, correct it, or delete it at any time by emailing the contact address below. Where applicable, you may also have additional rights under GDPR or similar laws (access, portability, restriction, objection).</p>

      <h2>Children</h2>
      <p>The service is not directed at children under 13. We do not knowingly collect data from them.</p>

      <h2>Changes</h2>
      <p>If this policy changes materially we'll update the date above. Continued use after a change constitutes acceptance.</p>

      <h2>Contact</h2>
      <p>Questions or deletion requests: <a href="mailto:sined385@gmail.com">sined385@gmail.com</a>.</p>

      <p style="margin-top: 40px;"><a href="/terms">Terms of Service</a></p>
      `,
    ),
  );
});

router.get('/terms', (_req: Request, res: Response) => {
  const updated = '2026-05-04';
  res.type('html').send(
    htmlPage(
      'Terms of Service',
      `
      <h1>Terms of Service</h1>
      <p class="meta">Last updated: ${updated}</p>

      <p>By creating an account on Thread Bot you agree to these terms.</p>

      <h2>The service</h2>
      <p>Thread Bot lets you draft, approve, and publish content to a single Threads account you own. We provide the tools; you are responsible for the content you publish and for complying with Threads' own terms.</p>

      <h2>Your account</h2>
      <p>You're responsible for keeping your password and connected account credentials secure. Don't use the service to publish unlawful, harassing, deceptive, or infringing content. We may suspend access if you do.</p>

      <h2>Approvals</h2>
      <p>The service generates drafts using AI. Nothing is published to Threads without your explicit approval — either in the web UI or via Telegram. You are accountable for whatever you approve.</p>

      <h2>Availability and changes</h2>
      <p>We try to keep the service running but make no uptime guarantees. We may add, change, or remove features. We may discontinue the service with reasonable notice.</p>

      <h2>Disclaimer of warranties</h2>
      <p>The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we disclaim implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

      <h2>Limitation of liability</h2>
      <p>We are not liable for indirect, incidental, special, or consequential damages, or for content you publish through the service.</p>

      <h2>Termination</h2>
      <p>You can stop using the service at any time and request data deletion. We may terminate access for breach of these terms.</p>

      <h2>Contact</h2>
      <p><a href="mailto:sined385@gmail.com">sined385@gmail.com</a>.</p>

      <p style="margin-top: 40px;"><a href="/privacy">Privacy Policy</a></p>
      `,
    ),
  );
});

export default router;
