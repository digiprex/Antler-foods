import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * QZ Tray Certificate & Signing API
 *
 * GET  — returns the QZ Tray certificate (PEM)
 * POST — signs a message with the private key for QZ Tray trust
 *
 * Set these env vars:
 *   QZ_TRAY_CERTIFICATE  — PEM certificate string (the full -----BEGIN CERTIFICATE----- block)
 *   QZ_TRAY_PRIVATE_KEY  — PEM private key string (the full -----BEGIN PRIVATE KEY----- block)
 *
 * To generate a self-signed certificate for QZ Tray:
 *   openssl req -x509 -newkey rsa:2048 -keyout qz-private.pem -out qz-cert.pem -days 3650 -nodes -subj "/CN=Antler Foods"
 *
 * Then paste the contents of qz-cert.pem into QZ_TRAY_CERTIFICATE
 * and qz-private.pem into QZ_TRAY_PRIVATE_KEY.
 *
 * Install the certificate in QZ Tray:
 *   Copy qz-cert.pem to QZ Tray's trusted certs folder:
 *   Windows: %APPDATA%\QZ Tray\sslcert\
 *   Mac: ~/Library/Application Support/QZ Tray/sslcert/
 *   Linux: ~/.qz/sslcert/
 */

const QZ_CERTIFICATE = process.env.QZ_TRAY_CERTIFICATE || '';
const QZ_PRIVATE_KEY = process.env.QZ_TRAY_PRIVATE_KEY || '';

export async function GET() {
  if (!QZ_CERTIFICATE) {
    return NextResponse.json({
      certificate: null,
      message: 'No QZ Tray certificate configured. Set QZ_TRAY_CERTIFICATE env var.',
    });
  }

  return NextResponse.json({ certificate: QZ_CERTIFICATE });
}

export async function POST(request: NextRequest) {
  if (!QZ_PRIVATE_KEY) {
    return NextResponse.json({
      signature: '',
      message: 'No QZ Tray private key configured. Set QZ_TRAY_PRIVATE_KEY env var.',
    });
  }

  try {
    const body = await request.json();
    const toSign = body.toSign;

    if (typeof toSign !== 'string') {
      return NextResponse.json(
        { signature: '', error: 'toSign is required' },
        { status: 400 },
      );
    }

    const sign = crypto.createSign('SHA512');
    sign.update(toSign);
    const signature = sign.sign(QZ_PRIVATE_KEY, 'base64');

    return NextResponse.json({ signature });
  } catch (error) {
    console.error('[QZ Certificate] Signing error:', error);
    return NextResponse.json(
      { signature: '', error: 'Failed to sign message' },
      { status: 500 },
    );
  }
}
