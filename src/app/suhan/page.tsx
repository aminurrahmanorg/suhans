"use client";

// ============================================================
//  /suhan — Admin Dashboard to manage Hero Gallery Images
//  Supports direct file upload from device + URL entry
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowLeft,
  Loader2,
  UploadCloud,
  FileImage,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface GalleryRow {
  id: number;
  src: string;
  title: string;
  caption: string;
  display_order: number;
  created_at?: string;
}

export default function SuhanDashboard() {
  const [images, setImages] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Input mode: "file" or "url"
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");

  // Form states
  const [src, setSrc] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load images from Supabase
  const loadImages = useCallback(async () => {
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase client not initialized. Check .env configuration." });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("display_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) {
        if (error.code === "42501") {
          setPermissionError(true);
        }
        setMessage({ type: "error", text: error.message });
      } else {
        setImages(data || []);
        if (data && data.length > 0) {
          const maxOrder = Math.max(...data.map((d) => d.display_order || 0));
          setDisplayOrder(maxOrder + 1);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load images";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadImages();
    }, 0);

    if (!supabase) return () => clearTimeout(timer);

    const channel = supabase
      .channel("suhan_dashboard_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gallery_images" },
        () => {
          void loadImages();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [loadImages]);

  // Handle direct file upload from device
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    setSelectedFileName(file.name);

    // Auto-fill title if empty
    if (!title.trim()) {
      const suggestedTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(suggestedTitle);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload via Next.js API route directly to public/images/
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "File upload failed");
      }

      setSrc(json.url);
      setMessage({
        type: "success",
        text: `File "${file.name}" uploaded successfully! Now click "Add to Hero Gallery" below.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload error";
      setMessage({ type: "error", text: msg });
    } finally {
      setUploading(false);
    }
  }

  // Add new image to Supabase
  async function handleAddImage(e: React.FormEvent) {
    e.preventDefault();
    if (!src.trim()) {
      setMessage({ type: "error", text: "Please select an image file or provide an image URL." });
      return;
    }

    if (!supabase) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .insert([
          {
            src: src.trim(),
            title: title.trim() || "Untitled",
            caption: caption.trim() || "",
            display_order: Number(displayOrder) || 1,
          },
        ])
        .select();

      if (error) {
        if (error.code === "42501") {
          setPermissionError(true);
        }
        setMessage({ type: "error", text: `Failed to add: ${error.message}` });
      } else {
        setMessage({ type: "success", text: "Image added to hero gallery successfully!" });
        setSrc("");
        setTitle("");
        setCaption("");
        setSelectedFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (data && data[0]) {
          setDisplayOrder((prev) => prev + 1);
        }
        void loadImages();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error adding image";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setSubmitting(false);
    }
  }

  // Delete image
  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this image?")) return;
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from("gallery_images")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.code === "42501") {
          setPermissionError(true);
        }
        setMessage({ type: "error", text: `Delete failed: ${error.message}` });
      } else {
        setMessage({ type: "success", text: "Image deleted successfully." });
        void loadImages();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Delete error";
      setMessage({ type: "error", text: errorMessage });
    }
  }

  const fixPermissionsSql = `-- Run this in Supabase SQL Editor if you get a write permission error:
GRANT ALL ON public.gallery_images TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all access" ON public.gallery_images;

CREATE POLICY "Allow public all access"
  ON public.gallery_images
  FOR ALL
  USING (true)
  WITH CHECK (true);`;

  function copySql() {
    navigator.clipboard.writeText(fixPermissionsSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-8 selection:bg-[var(--accent)] selection:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest font-semibold px-2 py-0.5 rounded bg-[var(--accent)] text-black">
                Admin Dashboard
              </span>
              <span className="text-neutral-500 text-xs">/suhan</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hero Gallery Manager
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Upload images directly from your device to display in the hero section.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Hero
            </Link>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-black text-sm font-semibold transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              View Live Website
            </Link>
          </div>
        </header>

        {/* Permission Notice Alert */}
        {permissionError && (
          <div className="p-5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 space-y-3">
            <div className="flex items-center gap-2.5 font-semibold text-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>Supabase Write Permission Required</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
              Your Supabase table needs write permission to add or delete rows. Run this 1-click SQL in your Supabase SQL Editor:
            </p>
            <div className="relative bg-black/60 p-3 rounded-lg border border-neutral-800 text-xs font-mono overflow-x-auto">
              <pre>{fixPermissionsSql}</pre>
              <button
                type="button"
                onClick={copySql}
                className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-sans transition-colors"
              >
                {copiedSql ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy SQL
                  </>
                )}
              </button>
            </div>
            <a
              href="https://supabase.com/dashboard/project/bxrlgmrnsqjruskerjol/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:underline"
            >
              Open Supabase SQL Editor <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Status Notification */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm border ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-600/40 text-emerald-200"
                : "bg-red-950/40 border-red-600/40 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form + Gallery list */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Add Image Form */}
          <div className="lg:col-span-5 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-6 backdrop-blur space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Plus className="w-5 h-5 text-[var(--accent)]" />
                  Add Image
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Upload directly from your PC/mobile or provide a URL.
                </p>
              </div>

              {/* Mode Toggle Tabs */}
              <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    uploadMode === "file"
                      ? "bg-[var(--accent)] text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  From File
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    uploadMode === "url"
                      ? "bg-[var(--accent)] text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  By URL
                </button>
              </div>
            </div>

            <form onSubmit={handleAddImage} className="space-y-4">
              {/* FILE UPLOAD MODE */}
              {uploadMode === "file" ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Upload Photo from Device <span className="text-red-400">*</span>
                  </label>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-neutral-800 hover:border-[var(--accent)] rounded-xl p-6 text-center cursor-pointer transition-all bg-neutral-950/60 hover:bg-neutral-950"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                      className="hidden"
                    />

                    <div className="flex flex-col items-center justify-center gap-2.5">
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-neutral-300">
                          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
                          <span className="text-xs font-medium">Uploading image...</span>
                        </div>
                      ) : src ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          <span className="text-xs font-semibold text-emerald-300">
                            {selectedFileName || "Image Uploaded!"}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            Click here to choose another file
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="p-3 rounded-full bg-neutral-900 group-hover:bg-[var(--accent)]/10 text-neutral-400 group-hover:text-[var(--accent)] transition-colors">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white group-hover:text-[var(--accent)] transition-colors">
                              Click to browse and choose image file
                            </p>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                              JPG, PNG, WebP supported (auto-saved to project)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* URL INPUT MODE */
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-300 block">
                    Image Source URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://... or /images/1.jpg"
                    value={src}
                    onChange={(e) => setSrc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-[var(--accent)] focus:outline-none text-sm font-mono placeholder:text-neutral-600"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Paste any direct image link from Unsplash, web, or local folder.
                  </p>
                </div>
              )}

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Golden Hour"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-[var(--accent)] focus:outline-none text-sm placeholder:text-neutral-600"
                />
              </div>

              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Caption / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Catching the last light of the day"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-[var(--accent)] focus:outline-none text-sm placeholder:text-neutral-600"
                />
              </div>

              {/* Display Order */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 block">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-[var(--accent)] focus:outline-none text-sm"
                />
              </div>

              {/* Live Preview */}
              {src.trim() && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-medium flex items-center gap-1.5">
                      <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                      Image Preview:
                    </span>
                    <span className="font-mono text-neutral-500 truncate max-w-[200px]">{src}</span>
                  </div>
                  <div className="relative w-full h-44 rounded-xl overflow-hidden border border-neutral-800 bg-black">
                    <Image
                      src={src.trim()}
                      alt="Preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || uploading || !src.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold bg-[var(--accent)] hover:opacity-95 text-black transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding to Hero...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to Hero Gallery
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Current Images in Hero Gallery */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[var(--accent)]" />
                  Active Gallery Images ({images.length})
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  These photos appear in the hero section and queue cards.
                </p>
              </div>

              <button
                type="button"
                onClick={loadImages}
                className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-12 rounded-2xl border border-neutral-800 bg-neutral-900/30 flex items-center justify-center gap-3 text-neutral-400 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                Loading gallery images...
              </div>
            ) : images.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-neutral-800 text-center space-y-3">
                <ImageIcon className="w-10 h-10 text-neutral-600 mx-auto" />
                <p className="text-neutral-400 text-sm font-medium">No images in Supabase yet.</p>
                <p className="text-xs text-neutral-500">
                  Select a file from your device on the left to add your first photo!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {images.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between gap-4 hover:border-neutral-700 transition-colors"
                  >
                    {/* Thumbnail & Info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-neutral-950 border border-neutral-800">
                        <Image
                          src={item.src}
                          alt={item.title || "Gallery thumbnail"}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-semibold">
                            #{item.display_order ?? idx + 1}
                          </span>
                          <h3 className="text-sm font-bold text-white truncate">
                            {item.title || "Untitled"}
                          </h3>
                        </div>

                        {item.caption && (
                          <p className="text-xs text-neutral-400 truncate">
                            {item.caption}
                          </p>
                        )}

                        <p className="text-[11px] font-mono text-neutral-500 truncate max-w-xs sm:max-w-md">
                          {item.src}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg bg-neutral-950 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-800/50 transition-colors"
                        title="Delete image"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
