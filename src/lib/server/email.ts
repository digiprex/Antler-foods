/**
 * Email Service
 *
 * Handles email sending using nodemailer
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

function normalizeEmailValue(value: string | undefined | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeEmailPassword(password: string | undefined, host: string) {
  const normalized = normalizeEmailValue(password);
  if (!normalized) {
    return undefined;
  }

  // Gmail app passwords are shown in grouped blocks with spaces for readability.
  // Nodemailer must receive the raw 16-character value without spaces.
  if (host.toLowerCase().includes('gmail')) {
    return normalized.replace(/\s+/g, '');
  }

  return normalized;
}

const EMAIL_HOST = normalizeEmailValue(process.env.EMAIL_HOST) || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_ALLOW_SELF_SIGNED_CERTS = process.env.EMAIL_TLS_REJECT_UNAUTHORIZED === 'false';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: normalizeEmailValue(process.env.EMAIL_USER),
    pass: normalizeEmailPassword(process.env.EMAIL_PASSWORD, EMAIL_HOST),
  },
  tls: {
    rejectUnauthorized: !EMAIL_ALLOW_SELF_SIGNED_CERTS,
  },
};

// Default sender email
const DEFAULT_FROM = normalizeEmailValue(process.env.EMAIL_FROM) || EMAIL_CONFIG.auth.user;

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

export interface MenuPasswordResetEmailData {
  customerName?: string | null;
  restaurantName?: string | null;
  resetUrl: string;
  expiresInMinutes: number;
}

/**
 * Sends a password reset email for menu customer accounts.
 */
export async function sendMenuPasswordResetEmail(
  to: string,
  data: MenuPasswordResetEmailData,
): Promise<void> {
  const transporter = createTransporter();
  const accountLabel = data.restaurantName || 'Online Ordering';
  const customerLabel = data.customerName?.trim() || 'there';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:24px;background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);font-family:Arial,sans-serif;color:#0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(76,29,149,0.12);">
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg,#312e81 0%,#6d28d9 55%,#7c3aed 100%);color:#ffffff;">
              <div style="display:inline-flex;align-items:center;border-radius:999px;border:1px solid rgba(255,255,255,0.24);padding:8px 14px;background:rgba(255,255,255,0.08);margin-bottom:18px;">
                <span style="display:inline-block;height:8px;width:8px;border-radius:999px;background:#ddd6fe;margin-right:10px;"></span>
                <span style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.84);">Online Ordering</span>
              </div>
              <h1 style="margin:0;font-size:30px;line-height:1.15;letter-spacing:-0.02em;">Reset your password</h1>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.82);">
                ${accountLabel}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
                Hi ${customerLabel},
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
                We received a request to reset the password for your online ordering account. Use the button below to choose a new password.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border:1px solid #e9d5ff;border-radius:18px;background:linear-gradient(180deg,#faf5ff 0%,#ffffff 100%);padding:20px;">
                    <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#7c3aed;">Secure reset link</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                      This one-time link expires in ${data.expiresInMinutes} minutes and can only be used once.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:18px 0 0;">
                      <tr>
                        <td>
                          <a href="${data.resetUrl}" style="display:inline-block;border-radius:999px;background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%);padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;box-shadow:0 14px 32px rgba(124,58,237,0.28);">
                            Reset password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#64748b;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.7;color:#5b21b6;">
                <a href="${data.resetUrl}" style="color:#6d28d9;text-decoration:none;">${data.resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent = `
Reset your password

${accountLabel}

Hi ${customerLabel},

We received a request to reset the password for your online ordering account.
Use the link below to choose a new password:

${data.resetUrl}

This link will expire in ${data.expiresInMinutes} minutes and can only be used once.
If you did not request a password reset, you can safely ignore this email.
  `.trim();

  await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject: `Reset your password - ${accountLabel}`,
    text: textContent,
    html: htmlContent,
  });
}

export interface OrderInvoiceEmailData {
  order: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  restaurantName: string;
  pickupAddress?: string | null;
}

function formatCurrency(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : '$0.00';
}

