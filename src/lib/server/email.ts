/**
 * Email Service
 *
 * Handles email sending using nodemailer
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

// Default sender email
const DEFAULT_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;

/**
 * Creates a nodemailer transporter instance
 */
function createTransporter(): Transporter {
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
  }

  return nodemailer.createTransport(EMAIL_CONFIG);
}

/**
 * Interface for form submission email data
 */
export interface FormSubmissionEmailData {
  formTitle: string;
  restaurantName?: string;
  submissionData: Record<string, any>;
  submittedAt: string;
}

export interface GiftCardEmailData {
  code: string;
  initialValue: number;
  currentBalance: number;
  expiryDate: string;
  restaurantName?: string;
}

/**
 * Sends an email notification for a form submission
 *
 * @param to - Recipient email address
 * @param data - Form submission data
 * @returns Promise that resolves when email is sent
 */
export async function sendFormSubmissionEmail(
  to: string,
  data: FormSubmissionEmailData
): Promise<void> {
  const transporter = createTransporter();

  // Format the submission data as HTML
  const submissionHtml = Object.entries(data.submissionData)
    .map(([key, value]) => {
      // Format the key to be more readable (e.g., firstName -> First Name)
      const formattedKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();

      return `
        <tr>
          <td style="
            padding: 14px 0;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            color: #374151;
            font-size: 14px;
            width: 40%;
            vertical-align: top;
          ">
            ${formattedKey}
          </td>
          <td style="
            padding: 14px 0;
            border-bottom: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
            line-height: 1.6;
          ">
            ${value || '<span style="color: #9ca3af; font-style: italic;">Not provided</span>'}
          </td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Form Submission</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .header { padding: 32px 24px !important; }
          .content { padding: 32px 24px !important; }
          .field-table td { display: block !important; width: 100% !important; padding: 8px 0 !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
        <tr>
          <td align="center">
            <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 600px; width: 100%;">

              <!-- Header -->
              <tr>
                <td class="header" style="padding: 48px 48px 32px 48px; border-bottom: 1px solid #e5e7eb;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <h1 style="margin: 0 0 8px 0; color: #111827; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                          New Form Submission
                        </h1>
                        ${data.restaurantName ? `
                          <p style="margin: 0; color: #6b7280; font-size: 14px; font-weight: 500;">
                            ${data.restaurantName}
                          </p>
                        ` : ''}
                      </td>
                      <td align="right" style="vertical-align: top;">
                        <div style="background-color: #f3f4f6; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                          <span style="color: #059669; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">New</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td class="content" style="padding: 48px;">

                  <!-- Form Details -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td style="padding-bottom: 24px; border-bottom: 2px solid #f3f4f6;">
                        <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 18px; font-weight: 600;">
                          ${data.formTitle}
                        </h2>
                        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                          Submitted on ${new Date(data.submittedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} at ${new Date(data.submittedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Submission Data -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                    <tr>
                      <td>
                        <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Submission Details
                        </h3>
                        <table class="field-table" width="100%" cellpadding="0" cellspacing="0">
                          ${submissionHtml}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Action Box -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background-color: #f9fafb; padding: 24px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
                          Action Required
                        </p>
                        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          A new submission has been received. Please review and respond promptly to ensure excellent customer service.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 32px 48px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; text-align: center;">
                    This notification was automatically generated by your website's form submission system.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Plain text version as fallback
  const textContent = `
NEW FORM SUBMISSION${data.restaurantName ? ` - ${data.restaurantName}` : ''}

================================================================

FORM: ${data.formTitle}
SUBMITTED: ${new Date(data.submittedAt).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})} at ${new Date(data.submittedAt).toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit'
})}

SUBMISSION DETAILS:
================================================================

${Object.entries(data.submissionData)
  .map(([key, value]) => {
    const formattedKey = key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    return `${formattedKey}: ${value || 'Not provided'}`;
  })
  .join('\n')}

================================================================

ACTION REQUIRED:
A new submission has been received. Please review and respond
promptly to ensure excellent customer service.

----------------------------------------------------------------
This notification was automatically generated by your website's
form submission system.
  `.trim();

  const mailOptions = {
    from: DEFAULT_FROM,
    to,
    subject: `New ${data.formTitle} Submission${data.restaurantName ? ` - ${data.restaurantName}` : ''}`,
    text: textContent,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Form submission email sent to ${to}`);
  } catch (error) {
    console.error('Error sending form submission email:', error);
    throw error;
  }
}

/**
 * Sends a gift card creation email to the recipient.
 */
export async function sendGiftCardEmail(
  to: string,
  data: GiftCardEmailData,
): Promise<void> {
  const transporter = createTransporter();

  const formattedInitialValue = Number(data.initialValue || 0).toFixed(2);
  const formattedCurrentBalance = Number(data.currentBalance || 0).toFixed(2);
  const formattedExpiryDate = new Date(data.expiryDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:24px;background:#f9fafb;font-family:Arial,sans-serif;color:#111827;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px;background:linear-gradient(90deg,#f5f3ff,#eef2ff);border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-size:24px;line-height:1.2;">Your Gift Card Is Ready</h1>
              <p style="margin:8px 0 0;color:#4b5563;font-size:14px;">
                ${data.restaurantName ? `${data.restaurantName}` : 'A new gift card'} has been created for you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 16px;color:#374151;font-size:14px;">Use the details below to redeem your gift card:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;">Gift Card Code</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:15px;">${data.code}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;">Initial Value</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;">$${formattedInitialValue}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;">Current Balance</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;">$${formattedCurrentBalance}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;background:#f9fafb;font-weight:600;">Expiry Date</td>
                  <td style="padding:12px 14px;">${formattedExpiryDate}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent = `
Your Gift Card Is Ready

${data.restaurantName ? `${data.restaurantName}\n` : ''}
Gift Card Code: ${data.code}
Initial Value: $${formattedInitialValue}
Current Balance: $${formattedCurrentBalance}
Expiry Date: ${formattedExpiryDate}
  `.trim();

  await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject: `Your Gift Card Code: ${data.code}`,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Verifies the email configuration is working
 *
 * @returns Promise that resolves if connection is successful
 */
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('Email configuration verification failed:', error);
    return false;
  }
}
