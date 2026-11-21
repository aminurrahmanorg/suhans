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
      supabase?.removeChannel(channel);
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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport to tune animation speed
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mobile speed multiplier: 40% faster on mobile for snappy responsiveness
  const speedMultiplier = isMobile ? 0.6 : 1;
  const dur = useCallback(
    (base: number) => base * (animationSpeed ?? 1) * speedMultiplier,
    [speedMultiplier]
  );

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
    [animating, current, prefersReduced, dur]
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

  // Mobile swipe support (swipe left -> next, swipe right -> previous)
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    // Only trigger if horizontal swipe is dominant and > 40px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        // Swipe left -> Next
        goTo(wrap(current + 1, total));
      } else {
        // Swipe right -> Previous
        goTo(wrap(current - 1, total));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
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
      className="relative w-full h-[100dvh] overflow-hidden select-none bg-black text-white"
      aria-label="Image gallery hero"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* =====================================================
          1. HERO BACKGROUND IMAGE (Responsive Full-View Display)
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
            <>
              {/* Ambient colorful backdrop on mobile so landscape photos feel immersive */}
              <Image
                src={activeImage.src}
                alt=""
                fill
                priority={current === 0}
                quality={40}
                className="object-cover object-center blur-3xl opacity-40 scale-110 pointer-events-none select-none sm:hidden"
              />

              {/* Main HD Image:
                  - Mobile: object-contain displays the full photo without cutting people off
                  - Desktop: sm:object-cover fills the widescreen monitor edge-to-edge
              */}
              <Image
                src={activeImage.src}
                alt={activeImage.title}
                fill
                priority={current === 0}
                quality={100}
                sizes="100vw"
                className="object-contain sm:object-cover object-center pointer-events-none select-none drop-shadow-2xl transition-all duration-300"
                onError={() => {
                  console.warn(`[Hero] Failed to load image: ${activeImage.src}`);
                  setFailedImages((prev) => ({ ...prev, [activeImage.src]: true }));
                }}
              />
            </>
          )}

          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.7) 100%)",
            }}
          />
        </motion.div>
      </div>

      {/* =====================================================
          2. TOP BAR: LOGO (left) + SOCIAL LINKS (right)
         ===================================================== */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-5 sm:px-12 sm:py-8 bg-gradient-to-b from-black/75 via-black/30 to-transparent">
        <span className="text-lg sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
          {siteConfig.logoText}
        </span>

        {links && links.length > 0 && (
          <nav aria-label="Social links" className="flex items-center gap-3 sm:gap-4">
            {links.map(({ platform, href }) => (
              <a
                key={platform}
                href={href}
                target={platform.toLowerCase() === "email" ? undefined : "_blank"}
                rel="noopener noreferrer"
                aria-label={`${platform} link`}
                className="text-white/80 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md p-1"
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
      <footer className="absolute bottom-0 left-0 right-0 z-20 flex flex-row items-end justify-between gap-3 sm:gap-6 px-4 pb-6 pt-16 sm:px-12 sm:pb-12 bg-gradient-to-t from-black/90 via-black/45 to-transparent">
        {/* Bottom Left: Counter, Title & Caption */}
        <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0 pr-1 sm:pr-3">
          {/* Counter pill */}
          <div
            className="inline-flex items-center self-start px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-wider text-white border backdrop-blur-sm shadow-sm"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "rgba(0, 0, 0, 0.45)",
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
              className="flex flex-col gap-1 sm:gap-1.5"
            >
              <h1 className="text-2xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg break-words line-clamp-2 sm:line-clamp-none">
                {activeImage.title}
              </h1>
              {activeImage.caption && (
                <p className="text-xs sm:text-base text-white/80 font-normal drop-shadow line-clamp-2 sm:line-clamp-none">
                  {activeImage.caption}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Right: Preview Cards */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
          {hiddenCount > 0 && (
            <span className="text-white/60 text-[10px] sm:text-xs font-medium tracking-wide select-none">
              +{hiddenCount} more
            </span>
          )}

          <div className="flex items-center gap-2 sm:gap-4">
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
                    // On extra-small screens, show 1 preview card so it never squishes the title. On sm+ show both!
                    className={cn(
                      "relative",
                      slot > 0 ? "hidden sm:block" : "block"
                    )}
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
                        "relative overflow-hidden rounded-lg sm:rounded-xl cursor-pointer block active:scale-95",
                        "w-[105px] h-[72px] sm:w-[185px] sm:h-[120px]",
                        "border border-white/60 focus-visible:border-[var(--accent)]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                        "shadow-2xl bg-neutral-900 transition-transform duration-150",
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
                            sizes="(max-width: 640px) 105px, 185px"
                            className="object-cover object-center select-none"
                            onError={() => {
                              console.warn(`[Hero] Failed to load image: ${preview.src}`);
                              setFailedImages((prev) => ({ ...prev, [preview.src]: true }));
                            }}
                          />
                        )}

                        {/* Light bottom gradient for legibility */}
                        <div className="absolute inset-x-0 bottom-0 h-10 sm:h-14 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
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
