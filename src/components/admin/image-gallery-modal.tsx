'use client';

import { useState, useEffect } from 'react';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  restaurantId?: string;
  title?: string;
  description?: string;
  mediaKind?: 'image' | 'video';
}

export function ImageGalleryModal({
  isOpen,
  onClose,
  onSelect,
  restaurantId,
  title = 'Select Image',
  description = 'Choose an image from your media library or upload new',
  mediaKind = 'image',
}: ImageGalleryModalProps) {
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const filteredMediaFiles = mediaFiles.filter((media) => {
    const mimeType = media.file?.mimeType || media.type || '';
    return mediaKind === 'video'
      ? mimeType.startsWith('video/')
      : mimeType.startsWith('image/');
  });

  useEffect(() => {
    if (isOpen && restaurantId) {
      fetchMediaFiles();
    }
  }, [isOpen, restaurantId]);

  const fetchMediaFiles = async () => {
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
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('restaurant_id', restaurantId);

      const response = await fetch('/api/media/upload', {
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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <p className="mt-0.5 text-sm text-gray-600">{description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept={mediaKind === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage || !restaurantId}
                />
                <div className={`inline-flex items-center gap-2 rounded-lg border border-purple-200 px-4 py-2 text-sm font-medium transition-all ${
                  uploadingImage || !restaurantId
                    ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}>
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {mediaKind === 'video' ? 'Upload Video' : 'Upload Image'}
                    </>
                  )}
                </div>
              </label>
              <button
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loadingMedia ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm font-medium text-gray-700">
                Loading {mediaKind === 'video' ? 'videos' : 'images'}...
              </p>
            </div>
          ) : filteredMediaFiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                No {mediaKind === 'video' ? 'videos' : 'images'} found
              </h3>
              <p className="mx-auto max-w-md text-sm text-gray-600">
                Upload {mediaKind === 'video' ? 'MP4/WebM/MOV files' : 'images'} to your media library first.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredMediaFiles.map((media) => (
                <div
                  key={media.id}
                  onClick={() => handleSelectImage(media.file?.url || '')}
                  className="relative cursor-pointer group aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-purple-500 transition-all duration-200 hover:shadow-lg"
                >
                  {mediaKind === 'video' ? (
                    <>
                      <video
                        src={media.file?.url}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                      <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                        Video
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
                        <div className="truncate text-[11px] font-medium text-white">
                          {media.file?.name || 'Video'}
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 5.25a.75.75 0 011.136-.643l6 3.75a.75.75 0 010 1.286l-6 3.75A.75.75 0 017 12.75v-7.5z" />
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={media.file?.url}
                      alt={media.file?.name || 'Image'}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
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
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {filteredMediaFiles.length > 0
              ? `${filteredMediaFiles.length} ${mediaKind}${filteredMediaFiles.length !== 1 ? 's' : ''} available`
              : `No ${mediaKind}s`}
          </p>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
