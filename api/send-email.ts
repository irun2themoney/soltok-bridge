import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { emailTemplates, type EmailType, type OrderEmailData } from '../src/lib/email';

// Initialize Resend - will be undefined if no API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// From address - in production, use your verified domain
const FROM_EMAIL = process.env.EMAIL_FROM || 'SolTok Bridge <onboarding@resend.dev>';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if Resend is configured
  if (!resend) {
    console.log('Email skipped: RESEND_API_KEY not configured');
    return res.status(200).json({ 
      success: true, 
      skipped: true,
      message: 'Email service not configured' 
    });
  }

  try {
    const { type, data } = req.body as { type: EmailType; data: OrderEmailData };

    // Validate required fields
    if (!type || !data) {
      return res.status(400).json({ error: 'Missing type or data' });
    }

    if (!data.customerEmail) {
      return res.status(400).json({ error: 'Missing customer email' });
    }

    // Get the appropriate template
    const templateFn = emailTemplates[type];
    if (!templateFn) {
      return res.status(400).json({ error: `Unknown email type: ${type}` });
    }

    const template = templateFn(data);

    // Send the email
    const { data: sendData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.customerEmail],
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`Email sent: ${type} to ${data.customerEmail}, ID: ${sendData?.id}`);

    return res.status(200).json({ 
      success: true, 
      emailId: sendData?.id 
    });

  } catch (error) {
    console.error('Email handler error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}
