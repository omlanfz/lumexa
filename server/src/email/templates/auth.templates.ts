import { emailButton, emailLayout } from './layout';

export function welcomeEmail(params: {
  name: string;
  role: 'PARENT' | 'STUDENT' | 'TEACHER';
  dashboardUrl: string;
}) {
  const roleCopy: Record<string, { headline: string; body: string }> = {
    PARENT: {
      headline: 'Welcome to Lumexa!',
      body: "Your account is ready. From your dashboard you can book classes, track your child's progress, and manage payments.",
    },
    STUDENT: {
      headline: `Welcome aboard, ${params.name}!`,
      body: 'Your Lumexa account is ready. Head to your dashboard to see your classes, missions, and Space Rank.',
    },
    TEACHER: {
      headline: 'Welcome to the Lumexa teaching team!',
      body: 'Your teacher account has been created. Complete your profile and upload your verification documents to start teaching.',
    },
  };
  const copy = roleCopy[params.role];
  return {
    subject: copy.headline,
    html: emailLayout({
      title: copy.headline,
      previewText: copy.body,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">${copy.headline}</h2>
        <p style="margin: 0 0 8px;">Hi ${params.name},</p>
        <p style="margin: 0 0 8px;">${copy.body}</p>
        ${emailButton('Go to my dashboard', params.dashboardUrl)}
      `,
    }),
  };
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  return {
    subject: 'Reset your Lumexa password',
    html: emailLayout({
      title: 'Reset your password',
      previewText: 'Use this link to reset your Lumexa password.',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Reset your password</h2>
        <p style="margin: 0 0 8px;">Hi ${params.name},</p>
        <p style="margin: 0 0 8px;">We received a request to reset your Lumexa password. Click the button below to choose a new one — this link expires in <strong>${params.expiresMinutes} minutes</strong> and can only be used once.</p>
        ${emailButton('Reset my password', params.resetUrl)}
        <p style="margin: 16px 0 0; color: #64748b; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    }),
  };
}
