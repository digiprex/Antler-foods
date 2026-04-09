'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { PrinterSettings } from '@/hooks/use-auto-print-kot';

interface PrinterSettingsFormProps {
  restaurantId: string;
  restaurantName: string;
}

export default function PrinterSettingsForm({
  restaurantId,
  restaurantName,
}: PrinterSettingsFormProps) {
  // Form state
  const [printerName, setPrinterName] = useState('');
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [autoPrintKot, setAutoPrintKot] = useState(false);
  const [printMethod, setPrintMethod] = useState<'escpos' | 'pdf'>('escpos');
  const [pollInterval, setPollInterval] = useState(15);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [qzConnecting, setQzConnecting] = useState(false);
  const [qzError, setQzError] = useState<string | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [autoPrintActive, setAutoPrintActive] = useState(false);
  const [printedCount, setPrintedCount] = useState(0);

  // QZ Tray ref (lazy-loaded)
  const qzRef = useRef<typeof import('@/lib/qz-tray') | null>(null);
  const autoPrintRef = useRef<typeof import('@/hooks/use-auto-print-kot') | null>(null);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(
          `/api/admin/printer-settings?restaurant_id=${encodeURIComponent(restaurantId)}`,
        );
        const payload = await res.json();
        if (payload.success && payload.data) {
          setPrinterName(payload.data.printerName || '');
          setPaperSize(payload.data.paperSize || '80mm');
          setAutoPrintKot(payload.data.autoPrintKot ?? false);
          setPrintMethod(payload.data.printMethod || 'escpos');
          setPollInterval(payload.data.pollIntervalSeconds ?? 15);
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    };
    void loadSettings();
  }, [restaurantId]);

  // Lazy-load QZ Tray module
  const getQZ = useCallback(async () => {
    if (!qzRef.current) {
      qzRef.current = await import('@/lib/qz-tray');
    }
    return qzRef.current;
  }, []);

  // Connect to QZ Tray
  const handleConnect = useCallback(async () => {
    setQzConnecting(true);
    setQzError(null);
    try {
      const qz = await getQZ();
      await qz.connectQZ();
      setQzConnected(true);
      toast.success('Connected to QZ Tray');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to connect';
      setQzError(message);
      setQzConnected(false);
      toast.error(
        message.includes('WebSocket')
          ? 'QZ Tray is not running. Please install and start QZ Tray.'
          : message,
      );
    } finally {
      setQzConnecting(false);
    }
  }, [getQZ]);

  // Disconnect from QZ Tray
  const handleDisconnect = useCallback(async () => {
    try {
      const qz = await getQZ();
      await qz.disconnectQZ();
    } catch {
      // ignore
    }
    setQzConnected(false);
    setAvailablePrinters([]);
    toast.success('Disconnected from QZ Tray');
  }, [getQZ]);

  // Discover printers
  const handleDiscoverPrinters = useCallback(async () => {
    setLoadingPrinters(true);
    try {
      const qz = await getQZ();
      if (!qz.isQZConnected()) {
        await qz.connectQZ();
        setQzConnected(true);
      }
      const printers = await qz.listPrinters();
      setAvailablePrinters(printers);
      if (printers.length === 0) {
        toast.error('No printers found');
      } else {
        toast.success(`Found ${printers.length} printer${printers.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to discover printers',
      );
    } finally {
      setLoadingPrinters(false);
    }
  }, [getQZ]);

  // Test print
  const handleTestPrint = useCallback(async () => {
    if (!printerName) {
      toast.error('Select a printer first');
      return;
    }
    setTestPrinting(true);
    try {
      const qz = await getQZ();
      if (!qz.isQZConnected()) {
        await qz.connectQZ();
        setQzConnected(true);
      }

      const { generateKOTEscPos } = await import('@/lib/generate-kot-escpos');
      const { generateKitchenTicketPDF } = await import(
        '@/lib/generate-kitchen-ticket-pdf'
      );

      const testData = {
        orderNumber: 'TEST-001',
        restaurantName,
        fulfillmentLabel: 'Pickup',
        placedAt: new Date().toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        items: [
          {
            item_name: 'Test Burger',
            quantity: 2,
            selected_modifiers: [
              { name: 'Extra Cheese', groupName: 'Add-ons', price: 1.5 },
            ],
            item_note: 'No onions',
          },
          {
            item_name: 'French Fries',
            quantity: 1,
            selected_modifiers: null,
            item_note: null,
          },
        ],
        orderNote: 'This is a test print',
      };

      const columns = paperSize === '58mm' ? 32 : 48;

      if (printMethod === 'pdf') {
        const doc = generateKitchenTicketPDF(testData);
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        await qz.printPDF({ printer: printerName, pdfBase64 });
      } else {
        const data = generateKOTEscPos(testData, columns);
        await qz.printRaw({ printer: printerName, data, columns });
      }

      toast.success('Test ticket sent to printer');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Test print failed',
      );
    } finally {
      setTestPrinting(false);
    }
  }, [printerName, restaurantName, paperSize, printMethod, getQZ]);

  // Save settings
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/printer-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          printer_name: printerName,
          paper_size: paperSize,
          auto_print_kot: autoPrintKot,
          print_method: printMethod,
          poll_interval_seconds: pollInterval,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save');
      }
      toast.success('Printer settings saved');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save settings',
      );
    } finally {
      setSaving(false);
    }
  }, [restaurantId, printerName, paperSize, autoPrintKot, printMethod, pollInterval]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
          <p className="text-sm font-medium text-gray-700">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* QZ Tray Connection */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">QZ Tray Connection</h2>
            <p className="text-sm text-gray-500">
              Connect to the local QZ Tray app for silent printing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
            qzConnected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            <span className={`h-2 w-2 rounded-full ${qzConnected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {qzConnected ? 'Connected' : 'Disconnected'}
          </div>

          {!qzConnected ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={qzConnecting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {qzConnecting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {qzConnecting ? 'Connecting...' : 'Connect'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Disconnect
            </button>
          )}
        </div>

        {qzError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">Connection Error</p>
            <p className="mt-0.5">{qzError}</p>
            <a
              href="https://qz.io/download/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-red-800 underline hover:text-red-900"
            >
              Download QZ Tray
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {!qzConnected && !qzError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">QZ Tray Required</p>
            <p className="mt-0.5">
              Install <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="font-medium underline">QZ Tray</a> on
              this machine for auto-printing. It runs in the background and enables silent printing to
              thermal printers without browser dialogs.
            </p>
          </div>
        )}
      </div>

      {/* Printer Selection */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Printer Selection</h2>
            <p className="text-sm text-gray-500">
              Choose which printer to use for kitchen tickets
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Printer Name</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  placeholder="Select or type printer name..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button
                type="button"
                onClick={handleDiscoverPrinters}
                disabled={loadingPrinters}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingPrinters ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                Discover
              </button>
            </div>
          </div>

          {/* Available printers list */}
          {availablePrinters.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Available Printers ({availablePrinters.length})
              </p>
              <div className="grid gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {availablePrinters.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setPrinterName(name);
                      toast.success(`Selected: ${name}`);
                    }}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                      printerName === name
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className={`h-4 w-4 shrink-0 ${printerName === name ? 'text-indigo-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span className="truncate">{name}</span>
                    {printerName === name && (
                      <svg className="ml-auto h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paper size + Print method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Paper Size</label>
              <div className="flex gap-2">
                {(['80mm', '58mm'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      paperSize === size
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {size}
                    <span className="ml-1 text-xs text-gray-400">
                      {size === '80mm' ? '(standard)' : '(narrow)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Print Method</label>
              <div className="flex gap-2">
                {([
                  { value: 'escpos' as const, label: 'ESC/POS', desc: '(raw)' },
                  { value: 'pdf' as const, label: 'PDF', desc: '(pixel)' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrintMethod(opt.value)}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                      printMethod === opt.value
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                    <span className="ml-1 text-xs text-gray-400">{opt.desc}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">
                ESC/POS is faster for thermal printers. PDF works with any printer.
              </p>
            </div>
          </div>

          {/* Test print */}
          <div>
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={testPrinting || !printerName}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testPrinting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              )}
              {testPrinting ? 'Printing...' : 'Print Test Ticket'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Print Settings */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Auto-Print KOT</h2>
            <p className="text-sm text-gray-500">
              Automatically print kitchen tickets when new orders come in
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Auto-print toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Enable Auto-Print</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Polls for new pending orders and prints KOT automatically
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoPrintKot}
              onClick={() => setAutoPrintKot(!autoPrintKot)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoPrintKot ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  autoPrintKot ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Poll interval */}
          {autoPrintKot && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Poll Interval (seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={pollInterval}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="w-12 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center text-sm font-medium text-gray-900">
                  {pollInterval}s
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                How often to check for new orders. Lower = faster prints, higher = less server load.
              </p>
            </div>
          )}

          {/* Auto-print status indicator (shown when auto-print is enabled) */}
          {autoPrintKot && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-medium">Auto-print will activate when you save these settings and have QZ Tray connected on the Orders page.</p>
              <p className="mt-1 text-xs text-emerald-600">
                The auto-print runs while you are on the admin Orders page. It checks for new pending orders every {pollInterval} seconds and prints KOT to the selected printer.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 mb-2">1</div>
            <p className="text-sm font-medium text-gray-900">Install QZ Tray</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Download from{' '}
              <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="text-indigo-600 underline">qz.io</a>.
              It runs silently in the background on this machine.
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 mb-2">2</div>
            <p className="text-sm font-medium text-gray-900">Connect & Select Printer</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Click Connect above, then Discover to find printers. Select your thermal printer (Epson, Star, etc.).
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 mb-2">3</div>
            <p className="text-sm font-medium text-gray-900">Auto-Print Enabled</p>
            <p className="text-xs text-gray-500 mt-0.5">
              New orders will auto-print a kitchen ticket. No browser dialog, no clicks needed.
            </p>
          </div>
        </div>
      </div>

      {/* Certificate Setup */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Certificate (Optional)</h2>
            <p className="text-sm text-gray-500">
              Required for the &quot;Remember&quot; checkbox in the QZ Tray trust dialog
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium mb-2">Without a certificate:</p>
          <p className="text-amber-800 mb-3">
            QZ Tray will ask you to &quot;Allow&quot; the connection each time you reload the page. Everything works, but you cannot tick &quot;Remember this decision&quot;.
          </p>
          <p className="font-medium mb-2">To enable &quot;Remember&quot;:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-amber-800">
            <li>
              Generate a self-signed certificate:
              <code className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono">
                openssl req -x509 -newkey rsa:2048 -keyout qz-private.pem -out qz-cert.pem -days 3650 -nodes
              </code>
            </li>
            <li>
              Copy <code className="rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">qz-cert.pem</code> to QZ Tray&apos;s trusted certs folder:
              <span className="block mt-0.5 text-xs text-amber-700">
                Windows: <code className="font-mono">%APPDATA%\QZ Tray\sslcert\</code> &nbsp;|&nbsp;
                Mac: <code className="font-mono">~/Library/Application Support/QZ Tray/sslcert/</code>
              </span>
            </li>
            <li>
              Add these to your <code className="rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">.env</code>:
              <span className="block mt-0.5 text-xs text-amber-700 font-mono">
                QZ_TRAY_CERTIFICATE=&quot;-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----&quot;<br />
                QZ_TRAY_PRIVATE_KEY=&quot;-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----&quot;
              </span>
            </li>
            <li>Restart the app and QZ Tray. The &quot;Remember&quot; checkbox will now be available.</li>
          </ol>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
