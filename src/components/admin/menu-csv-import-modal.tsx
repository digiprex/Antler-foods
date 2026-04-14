'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { nhost } from '@/lib/nhost';

type IssueType = 'error' | 'conflict' | 'warning';

type MenuCsvImportSummary = {
  categoriesToCreate: number;
  categoriesToUpdate: number;
  itemsToCreate: number;
  itemsToUpdate: number;
  modifierGroupsToCreate: number;
  modifierGroupsToReuse: number;
  modifierItemsToCreate: number;
  itemModifierLinksToApply: number;
  errors: number;
  conflicts: number;
  warnings: number;
};

type MenuCsvIssue = {
  type: IssueType;
  rowNumber: number | null;
  recordType: string;
  key: string | null;
  message: string;
};

type MenuCsvPreview = {
  fileName: string;
  summary: MenuCsvImportSummary;
  issues: MenuCsvIssue[];
  hasBlockingIssues: boolean;
};

type MenuCsvImportModalProps = {
  isOpen: boolean;
  restaurantId: string;
  menuId: string;
  menuName: string;
  onClose: () => void;
  onImported: () => Promise<void> | void;
};

export default function MenuCsvImportModal({
  isOpen,
  restaurantId,
  menuId,
  menuName,
  onClose,
  onImported,
}: MenuCsvImportModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<MenuCsvPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFileName('');
      setCsvText('');
      setPreview(null);
      setIsPreviewing(false);
      setIsApplying(false);
      setProgressMessage('');
      setCurrentStep('upload');
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await processFile(file);
  }, []);

  const processFile = async (file: File) => {
    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        toast.error('❌ Excel files (.xlsx, .xls) are not supported. Please convert to CSV first.\n\n💡 In Excel: File → Save As → CSV (Comma delimited)', { duration: 6000 });
      } else {
        toast.error(`❌ Invalid file type. Only CSV files are supported.\n\nYou uploaded: ${file.name}`, { duration: 5000 });
      }
      return;
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('CSV file is too large. Maximum size is 5MB.');
      return;
    }

    try {
      const nextCsvText = await file.text();
      const lineCount = nextCsvText.split('\n').length;
      const MAX_ROWS = 10000;
      if (lineCount > MAX_ROWS) {
        toast.error(`CSV has too many rows (${lineCount.toLocaleString()}). Maximum is ${MAX_ROWS.toLocaleString()} rows.`);
        return;
      }

      setSelectedFileName(file.name);
      setCsvText(nextCsvText);
      setPreview(null);
      setCurrentStep('upload');
      toast.success('✅ File loaded successfully!');
    } catch {
      toast.error('Failed to read the selected CSV file.');
    }
  };

  const fetchWithAuth = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const accessToken = await nhost.auth.getAccessToken();
    if (!accessToken) {
      throw new Error('Your session has expired. Please login again.');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  const blockingIssueCount = useMemo(
    () =>
      preview?.issues.filter(
        (issue) => issue.type === 'error' || issue.type === 'conflict',
      ).length || 0,
    [preview],
  );

  const handleDownload = async (mode: 'export' | 'sample') => {
    try {
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(
          restaurantId,
        )}/menus/${encodeURIComponent(menuId)}/csv/${mode}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        const payload = await safeParseJson(response);
        throw new Error(payload?.error || `Failed to download ${mode} CSV.`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const match = contentDisposition.match(/filename=\"?([^"]+)\"?/i);
      const fileName =
        match?.[1] || `${mode === 'export' ? menuName : 'menu-import-sample'}.csv`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${mode === 'export' ? 'Menu exported' : 'Sample downloaded'}!`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : `Failed to download ${mode} CSV.`,
      );
    }
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await processFile(file);
    event.target.value = '';
  };

  const handlePreview = async () => {
    if (!csvText.trim()) {
      toast.error('Select a CSV file first.');
      return;
    }

    try {
      setIsPreviewing(true);
      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(
          restaurantId,
        )}/menus/${encodeURIComponent(menuId)}/csv/import-preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvText,
            fileName: selectedFileName || undefined,
          }),
        },
      );

      const payload = await safeParseJson(response);
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(payload?.error || 'Failed to preview CSV import.');
      }

      setPreview(payload.data as MenuCsvPreview);
      setCurrentStep('preview');
      if (payload.data.hasBlockingIssues) {
        toast.error('Preview found blocking issues. Fix them before importing.');
      } else {
        toast.success('Preview is ready. You can import this file.');
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to preview CSV import.',
      );
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleApplyImport = async () => {
    if (!preview || preview.hasBlockingIssues) {
      toast.error('Resolve blocking issues before importing.');
      return;
    }

    try {
      setIsApplying(true);
      setProgressMessage('Starting import...');

      const totalOperations =
        preview.summary.categoriesToCreate +
        preview.summary.categoriesToUpdate +
        preview.summary.itemsToCreate +
        preview.summary.itemsToUpdate +
        preview.summary.modifierGroupsToCreate +
        preview.summary.modifierItemsToCreate;

      if (preview.summary.categoriesToCreate > 0 || preview.summary.categoriesToUpdate > 0) {
        setProgressMessage(`Processing categories...`);
      }

      if (preview.summary.modifierGroupsToCreate > 0) {
        setProgressMessage(`Creating modifier groups...`);
      }

      const response = await fetchWithAuth(
        `/api/restaurants/${encodeURIComponent(
          restaurantId,
        )}/menus/${encodeURIComponent(menuId)}/csv/import`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvText,
            fileName: selectedFileName || undefined,
          }),
        },
      );

      const payload = await safeParseJson(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to import menu CSV.');
      }

      setProgressMessage('Refreshing menu data...');
      await onImported();
      toast.success(`🎉 Menu imported successfully! ${totalOperations} operations completed.`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to import menu CSV.',
      );
    } finally {
      setIsApplying(false);
      setProgressMessage('');
    }
  };

  if (!isOpen || !isMounted || typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Clean Header */}
        <div className="border-b border-gray-200 bg-white px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Import Menu CSV
                </h3>
                <p className="mt-0.5 text-sm text-gray-600">
                  Bulk update your <span className="font-medium text-purple-600">{menuName}</span> menu
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Clean Progress Steps */}
          <div className="mt-8 flex items-center justify-center">
            {[
              { step: 'upload', label: 'Upload File', number: 1 },
              { step: 'preview', label: 'Preview', number: 2 },
              { step: 'complete', label: 'Import', number: 3 },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                      currentStep === item.step
                        ? 'bg-purple-600 text-white'
                        : (currentStep === 'preview' && item.step === 'upload') ||
                          (currentStep === 'complete' && item.step !== 'complete')
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {(currentStep === 'preview' && item.step === 'upload') ||
                    (currentStep === 'complete' && item.step !== 'complete') ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      item.number
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      currentStep === item.step ? 'text-purple-600' : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div
                    className={`mx-6 h-0.5 w-24 transition-colors ${
                      (currentStep === 'preview' && item.step === 'upload') ||
                      (currentStep === 'complete' && item.step !== 'complete')
                        ? 'bg-green-600'
                        : currentStep === item.step && index === 0
                        ? 'bg-purple-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-8 py-6">
          {!preview ? (
            // Upload Step
            <div className="mx-auto max-w-3xl space-y-6">
              {/* Quick Actions */}
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleDownload('export')}
                  className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 text-left transition-all hover:border-purple-300 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Export Current Menu</h4>
                    <p className="mt-1 text-sm text-gray-600">Download your existing menu as CSV</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => void handleDownload('sample')}
                  className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Download Sample</h4>
                    <p className="mt-1 text-sm text-gray-600">Get a template with example data</p>
                  </div>
                </button>
              </div>

              {/* Drag & Drop Upload */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-lg border-2 border-dashed transition-all ${
                  isDragging
                    ? 'border-purple-400 bg-purple-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <label className="block cursor-pointer px-6 py-12">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileSelection}
                  />
                  <div className="flex flex-col items-center text-center">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
                      isDragging ? 'bg-purple-600' : 'bg-gray-200'
                    }`}>
                      <svg className={`h-8 w-8 transition-colors ${isDragging ? 'text-white' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>

                    {selectedFileName ? (
                      <div className="mt-6">
                        <div className="inline-flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-green-900">{selectedFileName}</span>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          Click to change file or drag a new one
                        </p>
                      </div>
                    ) : (
                      <>
                        <h4 className="mt-6 text-lg font-semibold text-gray-900">
                          {isDragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
                        </h4>
                        <p className="mt-2 text-sm text-gray-600">
                          or <span className="font-medium text-purple-600">click to browse</span>
                        </p>
                        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                          <span className="rounded bg-gray-100 px-2.5 py-1">Max 5MB</span>
                          <span className="rounded bg-gray-100 px-2.5 py-1">Max 10K rows</span>
                          <span className="rounded bg-green-100 px-2.5 py-1 text-green-700">CSV only</span>
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Validate Button */}
              {csvText && (
                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={!csvText.trim() || isPreviewing}
                  className="w-full rounded-lg bg-purple-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPreviewing ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Validating...
                    </span>
                  ) : (
                    'Validate & Preview Changes'
                  )}
                </button>
              )}

              {/* Info Cards */}
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-blue-900">Have an Excel file (.xlsx)?</h5>
                      <p className="mt-1 text-sm text-blue-800 leading-relaxed">
                        Excel files are not supported. Convert to CSV first: Open in Excel → <span className="font-semibold">File → Save As → CSV (Comma delimited)</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-600">
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-amber-900">Important: CSV Keys</h5>
                      <p className="mt-1 text-sm text-amber-800 leading-relaxed">
                        The <code className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold">category_key</code>, <code className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold">item_key</code>, <code className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold">modifier_group_key</code>, and <code className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold">modifier_item_key</code> columns are used to match existing records. Keep them unchanged to update, or change them to create new ones.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Preview Step
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Preview Summary</h4>
                  <p className="mt-0.5 text-sm text-gray-600">
                    File: <span className="font-medium">{preview.fileName}</span>
                  </p>
                </div>
                <div
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    preview.hasBlockingIssues
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {preview.hasBlockingIssues
                    ? `${blockingIssueCount} blocking issue${blockingIssueCount === 1 ? '' : 's'}`
                    : 'Ready to import'}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard label="Categories" value={`${preview.summary.categoriesToCreate} new / ${preview.summary.categoriesToUpdate} update`} />
                <SummaryCard label="Items" value={`${preview.summary.itemsToCreate} new / ${preview.summary.itemsToUpdate} update`} />
                <SummaryCard label="Modifier groups" value={`${preview.summary.modifierGroupsToCreate} new / ${preview.summary.modifierGroupsToReuse} reuse`} />
                <SummaryCard label="Links" value={`${preview.summary.itemModifierLinksToApply} links`} />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <StatusPill tone="error" label={`${preview.summary.errors} errors`} />
                <StatusPill tone="conflict" label={`${preview.summary.conflicts} conflicts`} />
                <StatusPill tone="warning" label={`${preview.summary.warnings} warnings`} />
              </div>

              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h5 className="text-sm font-semibold text-gray-900">Issues & Warnings</h5>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {preview.issues.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {preview.issues.map((issue, index) => (
                        <div key={`${issue.recordType}-${issue.key}-${index}`} className="flex gap-3 px-4 py-3 hover:bg-gray-50">
                          <StatusPill tone={issue.type} label={issue.type.toUpperCase()} compact />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {issue.recordType}
                              {issue.rowNumber ? ` · Row ${issue.rowNumber}` : ''}
                              {issue.key ? ` · ${issue.key}` : ''}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {issue.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-green-700">No issues found</p>
                      <p className="mt-1 text-xs text-gray-500">This file can be imported</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-8 py-4">
          <p className="text-sm text-gray-600">
            {!preview ? 'Upload a CSV file to get started' : 'Import will not delete existing records'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => void handleApplyImport()}
                disabled={!preview || preview.hasBlockingIssues || isApplying}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isApplying && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                )}
                {isApplying ? (progressMessage || 'Importing...') : 'Apply Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function StatusPill({
  tone,
  label,
  compact = false,
}: {
  tone: IssueType;
  label: string;
  compact?: boolean;
}) {
  const toneClasses =
    tone === 'error'
      ? 'bg-red-100 text-red-800'
      : tone === 'conflict'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-blue-100 text-blue-800';

  return (
    <span
      className={`inline-flex items-center rounded font-semibold uppercase tracking-wide ${toneClasses} ${
        compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-[11px]'
      }`}
    >
      {label}
    </span>
  );
}

async function safeParseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
