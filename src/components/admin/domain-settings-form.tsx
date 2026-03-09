/**
 * Domain Settings Form
 *
 * Enhanced interface for configuring custom domain settings:
 * - Custom domain configuration
 * - Domain verification
 * - SSL certificate management
 * - DNS records display
 * - Redirect rules
 * - Domain status monitoring
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Toast from '@/components/ui/toast';

interface DomainConfig {
  customDomain?: string;
  isVerified: boolean;
  sslEnabled: boolean;
  wwwRedirect: boolean;
  httpsRedirect: boolean;
  verificationToken?: string;
  dnsRecords?: DNSRecord[];
  status?: 'pending' | 'active' | 'error';
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl?: string;
}

export default function DomainSettingsForm() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get('restaurant_id');
  const restaurantName = searchParams.get('restaurant_name');

  // Form state
  const [customDomain, setCustomDomain] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [wwwRedirect, setWwwRedirect] = useState(true);
  const [httpsRedirect, setHttpsRedirect] = useState(true);
  const [verificationToken, setVerificationToken] = useState('');
  const [status, setStatus] = useState<'pending' | 'active' | 'error'>('pending');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // DNS Records
  const dnsRecords: DNSRecord[] = [
    {
      type: 'A',
      name: '@',
      value: '76.76.21.21',
      ttl: '3600'
    },
    {
      type: 'CNAME',
      name: 'www',
      value: customDomain || 'your-domain.com',
      ttl: '3600'
    },
    {
      type: 'TXT',
      name: '_verification',
      value: verificationToken || 'verification-token-here',
      ttl: '3600'
    }
  ];

  // Load existing domain configuration
  useEffect(() => {
    const loadConfig = async () => {
      if (!restaurantId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/domain-config?restaurant_id=${restaurantId}`);
        const data = await response.json();

        if (data.success && data.data) {
          const config: DomainConfig = data.data;
          setCustomDomain(config.customDomain || '');
          setIsVerified(config.isVerified || false);
          setSslEnabled(config.sslEnabled ?? true);
          setWwwRedirect(config.wwwRedirect ?? true);
          setHttpsRedirect(config.httpsRedirect ?? true);
          setVerificationToken(config.verificationToken || '');
          setStatus(config.status || 'pending');
        }
      } catch (error) {
        console.error('Error loading domain config:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      setToastMessage('Restaurant ID is required');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      setSaving(true);

      const config: DomainConfig = {
        customDomain,
        isVerified,
        sslEnabled,
        wwwRedirect,
        httpsRedirect,
        verificationToken,
        status
      };

      const response = await fetch('/api/domain-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          ...config,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage('Domain settings saved successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage(data.error || 'Failed to save domain settings');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error saving domain settings:', error);
      setToastMessage('An error occurred while saving domain settings');
      setToastType('error');
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) {
      setToastMessage('Please enter a custom domain first');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      setVerifying(true);

      const response = await fetch('/api/domain-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          domain: customDomain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsVerified(true);
        setStatus('active');
        setToastMessage('Domain verified successfully!');
        setToastType('success');
        setShowToast(true);
      } else {
        setToastMessage(data.error || 'Domain verification failed');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setToastMessage('An error occurred during domain verification');
      setToastType('error');
      setShowToast(true);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage('Copied to clipboard!');
    setToastType('success');
    setShowToast(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-sm text-gray-600">Loading domain settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Domain Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure your custom domain and SSL settings for {restaurantName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Domain Status Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Domain Status</h2>
              <p className="text-sm text-gray-600">Current domain configuration status</p>
            </div>
          </div>

          <div className="space-y-4">
            {customDomain ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Custom Domain</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{customDomain}</p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    isVerified
                      ? 'bg-green-100 text-green-700'
                      : status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {isVerified ? (
                      <>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </>
                    ) : status === 'error' ? (
                      <>
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Error
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Pending Verification
                      </>
                    )}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${sslEnabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-600">SSL Enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${wwwRedirect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-600">WWW Redirect</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${httpsRedirect ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className="text-sm text-gray-600">HTTPS Redirect</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">No Custom Domain</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Add a custom domain below to get started. Your site is currently accessible at the default domain.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Custom Domain Configuration */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Custom Domain</h2>
              <p className="text-sm text-gray-600">Configure your custom domain name</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="example.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter your domain without http:// or https:// (e.g., example.com or www.example.com)
              </p>
            </div>

            {customDomain && !isVerified && (
              <button
                type="button"
                onClick={handleVerifyDomain}
                disabled={verifying}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-600 bg-white px-4 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify Domain
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* DNS Records */}
        {customDomain && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">DNS Records</h2>
                <p className="text-sm text-gray-600">Add these records to your domain's DNS settings</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">TTL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dnsRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{record.value}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.ttl}</td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(record.value)}
                          className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900">DNS Propagation</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    After adding these DNS records, it may take up to 24-48 hours for changes to propagate worldwide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SSL & Redirect Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-2.172-2.347a233.662 233.662 0 00-4.78 4.494M9.879 16.121L9 19l2.25-.75M15 10.5l4.5-4.5L21 7.5 16.5 12M3 3l1.5 1.5M4.5 4.5L10.5 10.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Security & Redirects</h2>
              <p className="text-sm text-gray-600">Configure SSL and redirect rules</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">SSL Certificate</h3>
                <p className="mt-1 text-xs text-gray-500">Automatically provision SSL certificate for HTTPS</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sslEnabled}
                  onChange={(e) => setSslEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">WWW Redirect</h3>
                <p className="mt-1 text-xs text-gray-500">Redirect www.example.com to example.com</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={wwwRedirect}
                  onChange={(e) => setWwwRedirect(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">HTTPS Redirect</h3>
                <p className="mt-1 text-xs text-gray-500">Force all traffic to use HTTPS</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={httpsRedirect}
                  onChange={(e) => setHttpsRedirect(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