function formatModifiers(modifiers: unknown): string {
  if (!Array.isArray(modifiers) || modifiers.length === 0) return '';
  return modifiers
    .map((m: Record<string, unknown>) => {
      const name = m.name || 'Option';
      const price = typeof m.price === 'number' && m.price > 0 ? ` (+${formatCurrency(m.price)})` : '';
      return `${name}${price}`;
    })
    .join(', ');
}

export async function sendOrderInvoiceEmail(
  to: string,
  data: OrderInvoiceEmailData,
): Promise<void> {
  const transporter = createTransporter();
  const { order, items, restaurantName, pickupAddress } = data;

  const orderNumber = order.order_number || 'N/A';
  const placedAt = order.placed_at
    ? new Date(order.placed_at as string).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';
  const customerName = [order.contact_first_name, order.contact_last_name]
    .filter(Boolean)
    .join(' ');
  const fulfillment = order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup';
  const deliveryAddress = order.delivery_address || '';

  const resolveOfferTitle = (o: Record<string, unknown>): string => {
    for (const key of ['title', 'name', 'headline', 'offerName', 'code']) {
      const v = o[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return 'Promotion';
  };

  const offerApplied = (() => {
    const raw = order.offer_applied;
    if (!raw) return null;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        return parsed as {
          type: string;
          code?: string | null;
          title?: string | null;
          name?: string | null;
          headline?: string | null;
          offerName?: string | null;
          description?: string | null;
          discountType: string;
          value: number;
          discountAmount: number;
        };
      }
      return null;
    } catch {
      return null;
    }
  })();

  const itemRowsHtml = items
    .map((item) => {
      const basePrice = typeof item.base_item_price === 'number' ? formatCurrency(item.base_item_price) : '';
      const modifierTotal = typeof item.modifier_total === 'number' && (item.modifier_total as number) > 0
        ? `<br/><span style="color:#78716c;font-size:12px;">Modifier total: ${formatCurrency(item.modifier_total)}</span>`
        : '';
      const modifiers = Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0
        ? item.selected_modifiers.map((m: Record<string, unknown>) => {
            const name = m.name || 'Option';
            const price = typeof m.price === 'number' && m.price > 0 ? ` (+${formatCurrency(m.price)})` : '';
            return `<span style="display:inline-block;margin-right:6px;">• ${name}${price}</span>`;
          }).join('')
        : '';
      const modHtml = modifiers ? `<br/><span style="color:#78716c;font-size:12px;">${modifiers}</span>${modifierTotal}` : '';
      const basePriceHtml = basePrice ? `<br/><span style="color:#78716c;font-size:12px;">Base: ${basePrice} each</span>` : '';
      const noteText = item.item_note ? `<br/><span style="color:#78716c;font-size:12px;">Note: ${item.item_note}</span>` : '';
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;font-size:14px;">
            <strong>${item.item_name}</strong>${basePriceHtml}${modHtml}${noteText}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;font-size:14px;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e7e5e4;font-size:14px;text-align:right;">${formatCurrency(item.line_total)}</td>
        </tr>`;
    })
    .join('');

  const subtotal = formatCurrency(order.sub_total);
  const couponCode = typeof order.coupon_used === 'string' && order.coupon_used.trim() ? order.coupon_used.trim() : '';
  const giftCardCode = typeof order.gift_card_used === 'string' && (order.gift_card_used as string).trim() ? (order.gift_card_used as string).trim() : '';
  const discountDetailsRows: string[] = [];
  if (offerApplied) {
    const pctSuffix = offerApplied.discountType === 'percent' ? ` (${offerApplied.value}% off)` : '';
    discountDetailsRows.push(`<tr><td colspan="3" style="padding:0 0 4px;font-size:12px;color:#059669;">Offer Applied: ${resolveOfferTitle(offerApplied as unknown as Record<string, unknown>)}${pctSuffix}</td></tr>`);
  }
  if (couponCode) {
    discountDetailsRows.push(`<tr><td colspan="3" style="padding:0 0 4px;font-size:12px;color:#059669;">Coupon: ${couponCode}</td></tr>`);
  }
  if (giftCardCode) {
    discountDetailsRows.push(`<tr><td colspan="3" style="padding:0 0 4px;font-size:12px;color:#059669;">Gift Card: ${giftCardCode}</td></tr>`);
  }
  const discount = typeof order.discount_total === 'number' && order.discount_total > 0
    ? `<tr><td colspan="2" style="padding:4px 0;font-size:14px;color:#059669;">Discount</td><td style="padding:4px 0;font-size:14px;text-align:right;color:#059669;">-${formatCurrency(order.discount_total)}</td></tr>${discountDetailsRows.join('')}`
    : '';
  const tip = typeof order.tip_total === 'number' && order.tip_total > 0
    ? `<tr><td colspan="2" style="padding:4px 0;font-size:14px;">Tip</td><td style="padding:4px 0;font-size:14px;text-align:right;">${formatCurrency(order.tip_total)}</td></tr>`
    : '';
  const tax = typeof order.tax_total === 'number' && order.tax_total > 0
    ? `<tr><td colspan="2" style="padding:4px 0;font-size:14px;">Tax</td><td style="padding:4px 0;font-size:14px;text-align:right;">${formatCurrency(order.tax_total)}</td></tr>`
    : '';
  const total = formatCurrency(order.cart_total);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden;">
      <div style="padding:32px 24px;border-bottom:1px solid #e7e5e4;">
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;">Order Invoice</h1>
        <p style="margin:0;font-size:13px;color:#78716c;">${restaurantName || 'Restaurant'}</p>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;margin-bottom:20px;font-size:14px;color:#1e293b;">
          <tr>
            <td style="padding:4px 0;"><strong>Order #</strong></td>
            <td style="padding:4px 0;">${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Date</strong></td>
            <td style="padding:4px 0;">${placedAt}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong>Customer</strong></td>
            <td style="padding:4px 0;">${customerName}</td>
          </tr>
          ${order.contact_email ? `<tr><td style="padding:4px 0;"><strong>Email</strong></td><td style="padding:4px 0;">${order.contact_email}</td></tr>` : ''}
          ${order.contact_phone ? `<tr><td style="padding:4px 0;"><strong>Phone</strong></td><td style="padding:4px 0;">${order.contact_phone}</td></tr>` : ''}
          <tr>
            <td style="padding:4px 0;"><strong>Fulfillment</strong></td>
            <td style="padding:4px 0;">${fulfillment}</td>
          </tr>
          ${deliveryAddress ? `<tr><td style="padding:4px 0;"><strong>Delivery address</strong></td><td style="padding:4px 0;">${deliveryAddress}</td></tr>` : ''}
          ${order.fulfillment_type === 'pickup' && pickupAddress ? `<tr><td style="padding:4px 0;"><strong>Pickup from</strong></td><td style="padding:4px 0;">${pickupAddress}</td></tr>` : ''}
        </table>

        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #0f172a;">
              <th style="padding:8px 0;text-align:left;font-size:13px;font-weight:600;color:#0f172a;">Item</th>
              <th style="padding:8px 0;text-align:center;font-size:13px;font-weight:600;color:#0f172a;">Qty</th>
              <th style="padding:8px 0;text-align:right;font-size:13px;font-weight:600;color:#0f172a;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
        </table>

        <table style="width:100%;margin-top:16px;">
          <tr>
            <td colspan="2" style="padding:4px 0;font-size:14px;">Subtotal</td>
            <td style="padding:4px 0;font-size:14px;text-align:right;">${subtotal}</td>
          </tr>
          ${discount}
          ${tip}
          ${tax}
          <tr style="border-top:2px solid #0f172a;">
            <td colspan="2" style="padding:8px 0;font-size:16px;font-weight:700;">Total</td>
            <td style="padding:8px 0;font-size:16px;font-weight:700;text-align:right;">${total}</td>
          </tr>
        </table>

        ${order.payment_method ? `<p style="margin:16px 0 0;font-size:13px;color:#78716c;">Paid via ${order.payment_method}</p>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;

  const textLines = [
    `Order Invoice - ${restaurantName || 'Restaurant'}`,
    `Order #: ${orderNumber}`,
    `Date: ${placedAt}`,
    `Customer: ${customerName}`,
    order.contact_email ? `Email: ${order.contact_email}` : '',
    order.contact_phone ? `Phone: ${order.contact_phone}` : '',
    `Fulfillment: ${fulfillment}`,
    deliveryAddress ? `Delivery address: ${deliveryAddress}` : '',
    order.fulfillment_type === 'pickup' && pickupAddress ? `Pickup from: ${pickupAddress}` : '',
    '',
    'Items:',
    ...items.flatMap((item) => {
      const lines = [`  ${item.item_name} x${item.quantity} - ${formatCurrency(item.line_total)}`];
      const basePrice = typeof item.base_item_price === 'number' ? formatCurrency(item.base_item_price) : '';
      if (basePrice) lines.push(`    Base: ${basePrice} each`);
      if (Array.isArray(item.selected_modifiers) && item.selected_modifiers.length > 0) {
        for (const m of item.selected_modifiers) {
          const name = (m as Record<string, unknown>).name || 'Option';
          const price = typeof (m as Record<string, unknown>).price === 'number' && ((m as Record<string, unknown>).price as number) > 0
            ? ` (+${formatCurrency((m as Record<string, unknown>).price)})`
            : '';
          lines.push(`    + ${name}${price}`);
        }
      }
      if (item.item_note) lines.push(`    Note: ${item.item_note}`);
      return lines;
    }),
    '',
    `Subtotal: ${subtotal}`,
    typeof order.discount_total === 'number' && order.discount_total > 0 ? `Discount: -${formatCurrency(order.discount_total)}` : '',
    offerApplied ? `  Offer Applied: ${resolveOfferTitle(offerApplied as unknown as Record<string, unknown>)}${offerApplied.discountType === 'percent' ? ` (${offerApplied.value}% off)` : ''}` : '',
    couponCode ? `  Coupon: ${couponCode}` : '',
    giftCardCode ? `  Gift Card: ${giftCardCode}` : '',
    typeof order.tip_total === 'number' && order.tip_total > 0 ? `Tip: ${formatCurrency(order.tip_total)}` : '',
    `Total: ${total}`,
  ].filter(Boolean);

  await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject: `Invoice for Order ${orderNumber}${restaurantName ? ` - ${restaurantName}` : ''}`,
    text: textLines.join('\n'),
    html: htmlContent,
  });
}

