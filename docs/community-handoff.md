# Community — Engineering Handoff

> Status: **all build steps and admin phases (A–L) are implemented and verified, plus the approved
> high+medium gap-fix pass** (post actions everywhere, per-account stores, composer audience parity,
> business edit semantics, manager denial/escalation, admin visibility/reject gates, analytics drills).
> Spec of record: [`docs/community-spec.md`](./community-spec.md) — flow (§1–§2), open decisions (§3/§9, §17),
> build order (§4), admin control specification (§5, 17 sections). This document is the working handoff:
> what is new, every route, what the backend must provide, which decisions are still open, and how the
> test suite maps to the spec.

---

## 1. Scope & verification status

Community is one connected product inside CHS with three dashboards and one staff overlay:

| Surface | Who | Routes | Notes |
| --- | --- | --- | --- |
| Public / member Community | guests + signed-in members | `/community/*` | Browse without sign-in; sign-in returns to the attempted action (§2.1) |
| Business dashboard | `business` accounts | `/business/*` | Posts/offers/campaigns/sharing/settings, reuses CHS auth |
| Admin dashboard | `admin` accounts | `/admin/*` | 15 sections + 3 detail pages, side menu (desktop) / bottom nav + More sheet (mobile) |
| Community Manager dashboard | any signed-in account | `/manager/*` | Staff overlay; pages explain when no appointment is held |

Verified green at handoff: `tsc --noEmit`, `vite build`, and **14 Playwright E2E tests** (desktop + mobile
projects, see §10). Every phase was additionally browser-verified (flows, audit entries, permissions,
console clean) as recorded in the spec's phase tracker (§5).

**Frontend only.** There is no backend in this repo. Every service first attempts the real API and falls
back to demo/localStorage data (§6). All admin configuration, moderation, managers, membership and audit
records shown in demo mode are clearly local; nothing here is presented as a real outcome.

---

## 2. Existing vs new

### Existing before this project (reused unchanged or lightly extended)

- CHS auth: `auth.store`, login/register pages, session handling, tokens in localStorage.
- Business dashboard v1: posts/offers/campaigns CRUD, business profile + settings.
- Public v1: home feed, post detail, business profile, offer/campaign/reward/group detail, saved, activity.
- Shared UI kit (`Button`, `Input`, `Modal`, `Badge`, `EmptyState`, …), Tailwind design system, `api` client.
- Group & Circles (separate project): Community only **identifies** group-origin content; it never
  manages group membership, settings or approvals (§9 boundary).

### New in this project

- **Data model** (`types/community-public.ts`, `lib/constants.ts`): post `status` widened to the
  moderation lifecycle, `moderationReason/moderatedBy/moderatedAt/scheduledAt`, exchange `visibility`,
  first-class `ReportRecord`, `ShareRecord`, `AttributionEvent`, categories, announcements, manager and
  membership config types.
- **Rules** (`lib/permissions.ts`): `canViewPost`/`canViewExchange`/`canViewVisibility` audience rules;
  `canAdmin` + `ADMIN_ACTIONS` (16 actions) + persisted role-grant matrix (`community_admin_role_grants`).
- **Services** (all demo-fallback): `community`, `discover`, `entities`, `attribution`, `sharing`,
  `reports`, `announcements`, `categories`, `admin-config`, `campaign-config`, `managers`, `membership`,
  `notification-config`; plus enriched `admin`, `business`, `auth`.
- **Member surfaces**: profile screen, notifications/activity, #Exchange list/detail + composer,
  search, hashtag pages (with admin flags), category pages, campaigns list/detail, my-campaigns,
  consumer sharing, help; five-tab mobile bottom nav + guest sign-in handoffs.
- **Admin dashboard** (all 17 spec sections): overview (+ filters), content, moderation, reports,
  announcements, #Exchange, users & access (+ detail), campaigns (+ detail), **Community Managers**
  (+ detail), sharing & attribution, rewards & notifications, analytics & reporting, configuration
  (single surface, 10 sections incl. the role matrix), membership & access, audit log (+ filters).
- **Manager dashboard**: overview, content, reports, #Exchange, announcements, appointment record.
- **E2E suite** (`playwright.config.ts`, `tests/e2e/`) and this handoff.

---

## 3. Running it

```bash
npm install
npm run dev            # vite dev server
npm run build          # tsc && vite build
npx tsc --noEmit       # type-check only
npm run test:e2e       # Playwright (starts its own dev server on port 5299)
```

Demo mode: services call `api.*('/…')` (base `/api`) first; with no backend those calls fail (the E2E
suite answers them with an instant 502) and the demo/localStorage stores take over. Data seeded with
`demo seed`/`source: 'demo'` labels must never be presented as real outcomes (§16).

---

## 4. Route list (App.tsx)

