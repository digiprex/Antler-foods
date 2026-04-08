/**
 * QZ Tray Integration
 *
 * Manages connection to the locally running QZ Tray application
 * for silent printing (no browser print dialog) to thermal printers.
 *
 * QZ Tray must be installed on the POS machine: https://qz.io/download/
 */

import qz from 'qz-tray';

let connectionPromise: Promise<void> | null = null;
let securityConfigured = false;

/**
 * Configure QZ Tray security.
 *
 * QZ Tray requires a certificate + signature to enable the "Remember" checkbox
 * in the trust dialog. Without these, users must approve every connection.
 *
 * For production: provide a real certificate via QZ_TRAY_CERTIFICATE env var
 * or the /api/admin/qz-certificate endpoint.
 *
 * For development/self-hosted: we use an override that bypasses signing.
 * The user will still see the trust prompt but can click "Allow" once per session.
 */
function setupSecurity() {
  if (securityConfigured) return;

  // Certificate: return the PEM certificate string
  // If you have a QZ Tray certificate, set it via the printer settings page
  qz.security.setCertificatePromise((resolve) => {
    // Try to fetch certificate from the stored config
    fetch('/api/admin/qz-certificate')
      .then((res) => res.json())
      .then((data) => {
        if (data.certificate) {
          resolve(data.certificate);
        } else {
          // No certificate configured — QZ will show trust prompt without "Remember"
          resolve('');
        }
      })
      .catch(() => {
        resolve('');
      });
  });

  // Signature: sign the message with the private key
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise((toSign) => {
    return (resolve) => {
      fetch('/api/admin/qz-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toSign }),
      })
        .then((res) => res.json())
        .then((data) => {
          resolve(data.signature || '');
        })
        .catch(() => {
          resolve('');
        });
    };
  });

  securityConfigured = true;
}

/**
 * Connect to the local QZ Tray instance.
 * Returns immediately if already connected. Re-uses in-flight connection attempts.
 */
export async function connectQZ(): Promise<void> {
  setupSecurity();

  if (qz.websocket.isActive()) return;

  if (connectionPromise) return connectionPromise;

  connectionPromise = qz.websocket
    .connect()
    .then(() => {
      connectionPromise = null;
    })
    .catch((err: unknown) => {
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

/** Disconnect from QZ Tray. */
export async function disconnectQZ(): Promise<void> {
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect();
  }
}

/** Check if QZ Tray is currently connected. */
export function isQZConnected(): boolean {
  return qz.websocket.isActive();
}

/**
 * List all printers visible to QZ Tray on the local machine.
 */
export async function listPrinters(): Promise<string[]> {
  await connectQZ();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

/**
 * Find a specific printer by name (partial match, case-insensitive).
 * Returns the full printer name or null.
 */
export async function findPrinter(
  name: string,
): Promise<string | null> {
  try {
    await connectQZ();
    const found = await qz.printers.find(name);
    return typeof found === 'string' ? found : null;
  } catch {
    return null;
  }
}

export interface PrintRawOptions {
  printer: string;
  data: string[];
  /** Paper width in characters (default 48 for 80mm, 32 for 58mm). */
  columns?: number;
}

/**
 * Send raw ESC/POS text commands to a thermal printer via QZ Tray.
 * This prints silently with no browser dialog.
 */
export async function printRaw({
  printer,
  data,
}: PrintRawOptions): Promise<void> {
  await connectQZ();
  const config = qz.configs.create(printer);
  await qz.print(config, data);
}

export interface PrintPDFOptions {
  printer: string;
  /** Base64-encoded PDF data. */
  pdfBase64: string;
}

/**
 * Send a PDF to a printer via QZ Tray.
 * Works with both thermal and standard printers.
 */
export async function printPDF({
  printer,
  pdfBase64,
}: PrintPDFOptions): Promise<void> {
  await connectQZ();
  const config = qz.configs.create(printer);
  const data = [
    {
      type: 'pixel',
      format: 'pdf',
      flavor: 'base64',
      data: pdfBase64,
    },
  ];
  await qz.print(config, data);
}
