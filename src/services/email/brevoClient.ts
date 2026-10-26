/**
 * Client-Side Brevo Email Dispatch Service
 * Sends contact form submissions and notifications to the serverless /api/send-email endpoint.
 *
 * NOTE: The BREVO_API_KEY is NEVER exposed to the browser.
 * It is held securely on the server/Vercel environment.
 */

export interface ContactEmailPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
  _honeypot?: string;
}

export interface ContactEmailResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

/**
 * Send an email notification via the server-side /api/send-email endpoint
 */
export async function sendContactEmail(payload: ContactEmailPayload): Promise<ContactEmailResponse> {
  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Server responded with status ${response.status}`);
  }

  return {
    success: true,
    message: data.message || 'Email dispatched successfully.',
    messageId: data.messageId,
  };
}
