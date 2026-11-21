// ============================================================
//  site.ts — THE SINGLE FILE YOU EDIT TO CUSTOMISE YOUR SITE
//  ============================================================
//  Hero component reads ONLY from here.
//  After saving, the dev server hot-reloads automatically.
// ============================================================

// ------------------------------------------------------------------
// SITE CONFIG  — logo, page title, SEO description
// ------------------------------------------------------------------
export const siteConfig = {
  /** Text shown in the top-left corner as your logo / brand name. */
  logoText: "[AR.]",

  /** Browser-tab title and Open Graph title. */
  title: "Your Name — Portfolio",

  /** Meta description shown in search engine results. */
  description:
    "A curated collection of photographs and creative work by Your Name.",
};

// ------------------------------------------------------------------
// THEME  — colors, overlay, font
// ------------------------------------------------------------------
export const theme = {
  /**
   * Accent colour used for the counter pill border, card hover ring,
   * and focus outlines.  Any valid CSS colour string works.
   * This value is injected as the CSS variable --accent in globals.css.
   */
  accentColor: "#FF8A4C",

  /**
   * Darkness of the black overlay placed on top of the full-screen image.
   * Range: 0 (fully transparent) → 1 (fully black).
   * 0.35 = subtle — image is clearly visible, text stays readable.
   */
  overlayDarkness: 0.35,

  /**
   * Font family injected into the page.
   * "Inter" (default) | "Poppins" | any Google Font loaded in layout.tsx.
   */
  fontFamily: "Inter",
};

// ------------------------------------------------------------------
// HERO IMAGES  — the gallery
// ------------------------------------------------------------------
// HOW TO ADD OR REMOVE AN IMAGE:
//   1. Copy your photo to public/images/ (e.g. 3.jpg, 4.jpg …)
//   2. Add a new object to this array: { src, title, caption }
//   3. The counter, preview cards and "+N more" text update automatically.
//
// HOW TO REMOVE AN IMAGE:
//   1. Delete the object from this array.
//   2. Optionally delete the file from public/images/.
//
// RULES:
//   • src must start with "/images/" (never include the word "public").
//   • Match the filename and extension EXACTLY (case-sensitive on Linux/Vercel).
//   • Recommended image size: 1920 × 1080 px, JPG or WebP, under 400 KB.
//   • Minimum 2 images required. 6+ images gives the best visual effect.
// ------------------------------------------------------------------
export const heroImages: { src: string; title: string; caption: string }[] = [
  {
    src: "/images/1.jpg",
    title: "Golden Hour",
    caption: "Catching the last light of the day",
  },
  {
    src: "/images/2.jpg",
    title: "City Pulse",
    caption: "Urban rhythms after midnight",
  },
  // ↓ Add more images here — copy the block above and change the values
  // {
  //   src: "/images/3.jpg",
  //   title: "Your Title",
  //   caption: "Your caption text here",
  // },
];

// ------------------------------------------------------------------
// SOCIAL LINKS  — shown as icons in the top-right corner
// ------------------------------------------------------------------
// Supported platforms: "instagram" | "linkedin" | "email" | "twitter" | "github"
// Set the array to [] to hide the icons entirely.
// ------------------------------------------------------------------
export const links: { platform: string; href: string }[] = [
  { platform: "instagram", href: "https://instagram.com/yourhandle" },
  { platform: "linkedin", href: "https://linkedin.com/in/yourhandle" },
  { platform: "email", href: "mailto:arsuhan677@gmail.com" },
];

// ------------------------------------------------------------------
// ANIMATION SPEED  — one multiplier that scales ALL durations
// ------------------------------------------------------------------
// 1 = default.  0.5 = twice as fast.  2 = twice as slow.
// Set to 0.001 to effectively disable animations (respects
// prefers-reduced-motion automatically in the component).
// ------------------------------------------------------------------
export const animationSpeed = 1;
