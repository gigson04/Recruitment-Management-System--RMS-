# UI/UX Improvements

This version keeps the existing recruitment features and business logic while adding a shared quality layer.

## Main improvements

- Cleaner and more consistent visual design across all pages.
- Responsive sidebar with grouped navigation on desktop and mobile.
- Better mobile menu behavior with Escape-to-close and body scroll locking.
- Active navigation now uses `aria-current="page"`.
- Added a keyboard-accessible "Skip to main content" link.
- Improved focus states for keyboard users.
- Better table readability with sticky headers and safer horizontal scrolling.
- Improved form controls and touch target sizes.
- Reduced visual noise while keeping the existing page-specific layouts.
- Added reduced-motion support for accessibility.
- Added the missing `recruitment-performance.html` page mapping to the shared access-control map.
- Added one shared `css/quality.css` layer so future UI changes can be made in one place.

## Files changed

- `css/quality.css`
- `js/components.js`
- `js/auth.js`
- All HTML pages now load `css/quality.css`.

The existing Supabase/authentication and page-specific JavaScript were intentionally left mostly intact to reduce the risk of breaking working recruitment features.
