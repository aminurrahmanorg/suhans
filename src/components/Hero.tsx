"use client";

// ============================================================
//  Hero.tsx — Image-driven gallery hero section
//  Loads images from Supabase (gallery_images table) with fallback
//  to src/data/site.ts if Supabase is offline or empty.
// ============================================================

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  Camera,
  Briefcase,
  Mail,
  AtSign,
  Code2,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  heroImages,
  links,
  siteConfig,
  animationSpeed,
} from "@/data/site";
import { supabase } from "@/lib/supabase";

export interface GalleryItem {
  src: string;
  title: string;
  caption: string;
}

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

function SocialIcon({ platform }: { platform: string }) {
  const cls = "w-5 h-5";
  switch (platform.toLowerCase()) {
    case "instagram":
      return <Camera className={cls} />;
    case "linkedin":
      return <Briefcase className={cls} />;
    case "email":
      return <Mail className={cls} />;
    case "twitter":
    case "x":
      return <AtSign className={cls} />;
    case "github":
      return <Code2 className={cls} />;
    default:
      return <ExternalLink className={cls} />;
  }
}

function wrap(index: number, len: number): number {
  if (len <= 0) return 0;
  return ((index % len) + len) % len;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dur(base: number): number {
  return base * (animationSpeed ?? 1);
}

export default function Hero() {
  const prefersReduced = useReducedMotion();
  const [items, setItems] = useState<GalleryItem[]>(heroImages);

  // Fetch images from Supabase table: gallery_images
  useEffect(() => {
    if (!supabase) return;

    async function loadSupabaseImages() {
      try {
        const { data, error } = await supabase!
          .from("gallery_images")
          .select("src, title, caption, display_order")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) {
          console.warn("[Supabase] Notice:", error.message);
          return;
        }

        if (data && data.length >= 2) {
          setItems(
            data.map((row) => ({
              src: row.src,
              title: row.title || "",
              caption: row.caption || "",
            }))
          );
        }
      } catch (err) {
        console.warn("[Supabase] Connection error:", err);
      }
    }

    loadSupabaseImages();

    // Listen to realtime changes in Supabase dashboard
    const channel = supabase
      .channel("gallery_images_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gallery_images" },
        () => {
          loadSupabaseImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!items || items.length < 2) {
    return (
      <section className="relative w-full h-screen flex items-center justify-center bg-black text-white p-6 text-center">
        <p className="text-xl font-medium tracking-wide text-neutral-300">
          Add at least 2 images in Supabase (<code className="text-amber-400 bg-neutral-900 px-2 py-1 rounded">gallery_images</code>) or in <code className="text-amber-400 bg-neutral-900 px-2 py-1 rounded">src/data/site.ts</code>
        </p>
      </section>
    );
  }

  return <HeroGallery items={items} prefersReduced={Boolean(prefersReduced)} />;
}

function HeroGallery({
  items,
  prefersReduced,
}: {
  items: GalleryItem[];
  prefersReduced: boolean;
}) {
  const total = items.length;
  const [rawCurrent, setRawCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Ensure current is always within bounds if items change dynamically
  const current = rawCurrent >= total ? 0 : rawCurrent;

  // Number of cards: min(2, total - 1)
  const numCards = Math.min(2, total - 1);

  // Array of preview card image indices
  const cardIndices = useMemo(() => {
    const list: number[] = [];
    for (let slot = 0; slot < numCards; slot++) {
      list.push(wrap(current + 1 + slot, total));
    }
    return list;
  }, [current, total, numCards]);

  // Hidden images count
  const hiddenCount = Math.max(0, total - 1 - numCards);

  // Preload URLs
  const preloadUrls = useMemo(() => {
    const urls = new Set<string>();
    for (let offset = 1; offset <= Math.min(3, total - 1); offset++) {
      const idx = wrap(current + offset, total);
      if (items[idx]?.src) {
        urls.add(items[idx].src);
      }
    }
    return Array.from(urls);
  }, [current, total, items]);

  const goTo = useCallback(
    (newIndex: number) => {
      if (animating || newIndex === current) return;
      setAnimating(true);
      setRawCurrent(newIndex);
      setTimeout(() => {
        setAnimating(false);
      }, dur(prefersReduced ? 50 : 600));
    },
    [animating, current, prefersReduced]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        goTo(wrap(current + 1, total));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current, total, goTo]);

  // Mobile swipe support
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 50) {
      goTo(wrap(current + 1, total));
    }
    touchStartX.current = null;
  }

  const easeInOut = "easeInOut" as const;
  const easeOut = "easeOut" as const;

  const textVariants: Variants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: dur(prefersReduced ? 0 : 0.45),
        ease: easeOut,
        delay: dur(0.15),
      },
    },
    exit: {
      opacity: 0,
      y: prefersReduced ? 0 : -8,
      transition: { duration: dur(prefersReduced ? 0 : 0.2) },
    },
  };

  const cardVariants = (slot: number): Variants => ({
    hidden: {
      opacity: 0,
      x: prefersReduced ? 0 : 50,
      transition: { duration: dur(prefersReduced ? 0 : 0.3) },
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: dur(prefersReduced ? 0 : 0.5),
        ease: easeOut,
        delay: dur(slot * 0.08),
      },
    },
    exit: {
      opacity: 0,
      x: prefersReduced ? 0 : -30,
      transition: { duration: dur(prefersReduced ? 0 : 0.25) },
    },
  });

  const activeImage = items[current] || items[0];

  return (
    <section
      className="relative w-full h-screen overflow-hidden select-none bg-black text-white"
      aria-label="Image gallery hero"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* =====================================================
          1. HERO BACKGROUND IMAGE (Full-Screen HD)
         ===================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <motion.div
          key={`hero-bg-${activeImage.src}`}
          layoutId={`image-container-${activeImage.src}`}
          transition={{
            duration: dur(prefersReduced ? 0 : 0.6),
            ease: easeInOut,
          }}
          className="absolute inset-0 w-full h-full"
        >
          {failedImages[activeImage.src] ? (
            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
              <span className="text-white/40 text-sm">Image not available</span>
            </div>
          ) : (
            <Image
              src={activeImage.src}
              alt={activeImage.title}
              fill
              priority={current === 0}
              quality={100}
              sizes="100vw"
              className="object-cover object-center pointer-events-none select-none"
              onError={() => {
                console.warn(`[Hero] Failed to load image: ${activeImage.src}`);
                setFailedImages((prev) => ({ ...prev, [activeImage.src]: true }));
              }}
            />
          )}

          {/* Smooth subtle vignette overlay so titles and navigation remain crisp and readable */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.65) 100%)",
            }}
          />
        </motion.div>
      </div>

      {/* =====================================================
          2. TOP BAR: LOGO (left) + SOCIAL LINKS (right)
         ===================================================== */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-6 sm:px-12 sm:py-8">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
          {siteConfig.logoText}
        </span>

        {links && links.length > 0 && (
          <nav aria-label="Social links" className="flex items-center gap-4">
            {links.map(({ platform, href }) => (
              <a
                key={platform}
                href={href}
                target={platform.toLowerCase() === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={`${platform} link`}
                className="text-white/75 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md p-1"
              >
                <SocialIcon platform={platform} />
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* =====================================================
          3. BOTTOM BAR: COUNTER + TITLE + CARDS
         ===================================================== */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex flex-row items-end justify-between gap-4 px-6 pb-8 sm:px-12 sm:pb-12">
        {/* Bottom Left: Counter, Title & Caption */}
        <div className="flex flex-col gap-3 max-w-[60%] sm:max-w-[50%]">
          {/* Counter pill */}
          <div
            className="inline-flex items-center self-start px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider text-white border backdrop-blur-sm"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "rgba(0, 0, 0, 0.4)",
            }}
          >
            {pad(current + 1)} / {pad(total)}
          </div>

          {/* Fade transition for title & caption */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`text-${current}`}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col gap-1.5"
            >
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
                {activeImage.title}
              </h1>
              <p className="text-sm sm:text-base text-white/80 font-normal drop-shadow">
                {activeImage.caption}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Right: Preview Cards (No Hover effect) */}
        <div className="flex flex-col items-end gap-2">
          {hiddenCount > 0 && (
            <span className="text-white/60 text-xs font-medium tracking-wide select-none">
              +{hiddenCount} more
            </span>
          )}

          <div className="flex items-center gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {cardIndices.map((imgIndex, slot) => {
                const preview = items[imgIndex];
                if (!preview) return null;

                return (
                  <motion.div
                    key={`card-slot-${slot}-${preview.src}`}
                    variants={cardVariants(slot)}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => !animating && goTo(imgIndex)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !animating) {
                          goTo(imgIndex);
                        }
                      }}
                      disabled={animating}
                      aria-label={`Show image ${imgIndex + 1}: ${preview.title}`}
                      className={cn(
                        "relative overflow-hidden rounded-xl cursor-pointer block",
                        "w-[130px] h-[88px] sm:w-[185px] sm:h-[120px]",
                        "border border-white/60 focus-visible:border-[var(--accent)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                        "shadow-2xl bg-neutral-900",
                        animating ? "cursor-wait opacity-80" : ""
                      )}
                    >
                      <motion.div
                        layoutId={`image-container-${preview.src}`}
                        transition={{
                          duration: dur(prefersReduced ? 0 : 0.6),
                          ease: easeInOut,
                        }}
                        className="relative w-full h-full"
                      >
                        {failedImages[preview.src] ? (
                          <div className="w-full h-full bg-neutral-900 flex items-center justify-center p-2 text-center">
                            <span className="text-white/40 text-xs">Missing</span>
                          </div>
                        ) : (
                          <Image
                            src={preview.src}
                            alt={preview.title}
                            fill
                            quality={90}
                            sizes="(max-width: 640px) 130px, 185px"
                            className="object-cover object-center select-none"
                            onError={() => {
                              console.warn(`[Hero] Failed to load image: ${preview.src}`);
                              setFailedImages((prev) => ({ ...prev, [preview.src]: true }));
                            }}
                          />
                        )}

                        {/* Light bottom gradient for legibility */}
                        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                      </motion.div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </footer>

      {/* Hidden preloader links for fast image transitions */}
      {preloadUrls.map((url) => (
        <link key={url} rel="preload" as="image" href={url} />
      ))}
    </section>
  );
}