**Public — `PublicLayout`** (desktop header + five-tab mobile bottom nav: Home, Discover, #Exchange,
Activity, Profile):

| Route | Page | Guard |
| --- | --- | --- |
| `/` | → `/community` | — |
| `/community` | home feed (composer, stories/reels strips) | — |
| `/community/post/:id` | post detail + comments | — |
| `/community/discover` | discover grid (categories, hashtags, businesses, campaigns) | — |
| `/community/discover/search` | search results | — |
| `/community/discover/exchanges` | #Exchange list + composer | — |
| `/community/discover/hashtag/:tag` | hashtag page (admin flags shown) | — |
| `/community/discover/category/:id` | category page | — |
| `/community/exchange/:id` | #Exchange item detail | — |
| `/community/business/:id` | business profile | — |
| `/community/campaign/:id` · `/community/offer/:id` · `/community/reward/:id` · `/community/group/:id` | connected detail pages | — |
| `/community/campaigns` · `/community/my-campaigns` · `/community/sharing` · `/community/help` | campaigns browsing / sharing / help | — |
| `/community/saved` · `/community/activity` | saved items / activity feed | — |
| `/community/profile` | profile screen (consumer) or dashboard link (business) | — |
| `/community/notifications` | notifications (guests see a sign-in prompt) | — |

**Auth** — `/auth/login`, `/auth/register` behind `GuestRoute` (signed-in users are bounced home).
Sign-in honours `location.state.from` — the attempted action (§2.1). Quick demo buttons force the role
home (`pending-navigation.ts` one-shot override).

**Business — `ProtectedRoute requiredUserTypes=['business']`**: `/business` → `dashboard`,
`posts`, `offers`, `campaigns`, `sharing`, `settings`.

**Admin — `ProtectedRoute requiredUserTypes=['admin']` + `AdminLayout`** (each section additionally
gated by its `ADMIN_ACTIONS` entry; deep links without the grant render the denied panel):

| Route | Section (action) |
| --- | --- |
| `/admin` | Overview (`view_audit`) |
| `/admin/content` | Content (`moderate_content`) |
| `/admin/moderation` | Moderation (`moderate_content`) |
| `/admin/reports` | Reports (`manage_reports`) |
| `/admin/announcements` | Announcements (`manage_announcements`) |
| `/admin/exchange` | #Exchange (`manage_exchange`) |
| `/admin/users`, `/admin/users/:id` | Users & Access (`manage_users`) |
| `/admin/campaigns`, `/admin/campaigns/:id` | Campaigns (`configure_campaigns`) |
| `/admin/managers`, `/admin/managers/:id` | Community Managers (`manage_managers`) |
| `/admin/sharing` | Sharing & Attribution (`view_attribution`) |
| `/admin/rewards` | Rewards & Notifications (`manage_rewards`) |
| `/admin/analytics` | Analytics & Reporting (`view_analytics`) |
| `/admin/config` | Configuration (`configure_platform`) |
| `/admin/membership` | Membership & Access (`configure_membership`) |
| `/admin/audit` | Audit Log (`view_audit`) |

**Manager — `ProtectedRoute` (any signed-in account; `ManagerLayout` checks the appointment record)**:
`/manager` → `content`, `reports`, `exchange`, `announcements`, `appointment`.

---

## 5. Architecture notes for the next engineer

- **Demo-fallback pattern.** `attempt(() => api.…) → catch → local store`. UI code never knows which
  path ran; replacing the fallback with real API responses is the backend-integration step.
- **One record, every surface (§15).** Admin, business and public surfaces read the *same object
  references* (see `listPosts`/`getAllBusinessPosts` comments) — moderation of a demo post is reflected
  everywhere. Demo posts/exchanges/comments are **in-memory**: config, audit, role grants, attribution
  events and sharing records persist to localStorage; post mutations reset on a hard reload. E2E
  moderation journeys therefore stay in one SPA session.
- **Permissions.** `canAdmin(user, action)` reads the persisted grant matrix; defaults are admin-only
  pending §17-6. Controls follow one of three states: **visible**, **disabled-with-reason**
  (`Requires 'X' — role grants pending §17-6`), or **denied** (nav hidden + section denied panel with an
  audited "Restore default grants" so a matrix edit cannot lock admins out).
- **Configuration is a single surface** (`/admin/config`, 10 sections) and a single source of truth:
  exchange type switches are consumed by the member composer, report reasons by the report modal,
  categories by Discover, hashtag flags by hashtag pages, the role matrix by the whole shell.
- **Open decisions are data, never logic.** Status vocabularies, referral criteria, attribution windows
  and reward qualification text are stored/displayed exactly as configured; the frontend never computes
  or invents them (§9/§17, §16).
