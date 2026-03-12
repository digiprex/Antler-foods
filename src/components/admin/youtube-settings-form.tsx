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

import { useState, useEffect } from "react";
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

type PreviewViewport = "desktop" | "mobile";

const youtubeLayoutOptions: Array<{
  value: NonNullable<YouTubeConfig["layout"]>;
  name: string;
  description: string;
  support: string;
}> = [
  {
    value: "default",
    name: "Default",
    description: "Centered feature video",
    support: "Clean and familiar for most pages",
  },
  {
    value: "theater",
    name: "Theater",
    description: "Wide cinematic framing",
    support: "Best for immersive storytelling",
  },
  {
    value: "split-left",
    name: "Split Left",
    description: "Video first, content second",
    support: "Strong visual-first composition",
  },
  {
    value: "split-right",
    name: "Split Right",
    description: "Content first, video second",
    support: "Good when copy needs more emphasis",
  },
  {
    value: "background",
    name: "Background",
    description: "Overlay content on motion",
    support: "Best for bold promotional moments",
  },
  {
    value: "grid",
    name: "Grid",
    description: "Video with supporting panels",
    support: "Balanced for richer content groupings",
  },
];

function renderYouTubeLayoutPreview(
  layout: NonNullable<YouTubeConfig["layout"]>,
  active: boolean,
) {
  const boardTone = active
    ? "border-purple-200 bg-gradient-to-b from-white to-purple-50/80"
    : "border-slate-200 bg-gradient-to-b from-white to-slate-50";
  const accentTone = active ? "bg-purple-500/90" : "bg-slate-500";
  const softTone = active ? "bg-purple-200/90" : "bg-slate-200";
  const paleTone = active ? "bg-purple-100/80" : "bg-slate-100";

  return (
    <div className={`overflow-hidden rounded-2xl border ${boardTone}`}>
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-3 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
        <div className={`h-2 w-20 rounded-full ${softTone}`} />
      </div>
      <div className="h-28 p-3">
        {layout === "default" ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
            <div className="w-full rounded-[18px] bg-slate-900 p-2">
              <div className="relative flex aspect-video items-center justify-center rounded-[14px] bg-slate-800">
                <div className={`h-10 w-10 rounded-full ${accentTone} flex items-center justify-center`}>
                  <div className="ml-0.5 h-0 w-0 border-y-[7px] border-y-transparent border-l-[12px] border-l-white" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {layout === "theater" ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
            <div className="rounded-[18px] bg-slate-900 p-2">
              <div className="relative aspect-[2.2/1] rounded-[14px] bg-slate-800">
                <div className={`absolute bottom-2 left-2 h-2 w-20 rounded-full ${softTone}`} />
                <div className={`absolute right-2 top-2 h-7 w-7 rounded-full ${accentTone} flex items-center justify-center`}>
                  <div className="ml-0.5 h-0 w-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white" />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {layout === "split-left" || layout === "split-right" ? (
          <div className="grid h-full grid-cols-2 gap-2">
            {layout === "split-right" ? (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
                  <div className={`mb-2 h-2.5 rounded-full ${accentTone} w-3/4`} />
                  <div className={`mb-1.5 h-2 rounded-full ${softTone} w-full`} />
                  <div className={`h-2 rounded-full ${softTone} w-4/5`} />
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
                  <div className="rounded-[18px] bg-slate-900 p-2">
                    <div className="relative aspect-video rounded-[12px] bg-slate-800" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
                  <div className="rounded-[18px] bg-slate-900 p-2">
                    <div className="relative aspect-video rounded-[12px] bg-slate-800" />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
                  <div className={`mb-2 h-2.5 rounded-full ${accentTone} w-3/4`} />
                  <div className={`mb-1.5 h-2 rounded-full ${softTone} w-full`} />
                  <div className={`h-2 rounded-full ${softTone} w-4/5`} />
                </div>
              </>
            )}
          </div>
        ) : null}

        {layout === "background" ? (
          <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-sm">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.35),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.3),transparent_45%)]" />
            <div className="absolute inset-0 opacity-35">
              <div className="h-full w-full bg-[linear-gradient(135deg,#0f172a,#1e293b)]" />
            </div>
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-white/80 p-3 backdrop-blur">
              <div className={`mb-1.5 h-2.5 rounded-full ${accentTone} w-2/3`} />
              <div className={`h-2 rounded-full ${softTone} w-full`} />
            </div>
          </div>
        ) : null}

        {layout === "grid" ? (
          <div className="grid h-full grid-cols-[1.25fr_0.75fr] gap-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
              <div className="rounded-[18px] bg-slate-900 p-2">
                <div className="relative aspect-video rounded-[12px] bg-slate-800" />
              </div>
            </div>
            <div className="grid gap-2">
              {[0, 1].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200/80 bg-white/90 p-2 shadow-sm">
                  <div className={`mb-2 h-2.5 rounded-full ${item === 0 ? accentTone : softTone} ${item === 0 ? "w-3/4" : "w-2/3"}`} />
                  <div className={`h-2 rounded-full ${softTone} w-full`} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function YouTubeSettingsForm({
  pageId,
  restaurantId,
}: YouTubeFormProps) {
  const searchParams = useSearchParams();
  const restaurantIdFromQuery = searchParams?.get("restaurant_id")?.trim() ?? "";
  const finalRestaurantId = restaurantIdFromQuery || restaurantId || "";
  const sectionStyleDefaults = useSectionStyleDefaults(finalRestaurantId);

  // Check if this is a new section being created or editing existing
  const isNewSection = searchParams?.get("new_section") === "true";
  const templateId = searchParams?.get("template_id") || null;

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
  const [previewViewport, setPreviewViewport] =
    useState<PreviewViewport>("desktop");
  const [responsiveEditorViewport, setResponsiveEditorViewport] =
    useState<PreviewViewport>("desktop");

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

  const renderResponsiveEditorTabs = (scope: string) => (
    <div className="inline-flex rounded-full bg-slate-100 p-1">
      {(["desktop", "mobile"] as PreviewViewport[]).map((viewport) => (
        <button
          key={`${scope}-${viewport}`}
          type="button"
          onClick={() => setResponsiveEditorViewport(viewport)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            responsiveEditorViewport === viewport
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {viewport === "desktop" ? "Desktop" : "Mobile"}
        </button>
      ))}
    </div>
  );

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
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        // Filter for video files only with better error handling
        const videoFiles = data.data.filter((media: any) => {
          try {
            // Handle different possible data structures
            const fileName = media.file?.name || media.name || media.filename || "";
            const fileUrl = media.file?.url || media.url || "";
            
            const isVideo = fileName.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i);
            const isYouTube = fileUrl &&
              (fileUrl.includes("youtube.com") || fileUrl.includes("youtu.be"));
            
            return isVideo || isYouTube;
          } catch (err) {
            console.warn("Error processing media item:", media, err);
            return false;
          }
        });
        
        setMediaFiles(videoFiles);
      } else {
        console.error("Error fetching media files:", data.error || "Invalid response format");
        setMediaFiles([]);
        
        // Show user-friendly error message
        setToastMessage("Unable to load media files. Please try again.");
        setToastType("error");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error fetching media files:", error);
      setMediaFiles([]);
      
      // Show user-friendly error message
      setToastMessage("Failed to connect to media library. Please check your connection and try again.");
      setToastType("error");
      setShowToast(true);
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
      <div className="mb-8 flex items-start">
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
      </div>

      <form onSubmit={handleSave} className="space-y-6 pb-40">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-500">
                Preview Experience
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                Shape the video section for desktop and mobile from one consistent workspace.
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Layout cards, responsive editing tabs, and the live preview now follow the same interaction pattern used in Hero Settings.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Editing Viewport
              </p>
              {renderResponsiveEditorTabs("youtube-preview-workspace")}
            </div>
          </div>
        </div>

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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {youtubeLayoutOptions.map((option) => {
                  const isActive = (config.layout || "default") === option.value;

                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() =>
                        setConfig({ ...config, layout: option.value as any })
                      }
                      aria-pressed={isActive}
                      className={`group w-full rounded-2xl border p-3 text-left transition-all ${
                        isActive
                          ? "border-purple-500 bg-purple-50 shadow-[0_20px_45px_rgba(124,58,237,0.12)]"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-[0_18px_35px_rgba(15,23,42,0.08)]"
                      }`}
                    >
                      <div className="mb-4">
                        {renderYouTubeLayoutPreview(option.value, isActive)}
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div
                            className={`text-sm font-semibold ${
                              isActive ? "text-purple-700" : "text-slate-900"
                            }`}
                          >
                            {option.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {option.description}
                          </div>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isActive
                              ? "bg-purple-100 text-purple-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isActive ? "Selected" : "Layout"}
                        </span>
                      </div>
                      <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2 text-xs text-slate-500">
                        {option.support}
                      </div>
                    </button>
                  );
                })}
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

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Responsive Typography Workspace
                </p>
                <p className="text-xs text-slate-500">
                  Preview desktop and mobile overrides before opening the live preview.
                </p>
              </div>
              {renderResponsiveEditorTabs("youtube-typography")}
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
                  viewport={responsiveEditorViewport}
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

      {!showPreview ? (
        <button
          type="button"
          onClick={() => {
            setPreviewViewport(responsiveEditorViewport);
            setShowPreview(true);
          }}
          className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-3 rounded-full border border-purple-200 bg-white/95 px-5 py-3 text-sm font-semibold text-purple-700 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white sm:right-6"
          aria-label="Open YouTube preview"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-sm">
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
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span>Live Preview</span>
            <span className="text-xs font-medium text-purple-500">
              {responsiveEditorViewport === "mobile"
                ? "Open mobile preview"
                : "Open desktop preview"}
            </span>
          </span>
        </button>
      ) : null}

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative z-10 flex h-[min(92vh,980px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Live Preview
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Switch between desktop and mobile to verify every video layout.
                  {!config.videoUrl ? (
                    <span className="ml-1 text-purple-600">
                      (showing sample video)
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-full bg-slate-100 p-1">
                  {(["desktop", "mobile"] as PreviewViewport[]).map(
                    (viewport) => (
                      <button
                        key={viewport}
                        type="button"
                        onClick={() => setPreviewViewport(viewport)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          previewViewport === viewport
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {viewport === "desktop" ? "Desktop" : "Mobile"}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6">
              <div
                className={`mx-auto overflow-hidden border border-white/10 bg-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.35)] ${
                  previewViewport === "mobile"
                    ? "max-w-[430px] rounded-[32px]"
                    : "max-w-[1240px] rounded-[32px]"
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>
                    {previewViewport === "mobile"
                      ? "Phone Preview"
                      : "Desktop Preview"}
                  </span>
                  <span>
                    {previewViewport === "mobile" ? "390 x 780" : "1280 x 720"}
                  </span>
                </div>
                <div className="bg-white">
                  <YouTubeSection
                    key={`preview-${previewViewport}-${config.layout || "default"}-${config.videoUrl || "sample"}`}
                    restaurantId={finalRestaurantId}
                    previewViewport={previewViewport}
                    configData={{
                      ...config,
                      enabled: true,
                      showTitle: true,
                      videoUrl: config.videoUrl || "dQw4w9WgXcQ",
                      title: config.title || "Your Video Title",
                      description:
                        config.description ||
                        "Add a compelling description for your video to engage your audience.",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-purple-500"
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
                  {!config.videoUrl
                    ? "A sample YouTube video is used so you can evaluate layout spacing and hierarchy before linking your own video."
                    : "Live preview reflects your current video content, layout, and styling changes."}
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  {previewViewport === "mobile"
                    ? "Mobile responsiveness check"
                    : "Desktop composition check"}
                </div>
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
                    {mediaFiles.map((media, index) => {
                      try {
                        // Handle different possible data structures
                        const fileUrl = media.file?.url || media.url || "";
                        const fileName = media.file?.name || media.name || media.filename || `Video ${index + 1}`;
                        const mediaId = media.id || media.file?.id || `media-${index}`;
                        
                        const isYouTube = fileUrl &&
                          (fileUrl.includes("youtube.com") || fileUrl.includes("youtu.be"));
                        const videoId = isYouTube ? extractVideoId(fileUrl) : null;
                        const thumbnail = videoId
                          ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                          : null;

                        return (
                          <div
                            key={mediaId}
                            onClick={() => selectVideo(fileUrl)}
                            className="group relative cursor-pointer rounded-xl border-2 border-gray-200 transition-all duration-200 hover:border-purple-300 hover:shadow-md hover:scale-102"
                          >
                            <div className="aspect-video overflow-hidden rounded-lg">
                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={fileName}
                                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                  onError={(e) => {
                                    // Fallback if thumbnail fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `
                                        <div class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                                          <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                          </svg>
                                        </div>
                                      `;
                                    }
                                  }}
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
                                {fileName}
                              </p>
                              <p className="text-xs text-white/80">
                                {isYouTube ? "YouTube Video" : "Video File"}
                              </p>
                            </div>
                          </div>
                        );
                      } catch (err) {
                        console.warn("Error rendering media item:", media, err);
                        return null;
                      }
                    }).filter(Boolean)}
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
