/**
 * File Upload Component
 *
 * Handles file uploads to Nhost storage and saves metadata to medias table.
 * Supports image and video uploads with validation and preview.
 */

'use client';

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import styles from './file-upload.module.css';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v', 'mkv'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'];

interface MediaFile {
  id: string;
  file_id: string;
  url: string;
  name: string;
  type: string;
  size: number;
}

interface FileUploadProps {
  /**
   * Type of files to accept
   */
  accept: 'image' | 'video' | 'both';

  /**
   * Current file URL (if any)
   */
  currentUrl?: string;

  /**
   * Callback when file is uploaded successfully
   */
  onUpload: (mediaFile: MediaFile) => void;

  /**
   * Callback when file is removed
   */
  onRemove?: () => void;

  /**
   * Label for the upload area
   */
  label: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Restaurant ID for media association
   */
  restaurantId: string;

  /**
   * Whether upload is disabled
   */
  disabled?: boolean;
}

function getFileExtension(name: string) {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed.includes('.')) {
    return null;
  }

  const extension = trimmed.split('.').pop()?.trim() || '';
  return extension || null;
}

function resolveFileKind(file: File) {
  const mime = file.type.trim().toLowerCase();
  const extension = getFileExtension(file.name);

  if (mime.startsWith('image/') || (extension && IMAGE_EXTENSIONS.includes(extension))) {
    return { kind: 'image' as const, extension };
  }

  if (mime.startsWith('video/') || (extension && VIDEO_EXTENSIONS.includes(extension))) {
    return { kind: 'video' as const, extension };
  }

  if (mime.startsWith('audio/') || (extension && AUDIO_EXTENSIONS.includes(extension))) {
    return { kind: 'audio' as const, extension };
  }

  return { kind: 'unsupported' as const, extension };
}

export default function FileUpload({
  accept,
  currentUrl,
  onUpload,
  onRemove,
  label,
  description,
  restaurantId,
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedTypes = () => {
    switch (accept) {
      case 'image':
        return IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(',');
      case 'video':
        return VIDEO_EXTENSIONS.map((extension) => `.${extension}`).join(',');
      case 'both':
        return [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
          .map((extension) => `.${extension}`)
          .join(',');
      default:
        return '';
    }
  };

  const validateFile = (file: File): string | null => {
    const fileInfo = resolveFileKind(file);

    if (fileInfo.kind === 'audio') {
      return 'Audio files (for example MP3) are not supported. Upload video files: MP4, MOV, WEBM, M4V, MKV.';
    }

    if (fileInfo.kind === 'unsupported') {
      return 'Unsupported format. Supported images: JPG, JPEG, PNG, WEBP, GIF, AVIF, BMP. Supported videos: MP4, MOV, WEBM, M4V, MKV.';
    }

    if (accept === 'image' && fileInfo.kind !== 'image') {
      return 'Please select an image file.';
    }

    if (accept === 'video' && fileInfo.kind !== 'video') {
      return 'Please select a video file.';
    }

    if (accept === 'both' && fileInfo.kind !== 'image' && fileInfo.kind !== 'video') {
      return 'Please select an image or video file.';
    }

    const maxSize = fileInfo.kind === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than ${maxSize / (1024 * 1024)}MB.`;
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/upload-optimized-media', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            `Upload failed (${response.status}${response.statusText ? `: ${response.statusText}` : ''})`,
        );
      }

      if (!payload?.success || !payload?.data) {
        throw new Error(payload?.error || 'Upload failed.');
      }

      onUpload(payload.data as MediaFile);
    } catch (caughtError) {
      console.error('Upload error:', caughtError);
      setError(caughtError instanceof Error ? caughtError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileUpload(file);
    }

    event.target.value = '';
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      void handleFileUpload(file);
    }
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
    setError(null);
  };

  const renderPreview = () => {
    if (!currentUrl) {
      return null;
    }

    const isVideo =
      currentUrl.includes('.mp4') ||
      currentUrl.includes('.mov') ||
      currentUrl.includes('.webm') ||
      currentUrl.includes('.m4v') ||
      currentUrl.includes('.mkv');

    return (
      <div className={styles.preview}>
        {isVideo ? (
          <video src={currentUrl} className={styles.previewVideo} controls muted />
        ) : (
          <img src={currentUrl} alt="Preview" className={styles.previewImage} />
        )}
        <button
          type="button"
          onClick={handleRemove}
          className={styles.removeButton}
          title="Remove file"
        >
          x
        </button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {label}
        {description ? <span className={styles.description}>{description}</span> : null}
      </label>

      {currentUrl ? (
        renderPreview()
      ) : (
        <div
          className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ''} ${
            disabled ? styles.disabled : ''
          } ${uploading ? styles.uploading : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptedTypes()}
            onChange={handleFileChange}
            className={styles.hiddenInput}
            disabled={disabled || uploading}
          />

          <div className={styles.uploadContent}>
            {uploading ? (
              <>
                <div className={styles.spinner} aria-hidden="true">
                  <span className={styles.spinnerDot}></span>
                  <span className={styles.spinnerDot}></span>
                  <span className={styles.spinnerDot}></span>
                  <span className={styles.spinnerDot}></span>
                </div>
                <p className={styles.uploadText}>Uploading...</p>
              </>
            ) : (
              <>
                <div className={styles.uploadIcon}>
                  {accept === 'video' ? 'VID' : accept === 'image' ? 'IMG' : '📁'}
                </div>
                <p className={styles.uploadText}>
                  Drop {accept === 'both' ? 'image or video' : accept} here or click to browse
                </p>
                <p className={styles.uploadHint}>
                  {accept === 'video'
                    ? 'Supported: MP4, MOV, WEBM, M4V, MKV (up to 100MB)'
                    : accept === 'image'
                      ? 'Supported: JPG, JPEG, PNG, WEBP, GIF, AVIF, BMP (up to 10MB)'
                      : 'Images: JPG/JPEG/PNG/WEBP/GIF/AVIF/BMP up to 10MB. Videos: MP4/MOV/WEBM/M4V/MKV up to 100MB.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error ? (
        <div className={styles.error}>
          <span className={styles.errorIcon}>!</span>
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
