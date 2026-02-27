'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface MediaFile {
  id: string;
  file?: {
    url: string;
    name?: string;
  };
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  restaurantId?: string;
  title?: string;
  description?: string;
}

export function ImageGalleryModal({
  isOpen,
  onClose,
  onSelect,
  restaurantId,
  title = 'Select Image',
  description = 'Choose an image from your media library or upload new',
}: ImageGalleryModalProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchMediaFiles = useCallback(async () => {
    if (!restaurantId) return;

    setLoadingMedia(true);
    try {
      const response = await fetch(`/api/media?restaurant_id=${restaurantId}`);
      const data = await response.json();

      if (data.success) {
        setMediaFiles(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching media files:', error);
    } finally {
      setLoadingMedia(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (isOpen && restaurantId) {
      fetchMediaFiles();
    }
  }, [isOpen, restaurantId, fetchMediaFiles]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.data?.file?.url) {
        // Refresh the media files list
        await fetchMediaFiles();
      } else {
        alert('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
      // Reset the input
      e.target.value = '';
    }
  };

  const handleSelectImage = (imageUrl: string) => {
    onSelect(imageUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] max-w-5xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-[#d8e3e7] px-8 py-6 flex justify-between items-center bg-gradient-to-r from-[#f8fbfd] to-white">
          <div>
            <h2 className="text-2xl font-semibold text-[#111827]">{title}</h2>
            <p className="text-sm text-[#6b7280] mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage || !restaurantId}
              />
              <div className={`rounded-xl bg-[#667eea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5b21b6] flex items-center gap-2 ${
                uploadingImage || !restaurantId ? 'cursor-not-allowed bg-[#cfc8ff] text-[#f8f7ff]' : ''
              }`}>
                {uploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Image
                  </>
                )}
              </div>
            </label>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#111827] transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto flex-1">
          {loadingMedia ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-[#667eea] mx-auto mb-4"></div>
              <p className="text-[#556678] font-medium">Loading images...</p>
            </div>
          ) : mediaFiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 rounded-full bg-[#f3f4f6] flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#111827] mb-2">No images found</h3>
              <p className="text-[#6b7280] text-sm max-w-md mx-auto">Upload images to your media library first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {mediaFiles.map((media) => (
                <div
                  key={media.id}
                  onClick={() => handleSelectImage(media.file?.url || '')}
                  className="relative cursor-pointer group aspect-video rounded-lg overflow-hidden border-2 border-[#d4e0e6] hover:border-[#667eea] transition-all duration-200 hover:shadow-lg"
                >
                  <Image
                    src={media.file?.url || ''}
                    alt={media.file?.name || 'Image'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    fill
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-8 h-8 rounded-full bg-[#667eea] flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#d8e3e7] bg-[#f8fbfd] px-8 py-5 flex items-center justify-between">
          <p className="text-sm text-[#6b7280]">
            {mediaFiles.length > 0 ? `${mediaFiles.length} image${mediaFiles.length !== 1 ? 's' : ''} available` : 'No images'}
          </p>
          <button
            onClick={onClose}
            className="rounded-xl border border-[#d2dee4] bg-white px-5 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-[#f7fafc]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
