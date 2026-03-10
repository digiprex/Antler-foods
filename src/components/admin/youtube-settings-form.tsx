/**
 * YouTube Settings Form
 *
 * Enhanced interface for configuring YouTube video settings:
 * - Video URL/ID input
 * - Layout selection (default, theater, split, etc.)
 * - Playback options (autoplay, mute, loop, controls)
 * - Styling customization
 * - Live preview modal
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { YouTubeConfig } from "@/types/youtube.types";
import { DEFAULT_YOUTUBE_CONFIG } from "@/types/youtube.types";
import { useSectionStyleDefaults } from "@/hooks/use-section-style-defaults";
import { SectionTypographyControls } from "@/components/admin/section-typography-controls";
import YouTubeSection from "@/components/youtube-section";
import Toast from "@/components/ui/toast";
import styles from "./youtube-settings-form.module.css";

interface YouTubeFormProps {
  pageId?: string;
  restaurantId?: string;
}

export default function YouTubeSettingsForm({
  pageId,
  restaurantId,
}: YouTubeFormProps) {
  const searchParams = useSearchParams();
  const restaurantNameFromQuery =
    searchParams.get("restaurant_name") || undefined;
  const restaurantIdFromQuery = searchParams.get("restaurant_id")?.trim() ?? "";
  const finalRestaurantId = restaurantIdFromQuery || restaurantId || "";
  const sectionStyleDefaults = useSectionStyleDefaults(finalRestaurantId);

  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams.get("new_section") === "true";
  const templateId = searchParams.get("template_id") || null;

  // Form state
  const [config, setConfig] = useState<YouTubeConfig>({
    ...DEFAULT_YOUTUBE_CONFIG,
    ...sectionStyleDefaults,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Preview visibility state
  const [showPreview, setShowPreview] = useState(false);

  // Gallery popup state
  const [showGallery, setShowGallery] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (finalRestaurantId && !isNewSection) {
      fetchYouTubeConfig();
    }
  }, [
    finalRestaurantId,
    pageId,
    templateId,
    isNewSection,
    sectionStyleDefaults,
  ]);

  useEffect(() => {
    if (!isNewSection) return;
    setConfig((prev) => ({
      ...DEFAULT_YOUTUBE_CONFIG,
      ...sectionStyleDefaults,
      ...prev,
    }));
  }, [isNewSection, sectionStyleDefaults]);

  const fetchYouTubeConfig = async () => {
    // Don't fetch existing config if this is a new section
    if (isNewSection) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (finalRestaurantId) params.append("restaurant_id", finalRestaurantId);
      if (pageId) params.append("page_id", pageId);
      if (templateId) params.append("template_id", templateId);

      const url = `/api/youtube-config?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setConfig({
          ...DEFAULT_YOUTUBE_CONFIG,
          ...sectionStyleDefaults,
          ...data.data,
        });
      }
    } catch (error) {
      console.error("Error fetching YouTube config:", error);
      setToastMessage("Error loading settings");
      setToastType("error");
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalRestaurantId) {
      setToastMessage("Restaurant ID not found. Please refresh the page.");
      setToastType("error");
      setShowToast(true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/youtube-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          restaurant_id: finalRestaurantId,
          page_id: pageId || null,
          template_id: templateId || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(
          isNewSection
            ? "YouTube section created successfully!"
            : "YouTube settings saved successfully!",
        );
        setToastType("success");
        setShowToast(true);
      } else {
        setToastMessage("Error saving settings: " + data.error);
        setToastType("error");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error saving YouTube config:", error);
      setToastMessage("Error saving settings");
      setToastType("error");
      setShowToast(true);
    } finally {
      setSaving(false);
    }
  };

  const extractVideoId = (url: string): string => {
    if (!url) return "";

    // If it's already just an ID
    if (url.length === 11 && !url.includes("/") && !url.includes("=")) {
      return url;
    }

    // Extract from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return url;
  };

  const getEmbedUrl = (videoUrl: string): string => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) return "";

    const params = new URLSearchParams();
    if (config.autoplay) params.append("autoplay", "1");
    if (config.mute) params.append("mute", "1");
    if (config.loop) params.append("loop", "1");
    if (config.loop) params.append("playlist", videoId); // Required for loop
    if (!config.controls) params.append("controls", "0");

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  const fetchMediaFiles = async () => {
    if (!finalRestaurantId) return;

    setLoadingMedia(true);
    try {
      const url = `/api/media?restaurant_id=${finalRestaurantId}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Filter for video files only
        const videoFiles = (data.data || []).filter((media: any) => {
          const fileName = media.file?.name || "";
          const isVideo = fileName.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i);
          const isYouTube =
            media.file?.url &&
            (media.file.url.includes("youtube.com") ||
              media.file.url.includes("youtu.be"));
          return isVideo || isYouTube;
        });
        setMediaFiles(videoFiles);
      } else {
        console.error("Error fetching media files:", data.error);
        setMediaFiles([]);
      }
    } catch (error) {
      console.error("Error fetching media files:", error);
      setMediaFiles([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const openGallery = () => {
    setShowGallery(true);
    fetchMediaFiles();
  };

  const closeGallery = () => {
    setShowGallery(false);
  };

  const selectVideo = (videoUrl: string) => {
    setConfig({ ...config, videoUrl });
    closeGallery();
  };

  const handleFileUpload = async (file: File) => {
    if (!finalRestaurantId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("restaurant_id", finalRestaurantId);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.file?.url) {
        // Add the uploaded video to the config and close modal
        setConfig({ ...config, videoUrl: data.data.file.url });
        closeGallery();

        // Show success toast
        setToastMessage("Video uploaded successfully!");
        setToastType("success");
        setShowToast(true);
      } else {
        setToastMessage(
          "Failed to upload video: " + (data.error || "Unknown error"),
        );
        setToastType("error");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      setToastMessage("Error uploading video");
      setToastType("error");
      setShowToast(true);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith("video/"));
    if (videoFile) {
      handleFileUpload(videoFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      handleFileUpload(file);
    }
  };


  // Validate that restaurant ID is provided
  if (!finalRestaurantId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626" }}>
        <h2>Error</h2>
        <p>
          Restaurant ID is required. Please provide it via URL parameter or
          props.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Page Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg
              className="h-7 w-7 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              YouTube Settings
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure your YouTube video section
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
          title={showPreview ? "Hide Preview" : "Show Live Preview"}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {showPreview ? "Hide" : "Show"} Preview
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Display Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Display Settings
              </h2>
              <p className="text-sm text-gray-600">
                Control video visibility and layout
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Enable YouTube Section</span>
                <span className="text-xs font-normal text-gray-500">
                  Show YouTube video on website
                </span>
              </label>
              <select
                value={config.enabled ? "true" : "false"}
                onChange={(e) =>
                  setConfig({ ...config, enabled: e.target.value === "true" })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Layout</span>
                <span className="text-xs font-normal text-gray-500">
                  Video layout style
                </span>
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: "default",
                    name: "Default",
                    description: "Centered video",
                  },
                  {
                    value: "theater",
                    name: "Theater",
                    description: "Wide video mode",
                  },
                  {
                    value: "split-left",
                    name: "Split Left",
                    description: "Video on left",
                  },
                  {
                    value: "split-right",
                    name: "Split Right",
                    description: "Video on right",
                  },
                  {
                    value: "background",
                    name: "Background",
                    description: "Background video",
                  },
                  {
                    value: "grid",
                    name: "Grid",
                    description: "Multiple videos",
                  },
                ].map((option) => (
                  <div
                    key={option.value}
                    onClick={() =>
                      setConfig({ ...config, layout: option.value as any })
                    }
                    className={`group cursor-pointer rounded-lg border-2 p-3 transition-all ${
                      (config.layout || "default") === option.value
                        ? "border-purple-500 bg-purple-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="mb-2 overflow-hidden rounded border border-gray-200 bg-gray-50 p-2">
                      <div className="h-16 w-full">
                        {option.value === "default" && (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-10 w-12 bg-gray-400 rounded"></div>
                          </div>
                        )}
                        {option.value === "theater" && (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-8 w-full bg-gray-400 rounded"></div>
                          </div>
                        )}
                        {option.value === "split-left" && (
                          <div className="flex h-full gap-1">
                            <div className="h-full w-1/2 bg-gray-400 rounded"></div>
                            <div className="h-full w-1/2 space-y-1">
                              <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-2/3"></div>
                            </div>
                          </div>
                        )}
                        {option.value === "split-right" && (
                          <div className="flex h-full gap-1">
                            <div className="h-full w-1/2 space-y-1">
                              <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-full"></div>
                              <div className="h-1.5 bg-gray-300 rounded w-2/3"></div>
                            </div>
                            <div className="h-full w-1/2 bg-gray-400 rounded"></div>
                          </div>
                        )}
                        {option.value === "background" && (
                          <div className="relative h-full">
                            <div className="h-full w-full bg-gray-400 rounded"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white/80 rounded px-2 py-1 text-xs">
                                Content
                              </div>
                            </div>
                          </div>
                        )}
                        {option.value === "grid" && (
                          <div className="grid grid-cols-2 gap-1 h-full">
                            <div className="bg-gray-400 rounded"></div>
                            <div className="bg-gray-400 rounded"></div>
                            <div className="bg-gray-400 rounded"></div>
                            <div className="bg-gray-400 rounded"></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        (config.layout || "default") === option.value
                          ? "text-purple-700"
                          : "text-gray-900"
                      }`}
                    >
                      {option.name}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {option.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Content */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Video Content
              </h2>
              <p className="text-sm text-gray-600">
                Set video URL and content details
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>YouTube URL or Video ID</span>
                <span className="text-xs font-normal text-gray-500">
                  Enter URL manually or select from gallery
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.videoUrl || ""}
                  onChange={(e) =>
                    setConfig({ ...config, videoUrl: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="https://www.youtube.com/watch?v=... or dQw4w9WgXcQ"
                />
                <button
                  type="button"
                  onClick={openGallery}
                  className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50"
                  title="Select from gallery or upload new video"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z"
                    />
                  </svg>
                  Gallery
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Show Title & Description</span>
                <span className="text-xs font-normal text-gray-500">
                  Display text content above video
                </span>
              </label>
              <select
                value={config.showTitle !== false ? "true" : "false"}
                onChange={(e) =>
                  setConfig({ ...config, showTitle: e.target.value === "true" })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {config.showTitle !== false && (
              <>
                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Title</span>
                    <span className="text-xs font-normal text-gray-500">
                      Section heading
                    </span>
                  </label>
                  <input
                    type="text"
                    value={config.title || ""}
                    onChange={(e) =>
                      setConfig({ ...config, title: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder="Watch Our Story"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                    <span>Description</span>
                    <span className="text-xs font-normal text-gray-500">
                      Optional description below video
                    </span>
                  </label>
                  <textarea
                    value={config.description || ""}
                    onChange={(e) =>
                      setConfig({ ...config, description: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    placeholder="Discover what makes us special"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Playback Options */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Playback Options
              </h2>
              <p className="text-sm text-gray-600">
                Configure video playback behavior
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Autoplay</span>
                <span className="text-xs font-normal text-gray-500">
                  Start playing automatically
                </span>
              </label>
              <select
                value={config.autoplay ? "true" : "false"}
                onChange={(e) =>
                  setConfig({ ...config, autoplay: e.target.value === "true" })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Mute</span>
                <span className="text-xs font-normal text-gray-500">
                  Start with sound muted
                </span>
              </label>
              <select
                value={config.mute ? "true" : "false"}
                onChange={(e) =>
                  setConfig({ ...config, mute: e.target.value === "true" })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Loop</span>
                <span className="text-xs font-normal text-gray-500">
                  Repeat video continuously
                </span>
              </label>
              <select
                value={config.loop ? "true" : "false"}
                onChange={(e) =>
                  setConfig({ ...config, loop: e.target.value === "true" })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Show Controls</span>
                <span className="text-xs font-normal text-gray-500">
                  Display video player controls
                </span>
              </label>
              <select
                value={config.controls !== false ? "true" : "false"}
                onChange={(e) =>
                  setConfig({ ...config, controls: e.target.value === "true" })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Aspect Ratio</span>
                <span className="text-xs font-normal text-gray-500">
                  Video dimensions
                </span>
              </label>
              <select
                value={config.aspectRatio || "16:9"}
                onChange={(e) =>
                  setConfig({ ...config, aspectRatio: e.target.value as any })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
              >
                <option value="16:9">16:9 (Standard)</option>
                <option value="4:3">4:3 (Classic)</option>
                <option value="21:9">21:9 (Ultrawide)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Colors & Styling */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Colors & Styling
              </h2>
              <p className="text-sm text-gray-600">
                Customize colors and appearance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Background Color</span>
                <span className="text-xs font-normal text-gray-500">
                  Section background
                </span>
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.bgColor || "#000000"}
                  onChange={(e) =>
                    setConfig({ ...config, bgColor: e.target.value })
                  }
                  className="h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white"
                />
                <input
                  type="text"
                  value={config.bgColor || "#000000"}
                  onChange={(e) =>
                    setConfig({ ...config, bgColor: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                  placeholder="#000000"
                />
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, bgColor: "#000000" })}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  title="Reset to default"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-gray-700">
                <span>Max Width</span>
                <span className="text-xs font-normal text-gray-500">
                  Maximum container width
                </span>
              </label>
              <input
                type="text"
                value={config.maxWidth || "1200px"}
                onChange={(e) =>
                  setConfig({ ...config, maxWidth: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                placeholder="1200px"
              />
            </div>
          </div>
        </div>

        {/* Typography & Buttons */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Typography & Buttons
              </h2>
              <p className="text-sm text-gray-600">
                Customize text styles and button appearance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Custom Typography & Styles
                </label>
                <p className="text-xs text-gray-500">
                  Override global CSS with custom styling options
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.is_custom || false}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      is_custom: e.target.checked,
                    }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 peer-focus:ring-offset-2"></div>
              </label>
            </div>

            {!config.is_custom ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      Using Global Styles
                    </h4>
                    <p className="mt-1 text-xs text-blue-700">
                      This section is currently using the global CSS styles
                      defined in your theme settings. Enable custom typography
                      above to override these styles with section-specific
                      options.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <SectionTypographyControls
                  value={config}
                  onChange={(updates) =>
                    setConfig((prev) => ({ ...prev, ...updates }))
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {isNewSection ? "Creating..." : "Saving..."}
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                {isNewSection
                  ? "Create YouTube Section"
                  : "Save YouTube Settings"}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preview Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative z-10 w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  YouTube Live Preview
                </h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  Updates in real-time
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close preview"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div className="mx-auto max-w-[1240px]">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                  <YouTubeSection
                    key={`preview-${config.layout || 'default'}-${config.videoUrl || 'sample'}`}
                    restaurantId={finalRestaurantId}
                    configData={{
                      ...config,
                      enabled: true,
                      showTitle: true,
                      // Use sample video if no videoUrl is set, so users can preview layouts
                      videoUrl: config.videoUrl || 'dQw4w9WgXcQ',
                      title: config.title || 'Your Video Title',
                      description: config.description || 'Add a compelling description for your video to engage your audience.',
                    }}
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 p-4">
                <svg
                  className="h-5 w-5 shrink-0 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm text-purple-900">
                  Preview shows how your YouTube section will appear on the
                  website
                  {!config.videoUrl && (
                    <span className="ml-1 text-purple-600">(showing sample video)</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeGallery}
          />
          <div className="relative z-10 w-full max-w-6xl h-[80vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Select Video from Media Library
                </h2>
                <p className="mt-0.5 text-sm text-gray-600">
                  Choose a video for your YouTube section
                </p>
              </div>
              <button
                onClick={closeGallery}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close modal"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {/* Existing Videos Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Existing Videos
                </h3>
                {loadingMedia ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3.5">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                      <p className="text-sm font-medium text-gray-700">
                        Loading videos...
                      </p>
                    </div>
                  </div>
                ) : mediaFiles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                    <h4 className="mt-2 text-sm font-medium text-gray-900">
                      No videos in library
                    </h4>
                    <p className="mt-1 text-sm text-gray-500">
                      Upload your first video or add a YouTube URL below
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mediaFiles.map((media) => {
                      const isYouTube =
                        media.file?.url &&
                        (media.file.url.includes("youtube.com") ||
                          media.file.url.includes("youtu.be"));
                      const videoId = isYouTube
                        ? extractVideoId(media.file.url)
                        : null;
                      const thumbnail = videoId
                        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                        : null;

                      return (
                        <div
                          key={media.id}
                          onClick={() => selectVideo(media.file?.url || "")}
                          className="group relative cursor-pointer rounded-xl border-2 border-gray-200 transition-all duration-200 hover:border-purple-300 hover:shadow-md hover:scale-102"
                        >
                          <div className="aspect-video overflow-hidden rounded-lg">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={media.file?.name || "Video"}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                                <svg
                                  className="h-8 w-8"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                              <svg
                                className="h-6 w-6 text-purple-600 ml-0.5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>

                          {/* Video name overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-lg">
                            <p className="text-xs font-medium text-white truncate">
                              {media.file?.name || "Untitled Video"}
                            </p>
                            <p className="text-xs text-white/80">
                              {isYouTube ? "YouTube Video" : "Video File"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Upload New Video
                </h3>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    uploading
                      ? "border-purple-300 bg-purple-50"
                      : "border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => e.preventDefault()}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mb-4"></div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Uploading Video...
                      </h4>
                      <p className="text-sm text-gray-600">
                        Please wait while your video is being uploaded
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                        <svg
                          className="h-6 w-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Upload Video File
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        Drag and drop your video file here, or click to browse
                      </p>
                      <label className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-50 cursor-pointer">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                        Choose File
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleFileSelect}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        Supported formats: MP4, WebM, MOV, AVI (Max 100MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* URL Input Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Or Enter YouTube URL
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... or video ID"
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-20"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          selectVideo(input.value.trim());
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = (e.target as HTMLButtonElement)
                        .previousElementSibling as HTMLInputElement;
                      if (input.value.trim()) {
                        selectVideo(input.value.trim());
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-purple-800"
                  >
                    Add URL
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="text-sm text-gray-600">
                {mediaFiles.length} video{mediaFiles.length !== 1 ? "s" : ""}{" "}
                available
              </div>
              <button
                type="button"
                onClick={closeGallery}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
