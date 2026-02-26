/**
 * File Upload Component
 * 
 * Handles file uploads to Nhost storage and saves metadata to medias table
 * Supports images and videos with preview functionality
 */

'use client';

import { useState, useRef } from 'react';
import styles from './file-upload.module.css';

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

export default function FileUpload({
  accept,
  currentUrl,
  onUpload,
  onRemove,
  label,
  description,
  restaurantId,
  disabled = false
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get accepted file types
  const getAcceptedTypes = () => {
    switch (accept) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'both':
        return 'image/*,video/*';
      default:
        return '';
    }
  };

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    const maxSize = accept === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for images
    
    if (file.size > maxSize) {
      return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (accept === 'image' && !isImage) {
      return 'Please select an image file';
    }
    
    if (accept === 'video' && !isVideo) {
      return 'Please select a video file';
    }
    
    if (accept === 'both' && !isImage && !isVideo) {
      return 'Please select an image or video file';
    }

    return null;
  };

  // Handle file upload
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

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        onUpload(data.data);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  // Handle click to open file dialog
  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  // Handle remove file
  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
    setError(null);
  };

  // Render preview
  const renderPreview = () => {
    if (!currentUrl) return null;

    const isVideo = currentUrl.includes('.mp4') || currentUrl.includes('.mov') || currentUrl.includes('.webm');

    return (
      <div className={styles.preview}>
        {isVideo ? (
          <video
            src={currentUrl}
            className={styles.previewVideo}
            controls
            muted
          />
        ) : (
          <img
            src={currentUrl}
            alt="Preview"
            className={styles.previewImage}
          />
        )}
        <button
          type="button"
          onClick={handleRemove}
          className={styles.removeButton}
          title="Remove file"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {label}
        {description && <span className={styles.description}>{description}</span>}
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
                  {accept === 'video' ? '🎥' : accept === 'image' ? '🖼️' : '📁'}
                </div>
                <p className={styles.uploadText}>
                  Drop {accept === 'both' ? 'image or video' : accept} here or click to browse
                </p>
                <p className={styles.uploadHint}>
                  {accept === 'video' 
                    ? 'MP4, MOV, WebM up to 100MB'
                    : accept === 'image'
                    ? 'JPG, PNG, WebP up to 10MB'
                    : 'Images up to 10MB, Videos up to 100MB'
                  }
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
