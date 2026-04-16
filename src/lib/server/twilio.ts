import 'server-only';

import twilio from 'twilio';

function getConfig() {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
  };
}

export async function sendSms(to: string, body: string): Promise<void> {
  const { accountSid, authToken, fromNumber } = getConfig();

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }

  if (!fromNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured.');
  }

  const client = twilio(accountSid, authToken);
  await client.messages.create({
    to,
    from: fromNumber,
    body,
  });
}

export function isTwilioConfigured(): boolean {
  const { accountSid, authToken, fromNumber } = getConfig();
  return Boolean(accountSid && authToken && fromNumber);
}
