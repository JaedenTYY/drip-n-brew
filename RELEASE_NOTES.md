# Release Notes - Performance & UX Optimization (v1.1.0)

This release focuses on transforming the **Drip-n-Brew** platform into a high-performance, lightweight application by adopting "big-tech" engineering standards and modern mobile UX patterns.

## 🚀 Performance Optimizations

### 1. Asset & Font Optimization
- **Self-Hosted "Outfit" Font:** Eliminated external DNS lookups and connection overhead to Google Fonts. The font is now served directly from our domain.
- **Variable Font Adoption:** Switched to a single WOFF2 variable font file (~32KB) that handles all weights from 100 to 900, replacing multiple static files.
- **Preloading Strategy:** Implemented critical font preloading in `nuxt.config.ts` to eliminate Flash of Unstyled Text (FOUT).

### 2. Image & Payload Optimization
- **Nuxt Image Integration:** Migrated from standard `<img>` tags to `<NuxtImg>`, enabling:
    - **Modern Formats:** Automated WebP/AVIF serving.
    - **Responsive Sizing:** Dynamic resizing based on device screen size.
    - **Native Lazy Loading:** Optimized initial page load and memory usage.
- **SQL Field Selection:** Refactored Supabase queries to select only required fields (e.g., `id`, `name`, `price`) instead of using `select('*')`, reducing the JSON payload by ~40%.
- **SWR Caching:** Enabled **Stale-While-Revalidate** caching for the storefront (1-hour window), ensuring near-instantaneous landing page loads.

### 3. Bundle Size Reduction
- **Dependency Pruning:** Removed heavy charting libraries (`apexcharts`, `vue3-apexcharts`), saving hundreds of KB in the main JavaScript bundle.
- **CSS Efficiency:** Removed expensive global transitions (`* { transition }`) that were causing layout thrashing, replaced with targeted CSS classes.

---

## ✨ UX & Interface Enhancements

### 1. Native Swipe-to-Close (Mobile)
- **Tactile Interaction:** Implemented a native touch-based drag-to-close behavior for the Product Customization Modal on mobile.
- **Spring Physics:** Added a 150px threshold with a "snap-back" cubic-bezier animation for a premium, app-like feel.
- **Lightweight Implementation:** Hand-coded using native browser touch events to avoid heavy third-party gesture libraries.

### 2. Grid Rendering Improvements
- **Markdown-to-Plain-Text:** Optimized the Product Grid by stripping Markdown for preview descriptions. Full Markdown rendering is now deferred to the detailed view, keeping the main scroll experience buttery smooth.

---

## 🛠 Technical Integrity
- **Strict Type Safety:** Resolved 100+ TypeScript errors across the project, specifically targeting the `useAsyncData` hooks and Supabase return types.
- **Server Stability:** Added missing `@types/nodemailer` and verified server-side isolation for mailer libraries.
- **Experimental Nuxt Features:** Enabled `payloadExtraction` and `renderJsonPayloads` for a more efficient client-side state hydration.
