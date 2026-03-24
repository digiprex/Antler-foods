'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QRCodesFormProps {
  restaurantId: string;
  restaurantName: string;
  customDomain?: string;
  stagingDomain?: string;
}

interface QRCodeData {
  type: 'menu' | 'site';
  url: string;
  title: string;
  description: string;
}

export default function QRCodesForm({ restaurantId, restaurantName, customDomain, stagingDomain }: QRCodesFormProps) {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [selectedSize, setSelectedSize] = useState<number>(256);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRefs = useRef<{ [key: string]: HTMLCanvasElement | null }>({});

  // Generate QR code data based on restaurant
  useEffect(() => {
    // Determine the base URL - prefer custom domain, then staging domain, then localhost
    let baseUrl = '';
    if (customDomain?.trim()) {
      baseUrl = `https://${customDomain.trim()}`;
    } else if (stagingDomain?.trim()) {
      baseUrl = `https://${stagingDomain.trim()}`;
    } else {
      baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    }
    
    const qrData: QRCodeData[] = [
      {
        type: 'site',
        url: `${baseUrl}/home`,
        title: 'Website QR Code',
        description: 'Customers can scan this to visit your restaurant website'
      },
      {
        type: 'menu',
        url: `${baseUrl}/menu`,
        title: 'Menu QR Code',
        description: 'Customers can scan this to view your menu directly'
      }
    ];
    
    setQrCodes(qrData);
  }, [restaurantId, restaurantName, customDomain, stagingDomain]);

  // Generate QR codes when data changes
  useEffect(() => {
    if (qrCodes.length === 0) return;
    
    const generateQRCodes = async () => {
      setIsGenerating(true);
      
      for (const qrData of qrCodes) {
        const canvas = canvasRefs.current[qrData.type];
        if (canvas) {
          try {
            await QRCode.toCanvas(canvas, qrData.url, {
              width: selectedSize,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          } catch (error) {
            console.error('Error generating QR code:', error);
          }
        }
      }
      
      setIsGenerating(false);
    };

    generateQRCodes();
  }, [qrCodes, selectedSize]);

  const downloadQRCode = (type: string, title: string) => {
    const canvas = canvasRefs.current[type];
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${restaurantName}-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Codes</h1>
        <p className="text-gray-600">
          Generate QR codes for your restaurant menu and website. Customers can scan these codes to quickly access your content.
        </p>
      </div>

      {/* Size Selector */}
      <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code Size</h2>
        <div className="flex gap-4">
          {[128, 256, 512].map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedSize === size
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {size}x{size}px
            </button>
          ))}
        </div>
      </div>

      {/* QR Codes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {qrCodes.map((qrData) => (
          <div key={qrData.type} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${
                  qrData.type === 'site'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-green-100 text-green-600'
                }`}>
                  {qrData.type === 'site' ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{qrData.title}</h3>
                  <p className="text-sm text-gray-600">{qrData.description}</p>
                </div>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="p-6">
              <div className="flex flex-col items-center">
                {isGenerating ? (
                  <div className="flex items-center justify-center" style={{ width: selectedSize, height: selectedSize }}>
                    <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                      <p className="text-sm font-medium text-gray-700">Generating...</p>
                    </div>
                  </div>
                ) : (
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[qrData.type] = el;
                    }}
                    className="border border-gray-200 rounded-lg"
                  />
                )}
              </div>

              {/* URL Display */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">URL:</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-gray-700 flex-1 truncate">{qrData.url}</code>
                  <button
                    onClick={() => copyToClipboard(qrData.url)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Copy URL"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => downloadQRCode(qrData.type, qrData.title)}
                  disabled={isGenerating}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PNG
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use QR Codes</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Print and Display:</strong> Download the QR codes and print them on table tents, posters, or business cards</p>
          <p>• <strong>Menu QR Code:</strong> Place on tables so customers can quickly access your menu</p>
          <p>• <strong>Website QR Code:</strong> Use on marketing materials to drive traffic to your full website</p>
          <p>• <strong>Size Recommendations:</strong> Use 256px for digital displays, 512px for large prints</p>
        </div>
      </div>
    </div>
  );
}