- **Never misrepresent activity.** Shares ≠ visits ≠ registrations ≠ qualified outcomes; unique clicks
  appear only when a backend supplies them; pending attribution is never shown as confirmed.

---

## 6. API requirements the backend must provide

The front end already calls (and in demo mode falls back from) the following. Response envelope expected
by `lib/api.ts`: `{ data: … }`. All calls are listed; "(local store today)" marks structures with **no**
endpoint yet — the backend must own them before launch.

**Auth**
- `POST /auth/login`, `POST /auth/register` → `{ user, accessToken, refreshToken }`.

**Community (member-facing)**
- Reads: `GET /community/feed`, `/community/posts`, `/community/posts/:id`,
  `/community/posts/:postId/comments`, `/community/search`, `/community/hashtags/:tag/posts`,
  `/community/categories/:category/businesses`, `/community/exchanges`, `/community/exchanges/:id`,
  `/community/groups`, `/community/communities`, `/community/discover/{businesses,campaigns,hashtags}`,
  `/community/stories`, `/community/reels`.
- Actions: like/bookmark post (`POST`+`DELETE /community/posts/:id/{like,bookmark}`), comment create
  (`POST /community/posts/:postId/comments`), comment like/delete, comment report;
  `POST /community/posts`, `PATCH`/`DELETE /community/posts/:id`, `POST /community/posts/batch`;
  `POST /community/:type/:id/report`; `POST /community/exchanges`,
  `POST /community/exchanges/:id/requests`; follow/join endpoints; group join.
- Sharing & attribution (§6/§7): `POST /community/share` (create tracked share + QR record),
  `POST /community/track/visit` (dedupe per code per session; pending events only — attribution
  decisions are server-owned, §17-3).

**Business**
- `GET /business/dashboard`; posts `POST /business/posts`, `PATCH`/`DELETE /business/posts/:id`,
  `POST /business/posts/:id/{archive,restore}`; offers and campaigns CRUD
  (`POST|PATCH|DELETE /business/{offers,campaigns}(/:id)`); `PATCH /business/profile`.

**Admin**
- Lists: `GET /admin/posts`, `GET /admin/exchanges`.
- Moderation: `POST /admin/posts/:id/moderate`, `/admin/comments/:id/moderate`,
  `/admin/exchanges/:id/moderate` (actions incl. approve/reject **with mandatory reason**, §5.2);
  `POST /admin/users/:id/status`; `POST /admin/reports/resolve`.
- Announcements: `POST|PATCH|DELETE /admin/announcements(/:id)`.
- **No endpoint attempted yet (local stores — backend required):** audit log (`GET /admin/audit` +
  server-side append-only writes — the frontend list is demo-only), admin configuration
  (`community_admin_config`: exchange types, report reasons, hashtag flags), categories CRUD, campaign
  sharing/referral/leaderboard config, notification templates, Community Hub Managers (appoint/reassign/
  permissions/suspend/remove + history), membership rules, and the admin role-grant matrix (the server
  must enforce RBAC itself — the UI matrix is a shell, §17-6).

**Connected systems (ownership open, §9-11/§17-9)**: campaign contribution links, reward records
(read-only from central Rewards) and donation routing are display/links only — integrations via approved
APIs are an open decision.

---

## 7. Persistence model (localStorage)

| Key | Contents |
| --- | --- |
| `community_user`, `community_access_token`, `community_refresh_token` | session |
| `community_admin_config` | exchange type switches, report reasons, hashtag flags, post types |
| `community_admin_role_grants` | §14 action matrix (defaults admin-only, §17-6) |
| `community_audit` | audit entries (append-only in demo) |
| `community_categories`, `community_categories_seeded` | category store |
| `community_announcements` | announcements |
| `community_campaign_configs`, `campaign_configs_seeded` | per-campaign sharing/referral/leaderboard config |
| `community_managers`, `community_managers_seeded`, `community_manager_config` | manager appointments + permissions |
| `community_membership_config`, `community_membership_seeded` | membership rules |
| `community_notification_templates` | per-event message templates (stored-config only) |
| `community_shares`, `community_shares_seeded`, `community_share_events` | share ledger + attribution events |
| `community_recorded_refs`, `community_pending_ref` | visit dedupe + pending `?ref=` context |
| `community_reports`, `community_engagement`, `community_notifications` | reports, engagement, in-app notifications |
| `community_location`, `COMMUNITY_SEED` | location choice, seed marker |

Demo posts/comments/exchanges are intentionally **not** persisted (in-memory, see §5).

---

## 8. Demo accounts & fixtures

| Email | Password | Lands on |
| --- | --- | --- |
| `business@demo.com` | `demo123` | `/business/dashboard` (MCOM Coffee House, b1) |
| `admin@demo.com` | `demo123` | `/admin` (Central Hub, a1) |
| `consumer@demo.com` | `demo123` | `/community` |
| `manager@demo.com` | `demo123` | `/manager` (Maya Patel — consumer account + active appointment) |

