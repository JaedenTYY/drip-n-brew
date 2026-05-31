# RELEASE NOTES - May 31, 2026

## Performance & Stability Update: "The Reliability Patch"

This release focuses on hardening the storefront ordering pipeline and resolving layout inconsistencies on mobile devices. We have introduced "Big-Tech" industry standards for state persistence and data integrity.

### 🚀 Performance Optimizations
- **Responsive Image Pipeline:** Implemented dynamic source-set selection. Storefront images now load at **200px** on mobile for instant rendering and **400px** on desktop for premium crispness.
- **Cache Isolation:** Decoupled data keys for POS and Storefront. This prevents data corruption when switching between staff and customer views.
- **Zero-Latency Reloads:** Disabled aggressive 1-hour SWR caching on the storefront to ensure product names and images are always 100% in sync with the live database.

### 🛠️ Bug Fixes & UX Improvements
- **Fractional Inventory Support:** Updated the inventory system to support decimal values (e.g., 1.5 cartons). Baristas can now record precise stock levels for partially opened items or bulk supplies.
- **Samsung Browser Stability:** Implemented `localStorage` persistence for the Cart and Checkout steps. Users will no longer lose their order progress if the browser refreshes after a payment redirect.
- **TNG Precision Fix:** Resolved the "App not found" error on Android by correcting the TNG eWallet package name to `my.com.tngdigital.ewallet`. Added a **Universal Fallback** to the intent string, ensuring that if the app is missing, the browser automatically loads the web payment gateway instead of an error page.
- **POS Layout Stabilization:** Removed unstable GPU-accelerated rotations from the Order Board. The "Diagonal Page" bug is resolved by switching to stable scale-based transforms.
- **Enhanced Analytics:** Weekly performance reports now display a full date range (e.g., "May 24 – May 30") instead of just the starting date, providing better context for business monitoring.
- **Bulletproof Filtering:** Categories are now normalized to Title Case at the source and filtered using case-insensitive logic, ensuring every drink appears in its correct section regardless of database casing.

### 🔐 Security & Integrity
- All customer sessions are now timestamped. Stale checkout sessions are automatically cleared after 30 minutes to maintain data privacy and system cleanliness.

---
*Drip-n-Brew Engineering Team*
