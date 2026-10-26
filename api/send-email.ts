/**
 * Vercel Serverless Function: /api/send-email
 * Securely handles contact and notification email dispatch via Brevo (Sendinblue).
 *
 * Requirements:
 * - Environment variable: BREVO_API_KEY (configured on Vercel)
 * - Optional env: CONTACT_TO_EMAIL (defaults to verified admin address)
 * - Verified sender: pushkarj.explorer4127@gmail.com
 */

interface SendEmailBody {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  _honeypot?: string;
}

// In-memory rate limiting map for basic spam suppression per instance
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function parseJsonBody(req: any): Promise<SendEmailBody> {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  // If streaming body
  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', (chunk: any) => {
      bodyStr += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(bodyStr || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: any, res: any) {
  // CORS / Preflight handling
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported.',
    });
  }

  // 2. Client IP & Rate Limiting
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.socket?.remoteAddress || 'unknown';

  const now = Date.now();
  const rateRecord = rateLimitMap.get(clientIp);

  if (rateRecord && now < rateRecord.resetAt) {
    if (rateRecord.count >= MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please wait a moment before sending another message.',
      });
    }
    rateRecord.count += 1;
  } else {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  }

  // 3. Parse Body
  const body = await parseJsonBody(req);
  const { name, email, subject, message, _honeypot } = body;

  // Bot Trap: if honeypot is populated, pretend success without sending
  if (_honeypot && String(_honeypot).trim() !== '') {
    return res.status(200).json({ success: true, message: 'Message sent successfully.' });
  }

  // 4. Input Validations
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'Name is required.' });
  }
  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'Email address is required.' });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Validation Error', message: 'Message content is required.' });
  }

  const cleanName = name.trim().slice(0, 100);
  const cleanEmail = email.trim().toLowerCase().slice(0, 254);
  const cleanSubject = (typeof subject === 'string' ? subject.trim() : 'New Contact Inquiry').slice(0, 200);
  const cleanMessage = message.trim().slice(0, 5000);

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Validation Error', message: 'Invalid email address provided.' });
  }

  // 5. Check Brevo API Key
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    console.error('[Brevo Error] BREVO_API_KEY is not configured in Vercel environment variables.');
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Email service is temporarily unavailable. Please try again later.',
    });
  }

  // Destination admin address
  const toEmail = process.env.CONTACT_TO_EMAIL || 'pushkarj.explorer4127@gmail.com';
  const senderEmail = 'pushkarj.explorer4127@gmail.com'; // Verified Brevo Sender Address

  // 6. Build Safe HTML and Text Templates
  const escapedName = escapeHtml(cleanName);
  const escapedEmail = escapeHtml(cleanEmail);
  const escapedSubject = escapeHtml(cleanSubject);
  const escapedMessage = escapeHtml(cleanMessage).replace(/\n/g, '<br/>');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header { background: #0b3b60; color: #ffffff; padding: 18px 24px; border-bottom: 3px solid #f47920; }
    .header h2 { margin: 0; font-size: 18px; font-weight: 700; }
    .content { padding: 24px; font-size: 14px; line-height: 1.6; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    .meta-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .meta-label { font-weight: 600; color: #64748b; width: 120px; }
    .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0b3b60; padding: 16px; border-radius: 4px; font-size: 14px; color: #334155; }
    .footer { background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>📬 New Portal Contact Submission</h2>
    </div>
    <div class="content">
      <table class="meta-table">
        <tr>
          <td class="meta-label">From:</td>
          <td><strong>${escapedName}</strong></td>
        </tr>
        <tr>
          <td class="meta-label">Sender Email:</td>
          <td><a href="mailto:${escapedEmail}">${escapedEmail}</a></td>
        </tr>
        <tr>
          <td class="meta-label">Subject:</td>
          <td>${escapedSubject}</td>
        </tr>
      </table>

      <div class="meta-label" style="margin-bottom: 6px;">Message Body:</div>
      <div class="message-box">
        ${escapedMessage}
      </div>
    </div>
    <div class="footer">
      Dispatched securely via Brevo Transactional API • AICTE Complaint Coordination Platform
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
NEW PORTAL CONTACT SUBMISSION
=============================
From: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}

Message:
${cleanMessage}

---
Dispatched via Brevo Transactional Email Service.
  `.trim();

  // 7. Dispatch to Brevo SMTP API
  try {
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'AICTE Portal Notification',
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: 'AICTE Administration',
          },
        ],
        replyTo: {
          email: cleanEmail,
          name: cleanName,
        },
        subject: `[Portal Inquiry] ${cleanSubject}`,
        htmlContent,
        textContent,
      }),
    });

    if (!brevoResponse.ok) {
      const errText = await brevoResponse.text();
      console.error(`[Brevo API Error ${brevoResponse.status}]:`, errText.slice(0, 300));
      return res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to dispatch email via upstream provider.',
      });
    }

    const data = await brevoResponse.json();
    return res.status(200).json({
      success: true,
      messageId: data?.messageId || undefined,
      message: 'Your inquiry has been successfully transmitted.',
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Brevo Dispatch Error]:', error?.message || error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while transmitting your message.',
    });
  }
}