Any valid email + 6-char password signs in via the form (demo fallback). Fixtures: posts `p1` (published)
plus draft/pending/rejected lifecycle examples for b1; exchanges `e1` public, `e2` business-only,
`e3` completed, `e4` expired; campaign `camp1`; rewards seeded read-only.

---

## 9. Open decisions register — DO NOT INVENT

**§9 (product decisions, spec §3):** 1. #Exchange exact item types + per-role actions ·
2. post types + which require approval · 3. visibility rules per content type · 4. direct messaging scope ·
5. stories/reels real formats vs feed-style · 6. campaign qualifying events/window/dedup ·
7. reward-eligible outcomes · 8. notification trigger/delivery events · 9. follow + public profile fields ·
10. admin publishing moderation bypass · 11. live connected-product integrations ·
12. dual business+consumer account switching (CHS account model).

**§17 (admin-spec gates, built-as-structure):** 1. content approval per type (schedule shell built) ·
2. exchange transitions (vocabulary + config shell built) · 3. attribution windows/dedup (display-only) ·
4. referral qualification (criteria stored as data) · 5. reward triggers (read-only oversight) ·
6. admin roles (matrix UI + persisted grants, all admin-only) · 7. privacy of user/group/message data
(permission-gated context panels) · 8. metrics/export policy (definitions + pending notice) ·
9. controls vs linked systems (links only, no local engines).

Nothing in this handoff answers any of the above; each remains an owner decision. Full tables:
spec §3 and §5 gate map.

---

## 10. Test suite (build-order step 8)

Playwright (`playwright.config.ts`): two projects — **desktop** (Desktop Chrome) and **mobile**
(Pixel 5, `*.mobile.spec.ts` only); a dev server on port 5299; `/api/**` answered with an instant 502
so demo fallbacks run fast (that blocking is the honest "no backend" environment). Run with
`npm run test:e2e` (or `npx playwright test`).

| Spec | Journey (step-8 area) |
| --- | --- |
| `public-layout.mobile` | **mobile layouts**: exactly five bottom-nav destinations; guest Activity/Profile taps → sign-in → return to notifications/profile |
| `admin-layout.mobile` | **mobile layouts**: admin bottom nav (4 primary) + More sheet with every remaining section + View Community |
| `admin-layout.desktop` | **layouts**: desktop side menu lists all 15 sections + View Community |
| `permissions` | signed-out `/admin` → sign-in; consumer `/admin` → Access Denied; business-only exchange hidden publicly, visible to businesses |
| `moderation` | **moderation + one-record rule**: admin rejects a published post (empty reason refused, §5.2) → author's Rejected tab shows the same reason → public feed hides it → audit entry with reason; one SPA session (demo posts are in-memory) |
| `failed-actions` | **failed actions**: login validation errors inline (one rule at a time); duplicate report reason refused, list unchanged |
| `attribution` | **attribution**: `?ref=` link visit is recorded and the "Clicks (total)" metric increments on `/admin/sharing` (totals only — unique is backend-supplied) |
| `auth-handoff.desktop` | **CHS auth return-to-action**: Activity prompt sign-in returns to notifications; header Sign in returns to the attempted page |

Helpers (`tests/e2e/helpers.ts`): `demoSignIn`, `formSignIn`, `logOut`, and the API-blocking fixture.

---

## 11. Known limitations (by design, pending decisions/backend)

- No backend: every write is local; audit/role-grant/config stores are demo shells over the required
  endpoints (§6).
- Demo post/comment/exchange mutations are in-memory and reset on hard reload; config, audit, grants,
  attribution events and shares persist. Engagement (likes/saves/hides/reports/joined campaigns) and
  notifications are **per-account** (`ownerId` + archive map in `StoreOwnerSync`) — records swap on
  sign-in/out and are never wiped; the TanStack Query cache is also reset on owner change so one
  account's cached feed never leaks to another (or to a guest).
- §17 gates: scheduling records time only; exchange transitions are display-only; referral/attribution/
  reward logic is server-owned; role matrix defaults admin-only; analytics export carries the pending
  notice. All 21 open decisions are listed in §9 above — wire rules only when they are agreed.
- The **gap-fix pass** (high + medium audit items) is complete: post actions on every surface, per-account
  record scoping, composer audience parity, business edit/resubmit semantics, manager deep-link denial +
  audited escalation with note, admin 6-value visibility + reject-reason gate, analytics all-metric drills.
  Remaining **low-polish** items (consumer composer preview/drafts/counter, Profile create-post race,
  My Posts "open original", business shell Notifications entry, URL-only media, spec-table overstated
  rows) are deferred by choice — they do not block any flow.
