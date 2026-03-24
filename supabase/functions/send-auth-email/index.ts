import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'onboarding@resend.dev'; // change to your verified domain once you have one

serve(async (req) => {
  // Supabase sends a POST with the auth hook payload
  const payload = await req.json();

  const { user, email_data } = payload;
  const email = user?.email ?? payload.email;
  const token = email_data?.token;

  if (!email || !token) {
    return new Response(JSON.stringify({ error: 'Missing email or token' }), { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Sign-In Code</title>
</head>
<body style="margin:0;padding:0;background:#0a0f0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f0e;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111816;border-radius:16px;border:1px solid #1f2e2b;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#064e3b 0%,#065f46 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="font-size:28px;">📊</span>
                <span style="color:#34d399;font-size:20px;font-weight:700;letter-spacing:-0.5px;">NetWorth Tracker</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#6ee7b7;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your sign-in code</p>
              <h1 style="margin:0 0 24px;color:#f0fdf4;font-size:28px;font-weight:700;line-height:1.2;">
                Here's your verification code
              </h1>

              <!-- OTP Box -->
              <div style="background:#0d1f1a;border:1px solid #1f2e2b;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
                <div style="font-size:42px;font-weight:800;letter-spacing:10px;color:#34d399;font-variant-numeric:tabular-nums;">
                  ${token}
                </div>
                <p style="margin:12px 0 0;color:#4b7a6a;font-size:13px;">Expires in 10 minutes</p>
              </div>

              <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
                Enter this code in the app to sign in and sync your financial data across devices.
              </p>

              <div style="background:#0d1f1a;border-left:3px solid #065f46;border-radius:0 8px 8px 0;padding:14px 16px;">
                <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.5;">
                  🔒 If you didn't request this code, you can safely ignore this email. Your account remains secure.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1f2e2b;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#374151;font-size:12px;">
                NetWorth Tracker · Secure financial sync
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `NetWorth Tracker <${FROM_EMAIL}>`,
      to: [email],
      subject: `${token} is your NetWorth Tracker sign-in code`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Resend error:', body);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