export interface OrderDeliveryTrackingEmailData {
  orderNumber: string;
  restaurantName: string;
  trackingUrl?: string | null;
  customerName?: string | null;
}

export async function sendOrderDeliveryTrackingEmail(
  to: string,
  data: OrderDeliveryTrackingEmailData,
): Promise<void> {
  const transporter = createTransporter();
  const customerLabel = data.customerName?.trim() || 'there';
  const trackingBlock = data.trackingUrl
    ? `
      <table cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
        <tr>
          <td>
            <a href="${data.trackingUrl}" style="display:inline-block;border-radius:999px;background:#111827;padding:14px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
              Track delivery
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;word-break:break-word;">
        ${data.trackingUrl}
      </p>
    `
    : `
      <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#475569;">
        Your order has been handed off for delivery. Live tracking details will appear shortly.
      </p>
    `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;">
          <tr>
            <td style="padding:30px 30px 22px;background:linear-gradient(135deg,#111827 0%,#1f2937 100%);color:#ffffff;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
                Delivery Update
              </p>
              <h1 style="margin:0;font-size:28px;line-height:1.15;letter-spacing:-0.02em;">
                Your order is on its way
              </h1>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.78);">
                ${data.restaurantName}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#334155;">
                Hi ${customerLabel},
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
                Your order <strong>${data.orderNumber}</strong> has been dispatched for delivery.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">
                      Order number
                    </p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">
                      ${data.orderNumber}
                    </p>
                  </td>
                </tr>
              </table>
              ${trackingBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                This message was sent automatically by ${data.restaurantName}.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent = [
    `${data.restaurantName} delivery update`,
    '',
    `Hi ${customerLabel},`,
    '',
    `Your order ${data.orderNumber} has been dispatched for delivery.`,
    data.trackingUrl ? `Track your delivery: ${data.trackingUrl}` : 'Tracking details will be shared shortly.',
  ].join('\n');

  await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject: `Your delivery is on the way - Order ${data.orderNumber}`,
    text: textContent,
    html: htmlContent,
  });
}

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
