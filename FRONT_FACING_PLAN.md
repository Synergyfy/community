# Community — Front-Facing Remaining Phases

Status board for the **public / front-facing** side only. Reconciled with the recent
refactor (simplified feed) and the polish pass, so nothing removed gets re-added and
nothing done gets repeated.

> Last reviewed: after feed simplification + polish pass.

---

## 1. Locked-in decisions (do NOT undo)

- **Feed has no Stories strip and no Reels.** The Story/Reel components and services
  remain in the repo **intentionally** (do not delete), but must not be re-surfaced in
  the home feed or given tabs.
- **Community is auto-assigned by location.** The home feed is scoped to the user's
  community (`community_location` in `localStorage`; event `community-location-changed`).
- **Switching communities** happens by search in Discover / Search (not a feed tab).
- **Feed tabs:** `All · Businesses · Consumers · Groups` only.
- **Group join = request → pending approval.** Persisted in `localStorage`
  (`community_group_requests`; event `community-group-requests-changed`). Not an instant join.
- **Composer post types:** `General · Offer · Campaign · Group`.
- **Post composer is inline on Home** and also opened by the mobile `+ Create` nav item
  via `OPEN_COMPOSER_EVENT` (do not reintroduce a `/community/create` page/route).

## 2. Done (for context — do not rebuild)

- Shell, routing (`src/App.tsx`, `src/pages/lazyRoutes.tsx`), UI kit (`src/components/ui/*`).
- Feed, PostCard/actions/meta/media, comments (detail page), report, share modal,
  auth-gate hook, location hook + selector.
- Discover (search, categories, hashtags, businesses, campaigns), Search results with a
  **Communities** tab, entity detail pages (business, campaign, offer, reward, group,
  hashtag, category).
- Community service (`getFeed`, `createPost`, `getPost`, `getCommunities`, comments),
  entities service, discover service (incl. `getExchanges`), demo fixtures.
- Refactor: simplified Home, community switch/search, group request-pending,
  `#Exchange` list is a **read-only** list ("posting coming soon").
- Polish: fixed dead `+ Create` nav, guarded null-ID CTAs, removed dead
  `/community/exchange/:id` links, working Hide/Report on Home.

---

## 3. Known gaps / bugs found during review

1. **Auth never bootstraps (highest priority).** `authStatus` starts at `'initializing'`
   and nothing ever calls `setAuthStatus`. Result: `/auth/login` and `/auth/register`
   render `LoadingScreen` forever, and every gated action (like/save/comment/share/
   report/compose/follow) redirects to a page that never loads.
2. **No exchange detail route.** `sharing.service` still emits `/community/exchange/:id`,
   which has no route (falls through the `*` redirect).
3. **Auth pages are stubs.** `LoginPage`/`RegisterPage` render placeholder buttons only.
4. **No persistence for engagement state.** Likes/saves/hidden/group-requests live in
   memory or `localStorage` only.
5. **Duplicate constant.** `SESSION_EXPIRED_EVENT` is defined in both `src/lib/config.ts`
   and `src/lib/constants.ts`.

---

## 4. Remaining phases

Phases use letters to avoid clashing with the historical numbered phases (0–9).

### Phase A — Auth bootstrap & auth pages  *(foundation — do first)*

- Bootstrap `authStatus` on app load from persisted token/user (nothing sets it today).
- Build real **Login** and **Register** pages: forms, validation, consumer/business choice,
  demo-login fallback.
- `useAuthGate.requireAuth` must round-trip: send to login, then run the pending action.
- Ensure `GuestRoute`/`ProtectedRoute` resolve correctly once status is bootstrapped.
- Fix duplicate `SESSION_EXPIRED_EVENT`; wire session-expiry to logout.

**Files:** `src/pages/auth/*`, `src/components/auth/ProtectedRoute.tsx`,
`src/hooks/useAuthGate.ts`, `src/stores/auth.store.ts`, `src/lib/api.ts`, `src/App.tsx`.

### Phase B — `#Exchange` feature

- Fill out `ExchangeListPage` (filters: type/category; status; sort).
- Add `ExchangeDetailPage` + route `/community/exchange/:id`.
- Add create/request flows (offer/request, swap, trade, service).
- Add `getExchange`/`createExchange`/`requestExchange` to a service.
- Point `PostCard` exchange CTA + `sharing.service` demo path at the real detail route.

**Files:** `src/pages/public/ExchangeListPage.tsx` (new `ExchangeDetailPage.tsx`),
`src/services/*`, `src/pages/lazyRoutes.tsx`, `src/App.tsx`.

### Phase C — Engagement features

- In-app notifications (comments, group-request approvals, follows) + header bell.
- Saved/Bookmarks page (currently `savedIds` only).
- Comment replies/threads (`parentId` exists; UI is flat today).
- My posts / activity page.
- Persist Hide/Report state across sessions.

**Files:** new `src/pages/public/*` (Saved, Activity, Notifications),
`src/components/community/CommentList.tsx`, `src/components/layout/PublicLayout.tsx`.

### Phase D — Sharing & auth handoff

- Public→app deep-link handoff (preserve `from`, redirect back after login).
- Share polish: native share, copy-link toast, QR download; track `ref`.
- Wire `ShareModal` into all shareable entities consistently.

**Files:** `src/components/sharing/ShareModal.tsx`, `src/services/sharing.service.ts`,
`src/hooks/useAuthGate.ts`.

### Phase E — Responsive / a11y / performance polish

- Fix `Avatar` `rounded-*` override issue (currently `rounded-full` always wins over
  `className` overrides).
- Audit per-page empty/loading/error states; add a shared `PageHeader`.
- Accessibility sweep (labels, focus, keyboard, contrast).
- Performance: memoize list items, image lazy-load attributes, avoid redundant refetches.

### Phase F — Backend integration & QA

- Swap demo `catch` fallbacks for real endpoints behind a clear boundary (keep demo path
  for offline/dev).
- Error boundary / toast strategy for failed mutations.
- End-to-end pass across all routes; verify no dead links or missing routes.

---

## 5. Explicitly REMOVED / deferred (do not repeat)

- Stories strip rendering in `CommunityHomePage` (code kept, UI removed).
- Reels section/carousel in the home feed (code kept, UI removed).
- `#Exchange` inline feed cards linking to a non-existent detail page (now list-only).
- The old `/community/create` nav target (now opens the inline composer).

## 6. Verification commands

```
npx tsc --noEmit
npx vite build
# dev smoke: /community, /community/discover, /community/discover/exchanges,
# /community/discover/search?q=coffee, /community/post/p1, /community/campaign/c1
```
