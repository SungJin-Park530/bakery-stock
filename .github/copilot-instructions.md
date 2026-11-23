# Project Instructions: Bakery Stock Web App

## 1. Tech Stack & Architecture
- **Framework:** React + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss";`)
- **Routing:** `react-router-dom` using `HashRouter` (`#/` for customers, `#/admin` for store owner) to support GitHub Pages static hosting without 404 errors.
- **Database & Auth:** Firebase v10+ Modular SDK (Firestore & Authentication).
- **Image Hosting:** Client-side HTML5 Canvas resizing (max width 400px, WebP format, quality 0.75) uploaded directly to Cloudinary via Unsigned Upload Preset.

## 2. Database Schema Rule (CRITICAL)
- To minimize Firestore read costs, DO NOT create a collection of individual bread documents.
- ALL bread items MUST be stored inside a SINGLE Firestore document: collection `store`, document `menu_data` (`store/menu_data`).
- Use `onSnapshot` for real-time updates, and pause the listener when `document.hidden` is true (`visibilitychange` event).

## 3. UI / UX Guidelines
- **Mobile-First Design:** Prioritize smartphone screens (max-w-md centered container on desktop).
- **No Unnecessary Animations:** Keep transitions minimal and functional.
- **Admin UX:** Large touch targets (`min-h-12`) for quick stock adjustments (`-1`, `+1`, `+5`, `품절`) during busy store hours.

## 4. Testing & Production Data Safety (CRITICAL)
- **Live Production Environment:** Local environment variables (`.env.local`) point directly to the live production Firebase Firestore (`store/menu_data`) and Cloudinary storage used by actual customers.
- **Read-Only Verification Only:** When verifying changes via dev server or browser tools, ONLY perform read-only visual inspection (rendering, layout, client-side UI state transitions before saving).
- **Strict Prohibition on Write Operations:** NEVER trigger actions that execute Firestore write/update/delete operations or Cloudinary image uploads during automated or agent-driven testing (e.g., DO NOT click "저장", "등록", "삭제", toggle store open/close status, or submit forms).
- **Preferred Verification Method:** Rely primarily on static verification (`npm run build`, `npm run lint`, TypeScript type checks) and leave live data mutation tests to the user.