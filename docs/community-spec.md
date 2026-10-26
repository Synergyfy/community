# Community Project — Spec Understanding & Current-State Audit

One connected product inside Central Hub Solution (CHS) with **three distinct dashboards**:
Business, Admin, Consumer — all different views of the same Community system (shared data,
consistent permissions), not three separate apps. Community stays separate from Group
Building / Group Circles, connecting only where intended.

> Spec sections referenced as §1–§10 from the approved specification.
> Audit date: 2026-10-12. Stack: React 19, Vite, React Router 7, TanStack Query, Zustand, Tailwind.
> Engineering handoff (routes, API requirements, decisions register, tests): [`docs/community-handoff.md`](./community-handoff.md).

---

## 1. The flow, end to end (§1, §2.1, §6)

```
CHS ──> Community public landing (/community)
          │  browse public content WITHOUT being forced to sign in
          ▼
     Choose an action (react, comment, follow, share, join, post…)
          │
          ├── read-only public action ──> allowed while signed out
          │
          └── auth-required action ──> CHS sign in / registration (/auth/login, /auth/register)
                │  returns to the ORIGINAL action (state.from), not a generic dashboard
                ▼
           Account type + permissions checked (server-side rules, UI aware)
                ├── Business ──> Business Community dashboard (/business/…)
                ├── Consumer ──> Consumer Community dashboard
                └── Admin    ──> Admin dashboard
```

Four shared workflows that must work across all three dashboards:

| ID | Workflow | Owner surfaces |
|----|----------|----------------|
| A | Admin publishes information (announcements, exchange items, feed controls) | Admin → feeds both other dashboards |
| B | Business publishes a Community post (type → content → audience/visibility → moderation gate → publish) | Business, moderated by Admin |
| C | Campaign sharing & tracking (share → trackable link → visit → qualifying action → attribution) | Business + Consumer share; Admin inspects |
| D | Consumer participates (view → auth gate → act → record → see it in own activity) | Consumer |

Hard rules from the spec we must respect:

- No separate Community login system — CHS identity only.
- Return users to the action they attempted after sign-in (already implemented).
- Permission-aware UIs, but server-side permissions are the real boundary (§5.5).
- Business does not gain Admin rights; consumers never see business-only tools.
- Public browsing must not leak business-only posts, private exchange data or restricted campaign info (§4.1).
- Ordinary posts are NOT campaigns; engagement metrics are distinct from campaign outcomes (§3.3).
- Never display invented counts; empty states with next actions instead (§3.1).
- Attribution/rewards come from server events, not front-end declarations (§5.4, §4.4).

---

## 2. Current state audit (what exists today, file-level)

### 2.1 Front-facing public experience — LARGELY BUILT ✅

| Spec item | Status | Where |
|-----------|--------|-------|
| Public browse without sign-in | ✅ | `/community` + all public routes under `PublicLayout` |
| Community feed (cards, author, timestamp, media, tags, actions) | ✅ | `CommunityHomePage`, `Feed`, `PostCard`, `FeedTabs` |
| Post composer (Create) | ⚠️ partial — text only | `PostComposer` (see §3 gaps) |
| Post detail + comments (like, comment, save, share, report, hide) | ✅ | `PostDetailPage`, `CommentList`, `ReportModal`, `engagement.store` |
| Discover: search, hashtags, categories | ✅ | `DiscoverPage`, `SearchResultsPage`, `HashtagPage`, `CategoryPage` |
| `#Exchange` list + detail + requests | ✅ (single shared view) | `ExchangeListPage`, `ExchangeDetailPage`, `useExchangeRequests` |
| Saved | ✅ | `SavedPage` |
| Activity ("everything you have posted") | ✅ | `ActivityPage` |
| Notifications (bell + unread badge) | ✅ | `NotificationsPage`, `notifications.store` |
| Stories / Reels | ⚠️ built but UNDECIDED in spec (§9) | `components/stories/*`, `components/reels/*`, services |
| Business profile, Campaign/Offer/Reward/Group detail | ✅ | `pages/public/*` |
| Share modal with trackable link + QR | ✅ (creation only) | `ShareModal`, `sharing.service.ts` |
| Auth gate that returns to the attempted action | ✅ | `useAuthGate`, `GuestRoute` (`state.from`), `LoginPage` |
| CHS identity | ⚠️ demo-first | `auth.service.ts` attempts real API then falls back to demo users |
| Location context (city/area switching) | ✅ | `useCommunityLocation`, `LocationSelector` |

### 2.2 Shared front-facing navigation (§2.2) — DONE ✅

Bottom nav now matches the spec foundation exactly — five destinations, never more:
**Home · Discover · #Exchange · Activity · Profile** (mobile, `PublicLayout`).

| Tab | Icon | Guest | Consumer | Business |
|-----|------|-------|----------|----------|
| Home | Home | `/community` | `/community` | `/community` |
| Discover | Compass | `/community/discover` | same | same |
| #Exchange | Repeat | `/community/discover/exchanges` | same | same |
| Activity | Bell (+ unread badge) | sign-in handoff → returns to notifications | `/community/notifications` | `/community/notifications` |
| Profile | User | sign-in handoff → returns to profile | `/community/profile` (new screen) | `/business/dashboard` |

- Create removed from the bottom nav; posting lives in the feed composer and the Profile screen's "Create a post" action (secondary features in a clearly labelled menu, per §2.2).
- New `/community/profile` screen (`ProfilePage`): identity card, Create post, My activity, Saved, Notifications, business-only tools section (permission-aware), sign out; sign-in CTA state for guests.
- Desktop (md+): bottom nav hides, header gains Home/Discover/#Exchange/Activity links — responsive across breakpoints.
- Header account menu simplified to Profile / Saved / Log out.

### 2.3 Business dashboard — PARTIAL ⚠️ (`/business/*`, `BusinessLayout`)

| Spec §3 item | Status | Notes |
|--------------|--------|-------|
| Overview/Home (identity, quick actions, announcements, feed) | ⚠️ | `BusinessDashboardPage` shows business + posts + offers + campaigns + **admin announcements strip** (shared `AnnouncementStrip` over the announcement store, §4/§15); no stories strip, no quick-action row |
| Community Feed | ✅ | Reuses public feed |
| Create Post | ✅ | `BusinessPostComposer`: post-type selector (7 types), title, content, media (URL add/remove, §9 open on file upload), hashtag chips (normalised, preview), **audience/visibility (Everyone / Signed-in members / Businesses only)**, live preview; per-content-type visibility rules stay open pending §9-3 — the control ships and records exactly what the author chose |
| My Posts (manage, status, moderation feedback) | ✅ | Full lifecycle states — published / pending review / drafts / rejected (with moderation feedback) / archived; **edit semantics**: rejected → pending (resubmit, clears the previous decision), pending stays pending, drafts stay drafts ("Publish now" is the explicit publish), archived sends no status; omitted media/hashtags/type/visibility are **kept** on edit, empty arrays clear; composer button reads "Resubmit for review" for rejected posts |
| Discover | ✅ | Shared public discover |
| `#Exchange` | ✅ | Same records as consumers — matches §4.5 single-record approach; only **active** items appear in browse/search (non-active hidden from members, author + admin still see them) |
| Campaigns (view/create/manage) | ✅ | `BusinessCampaignsPage` |
| Share & Promote (per-campaign share screen) | ✅ | `CampaignShareModal` — attributed link, Copy/native share/QR, instructions, attribution status + link to results, eligibility warning (§3.5) |
| My Sharing Results | ✅ | `/business/sharing` — shared `SharingResults` component; shares/visits recorded via `?ref=` capture (`AttributionCapture`), §4.4 honesty rules |
| Notifications & Messages | ⚠️ | Notifications page exists; **messaging undecided (§9)** |
| Business Profile | ✅ | `BusinessSettingsPage` |
| Settings & Help | ⚠️ | Profile editing + **Help & support card** linking to the shared `/community/help` surface (same support form consumers use, §2.4 parity); no privacy/notification prefs yet |

### 2.4 Consumer dashboard — ✅ BUILT (§4, step 5)

| Spec item | Status | Where |
|-----------|--------|-------|
| Community Home (feed, announcements, highlights) | ✅ | `/community` + §4.1 additions: welcome/profile prompt, **admin announcements strip** (shared `AnnouncementStrip` over the announcement store — one record on every surface, §4/§15), campaign highlights row, persistent nav |
| Discover | ✅ | `/community/discover` (+ "View all" → campaigns list) |
| `#Exchange` (consumer-permitted) | ✅ | Same records as business; business-only items hidden (permissions engine); request action auth-gated |
| Campaigns discovery | ✅ | `/community/campaigns` — search + status filters (All/Active/Ended) + cards |
| My Campaigns | ✅ | `/community/my-campaigns` — Following / Updates / Shared by you / Completed, **recorded events only** (follows via engagement store, shares via attribution store); viewing ≠ joining; contributions deferred to connected product (§9) |
| My Sharing | ✅ | `/community/sharing` — shared `SharingResults` component (§4.4 honesty rules) |
| Activity & Notifications | ✅ | `/community/notifications` |
| My Profile | ✅ | `/community/profile` — identity, activity/saved/notifications, Campaigns section, business section, help, sign out |
| Help & Support | ✅ | `/community/help` — common questions + report-a-problem form (demo confirmation) |
| Campaign flow (§4.2) | ✅ | Discover → campaign card → detail → auth-gated actions (share/follow) with return-to-action; contributions route to ComingSoon until connected product is wired (§9) |
| Post actions on every surface | ✅ | Single shared `usePostActions` hook drives like / save / share / more on **every PostCard surface** (home feed, hashtag, search, business profile, campaign updates, group posts, post detail): likes & saves write the engagement store **and** the backend call (fire-and-forget in demo), share targets the post's **linked record** (campaign/offer/reward/exchange) or the post itself, More offers hide (works signed out — local preference) / report (auth-gated); hidden posts are filtered from every list and post detail offers "Show this post"; auth-required actions return to the attempted action (`state.from`) |
| Per-account record scoping | ✅ | Engagement records (likes/saves/hides/reports/joined campaigns) and notifications are keyed to the signed-in account (`ownerId` + `archive` map — other accounts' records parked, never wiped); `StoreOwnerSync` swaps stores on sign-in/sign-out after auth bootstrap, so accounts sharing one browser never see each other's activity; guest visitors own a `'guest'` bucket; guest header shows **no unread badge** |
| Composer audience parity | ✅ | Consumer composer carries the same **3-audience selector** as business (Everyone / Signed-in members / Businesses only) — recorded as `visibility` on the post; per-content-type rules stay open pending §9-3 |

### 2.5 Admin dashboard — ✅ BUILT (§5, step 6)

Routes under `/admin` (ProtectedRoute `['admin']`, own `AdminLayout`):

**Admin shell (§5, §8)** — responsive control-centre navigation:
- **Desktop (md+)**: persistent left **side menu** listing every permitted section (Overview, Content, Moderation, Reports, Announcements, #Exchange, Users & Access, Campaigns, **Community Managers**, Sharing & Attribution, **Rewards & Notifications**, **Analytics & Reporting**, Configuration, **Membership & Access**, Audit Log) + **View Community** footer link. Sections filtered through the admin action matrix (§14, §17-6 pending role assignments — grants editable on Configuration; deep links without the grant render a denied panel, built in K).
- **Mobile**: slim header (title + View Community) + fixed **bottom nav** with the four primary sections (Overview, Moderation, Reports, #Exchange) + **More** — the More sheet lists every remaining section plus View Community, mirroring the member bottom-nav pattern (§2.2).
- **Sign-in landing** — the login page's **Admin demo button always opens the control centre** (`/admin`), regardless of any pending return-to-action; Business → `/business/dashboard`; Consumer → `/community`; **Manager → `/manager`** (Community Manager Dashboard). Regular email sign-in still honours return-to-action (§2.1) and falls back to the account's own home (`homeForUser`), which lands an account holding an **active** Community Hub Manager appointment on `/manager` (their membership home stays one click away inside it). Implemented via a one-shot `forceSignInHome` that `GuestRoute` reads during its authenticated render (the guest redirect wins the sign-in race, so the destination must be set before `signIn()`).

| Module | Route | Coverage |
|--------|-------|----------|
| Overview (§5.1) | `/admin` | Metrics with stated calculations (accounts, published feed posts, active exchange items, campaigns available, open reports, shares/visits/qualified), outstanding-work quick links, recent admin actions; **date/location filters (§2D)** — a filter bar applies to the **metric cards only**: each card states which filters touched it or why the record type cannot honour one (accounts: no recorded date/location; campaigns: no recorded date; reports/shares/visits/qualified: no location), the bar explains which date each record type matches, and **outstanding work + recent actions always list everything** |
| Content Management (§5.2) | `/admin/content` | All posts in every state; **search (title/text/creator/id) + filters (content type, business/consumer, location, date range, status)**; approve / reject (mandatory reason) / hide / restore / remove (confirm) / pin / feature / visibility control (**full 6-value `ContentVisibility` select** — public / both / business / consumer / group / private, no silent 'public' fallback); **open original** link; **schedule shell** (§17-1 pending — records requested time, no auto-publish); **linked comments** inline (remove/restore, reported badges) and per-post **moderation history** (audit entries with before → after + reason); **first-class report records** shown with reason, reporter and demo-source labels; reports-first sort |
| Moderation queue (§3.5) | `/admin/moderation` | One queue over posts, comments, exchanges and accounts — reported targets (duplicate reports merged into one row, §15) plus content awaiting approval; workflow statuses **Pending → Under review → Escalated → Resolved** (uphold/dismiss); per row: content type, preview, creator, date reported, reasons, report count, assigned reviewer, open-original link, **visible/not-visible indicator**; actions: mark under review, escalate, assign to me, uphold & enforce (per target type), dismiss, reject with reason; filters by status and content type |
| Reports center (§3.6) | `/admin/reports` | Full report ledger (all statuses, incl. resolved history): reason + details context, reporter, demo-source labels, open-original links (comment reports resolve to their post), assigned reviewer, recorded **decision + outcome** for resolved items; uphold/dismiss decisions act on the same records as the queue (§15); search + status/type filters; link to configurable reasons on Configuration |
| Announcements (§4) | `/admin/announcements` | Full composer (title, content, image URL, category, audience, location scope, group scope, publish timing: now/schedule/draft, optional expiry, pin) + lifecycle actions (publish now, pin/unpin, expire, archive, edit, delete — each audited with previous → resulting status); records **swept on read** (scheduled → published → expired, no timer needed); **one record fans out** via the shared `AnnouncementStrip` to public/consumer home, business Overview and group pages — audience/location/group targeting centralised in `announcementsService.isTargetedAt` (§15); Overview carries due-publish/due-expiry tasks; demo seed labelled `source: 'demo'`; viewer matrix verified in-browser |
| #Exchange Management (§5.3) | `/admin/exchange` | **Status-vocabulary tabs** (All/Active/Completed/Expired/Cancelled, live counts, distinct badges) — display only, transitions pending §17-2; approve (from cancelled/expired) / reject (**modal's confirm stays disabled until a reason is typed** — §5.2) / archive / remove / visibility (**full 6-value select**), all audited; **category management** (§5.2: add/rename/reorder/show-hide, same store as composer + filters); disabled-type badges from config (**type switches now also consumed by the member composer**: disabled types hidden, who-can-create locked with reason, requires-approval notice — built in J); **open-report badges** linking to the central queue; **Messages-context panel** behind `view_messages_context` permission with §17-7 privacy notice; demo records in completed/expired states; non-active items hidden from public browse (author + admin only) |
| Users & Access (§5.5) | `/admin/users` (+ `/admin/users/:id`) | Searchable accounts with type, business association, post counts, suspend/reactivate (audited; server-side enforcement noted); controls gated by `canAdmin('manage_users')`; **Participation link** → per-account drill-down (§8): participation summary counted from recorded records only, **group-origin content** card (§9, membership belongs to Groups & Circles), posts/exchange items/sharing (clicks totals, ±unconfirmed registrations)/reports filed & received/moderation history — same stores as other screens (§15) |
| Campaign Connections (§5 item 6) | `/admin/campaigns` (+ `/admin/campaigns/:id`) | Connected campaigns, status, product links (contributions via connected service), **live config badges** (sharing/referrals/leaderboard) → per-campaign detail: **sharing config** toggle, **referral config** (actual configured criteria text + attribution window stored as data, never hardcoded — §17-4), **QR record** (an ordinary tracked share, one ledger entry, §15), **campaign-scoped attribution** (§7.4: shares/clicks/registrations±unconfirmed/joins/qualified + link to full §6.6 journey), **config-driven leaderboard** (ranking metric = stored config: qualified/confirmed-registrations/clicks-total; pending never ranked; demo rows labelled), **rewards links** (§17-5 triggers-pending); all config edits audited |
| Sharing & Attribution (§5.4, §6.6) | `/admin/sharing` | **Shares \| Referrals tabs**; funnel stats (Shares, Clicks **total** with unique shown **only when backend-supplied**, Registrations with unconfirmed count, Joins, Qualified); per-share cards with target, **related campaign/product**, sharer + account type, share type, **QR record**, demo-seed label; **7-stage journey drill-down** (share → click → registration → attribution decision → join → contribution → referral outcome) displaying recorded backend statuses only; **referrals table** with status columns + backend window values (§17-4); export JSON incl. referrals; attribution-correction policy note (§17-3) |
| **Rewards & Notifications** (§10, §11) | `/admin/rewards` | **Rewards \| Notification events tabs**; rewards tab = read-only oversight of central Rewards records (§11 — Community runs **no reward engine**: no create/edit/close/claim actions): status vocabulary (available/ended, display-only), qualification text shown exactly as configured (never evaluated, §9/§17-5), campaign cross-link, **linked Community content** through `rewardId` (§15 one record), reward-page link; demo records labelled `demo seed`; notification tab = **event inventory** (§10): per event the in-app type, emission point (component / backend / demo-seed-only / not-emitted-yet) and destination + **destination verification** (each destination checked against the App.tsx route table *and* its example link checked against the demo record it points at, with pass/fail summary); **message templates** per event (title/body + in-app/email channel toggles) stored and audited behind the new `configure_notifications` action (§17-6, default admin) — emitters keep their built-in text until the §9-8 trigger/delivery decision lands |
| **Analytics & Reporting** (§12, §2D) | `/admin/analytics` | **Three report suites** as tabs with live filtered counts — **Community**: posts created / published / pending, comments (incl. removed), reports filed (± open/resolved split), announcements published; **#Exchange**: items created / active / completed / expired-or-cancelled, items with a recorded request (**count only** — message content stays behind `view_messages_context`, §17-7), items-by-category breakdown; **Sharing**: shares created (demo-seed count shown), recorded visits (totals only — unique clicks only when backend-supplied), registrations (± unconfirmed), campaign joins, qualified outcomes (pending never counted) — each a distinct measure, shares ≠ visits ≠ qualified (§6.6); one shared **filter bar** (date from/to + location select + All time / Last 7 days / Last 24 hours presets + Clear) with a summary line naming the active range/location and the date each record type matches; **every metric card = value + definition + filter-scope note** (e.g. "location not recorded on this record"); **drill-down "View records"** lists the exact records behind each figure (links to the record/admin surface, capped at 25 → "use Export JSON for the full list"); **shares-by-related-campaign** breakdown (campaign vs ordinary-target distinction); **Export JSON** = filtered records + metric definitions + §17-8 export-policy-pending notice; gated by new `view_analytics` action (oversight group, default admin) |
| **Community Hub Managers** (staff role) | `/admin/managers` (+ `/admin/managers/:id`) | **Management structure config** (one-per-area / multiple-per-area / hierarchy — an admin choice, audited) + **area management** (named areas with optional city scope); **Create Manager** appointment flow: existing CHS account or CHS invite → areas → hierarchy (reporting level + supervisor, when enabled) → **independent permission switches** (view/review, approve/reject, publish posts, publish announcements, hide/remove/restore, moderate reports, moderate #Exchange, escalate to Admin) → restrictions (permitted content types, announcement audiences) → review & confirm (appointing Admin + date recorded automatically); manager list with status/areas/permission chips; detail page: reassign areas, change permissions/restrictions, **suspend / reactivate / remove role** (CHS account never touched — staff role is not a membership), retained **activity history** (lifecycle audit entries + the manager's own content decisions); all mutations audited (`targetType: 'manager'`) |
| **Membership & Feature Access** | `/admin/membership` | Centralized plan entitlements: **plans** (business/consumer, add/remove with feature allow-list cleanup); per feature: **allowed plans**, **usage limit**, **expiry rule** (keep / downgrade / revoke / read-only), **suspension rule** (block / read-only / allow), **onboarding requirement**, **access message + next step**; per-feature **authorized exceptions** (grant/revoke, auditable); banner enforcing the boundary — membership rules grant member-facing features only and **never administrative or moderation permissions** (those live in the admin action matrix and manager appointments); backend remains authoritative on plan/expiry/suspension state; all saves audited (`targetType: 'membership'`, changed-fields summary) |
| Configuration (§5.3/§3.6/§13) | `/admin/config` | **Single configuration surface, 10 sections**: exchange type toggles (enabled / who-can-create / requires-approval, persisted — **consumed by the member composer**: disabled types hidden, who-can-create chips locked, requires-approval shown with the §17-2 pending note); **community category editor** (add / rename / hide-show / reorder, audited — same store Discover + category pages consume); #Exchange categories summary + Manage link to `/admin/exchange` (one editing surface §15); **hashtag flags editor** (feature/unfeature, restrict/unrestrict, audited + persisted — flags shown as badges on the hashtag page §3.3); **admin roles & permissions matrix** (§14/§17-6: 16 actions × Admin/Business/Consumer, persisted + audited `update role grant`/`reset role grants`, ships admin-only, feeds `canAdmin` + section denial); announcements rules summary + Manage link; per-campaign sharing/referral/leaderboard/rewards summary + Manage links (edited on campaign detail, §15); **configurable report reasons** (add/remove, consumed by the report modal); post types read-only pending §9; visibility rules summary |
| Audit Log (§14) | `/admin/audit` | Immutable entries: admin, action, target, timestamp + **previous → resulting status** and reason; **filters** (search across action/target/admin/id/details + action select + target-type select + Clear + "N of M entries" count) — filtering changes only the view, never the record |

Deferred (pending §9 / shared CMS): notification trigger & delivery rules (which events notify
in-app vs email — the message templates themselves are stored configuration on `/admin/rewards`,
not yet applied by emitters), Analytics **export policy** (approved scope, recipients, retention — §17-8; the
JSON export on `/admin/analytics` contains only the filtered records + definitions shown on screen),
Public Website Management, attribution-window
configuration.

### 2.5b Community Manager Dashboard — ✅ BUILT (Community Hub Manager spec)

Route `/manager` (any signed-in account; the `ManagerLayout` itself guards by appointment record —
no appointment → explanation + link home; invited/suspended/removed → lifecycle notice + link home).

**Boundaries (spec §4, §5):**
- A Community Hub Manager appointment is a **staff-role overlay on a CHS account** — a separate
  `ManagerRecord`, never a membership. Appointing, reassigning, suspending or removing the role
  never creates, changes or deletes the person's CHS account or memberships; the UI states this on
  every lifecycle surface.
- **Permissions are independent switches** (spec §3): a manager who can approve posts does NOT
  gain announcement publishing, platform settings or account restrictions. Sections and actions are
  gated per permission, not per role. The nav only lists granted sections; a **deep link to an
  ungranted section** (`/manager/content|reports|exchange|announcements` → required permission map
  in `ManagerLayout`) renders a **denied panel** naming the missing permission key — never the page
  behind a hidden button, and never a "restore grants" affordance (appointment permissions are
  Admin-granted, not self-editable).
- The dashboard **reads the same stores** as the Admin screens (one set of records, §15) and every
  action goes through the same audited `adminApi` methods — the acting user is the manager, so their
  content decisions land in the audit log under their account (retained history, spec §8).
- **Scope** is resolved from assigned areas (`manager-scope.ts`): a platform-wide area covers
  everything; a city area covers content located in that city (plus extra locations); content with
  no location is only covered platform-wide. Out-of-scope items are hidden with an honest count.
- **Account restrictions are reserved for the central Admin** — a manager can mark an account
  report under review, escalate or dismiss it, but never suspend the account.
- **Escalation** (`adminApi.escalateToAdmin`) records an audited escalation entry addressed to the
  central Admin — it does NOT change the target's state; the Admin decides the outcome. Every
  escalate action (Content, Reports, #Exchange) opens a **note modal** — the note is stored with
  the audit entry; after escalating, the Reports page shows "Escalated to Admin — awaiting their
  decision" for that session without pretending the record's status changed.

Sections (permission-filtered): **Overview** (appointment summary + in-scope workload counts +
recent activity — the **open-reports count is scope-filtered** with the same post/exchange/comment
resolution the Reports page uses, so the number always links to actionable work), **Content**
(approve/reject/publish, hide/restore/remove, comments, escalate reported posts), **Reports** (open
in-scope reports: under review / escalate to Admin with note / uphold & enforce / dismiss),
**#Exchange** (approve **only from cancelled|expired** per §17-2 — active items show no approve
action, reject with reason, archive, escalate; a `canModerate` amber banner states the boundary when
the permission is absent), **Announcements**
(compose/publish within permitted audiences — only when `publishAnnouncements` is granted), **My
appointment** (read-only scope, permissions, restrictions, appointing Admin + date, activity
history). Mobile: 4-tab bottom nav + More sheet; desktop: side menu; **My CHS home** link back to
the person's membership surfaces.

Demo exhibits (labelled `source: 'demo'`): manager **Maya Patel** (mgr1, consumer account, active,
hierarchy level 2, Worcester area, content/reports powers + escalate — no announcement or exchange
powers) and **Tom Fisher** (mgr2, business account, suspended, level 1 reporting to Maya, exchange
powers, content-type restriction). Login page **Manager demo button** opens Maya's dashboard.

### 2.6 Cross-cutting

| Area | Status |
|------|--------|
| Visibility model (`public/business/consumer/both/group/private`) | ✅ typed + **enforced** — `lib/permissions.ts` filters feed, search, hashtag, exchange and profile surfaces by viewer (demo fallbacks; server must mirror) |
| Moderation states (draft/pending/rejected + reasons) | ✅ model level — `PostStatus` enum, `moderationReason/moderatedBy/moderatedAt` fields, demo examples (admin UI still to build) |
| Attribution events (Workflow C backend) | ⚠️ client side done — `attribution.service.ts` records `?ref=` visits (deduped per session, pending status, demo store in localStorage) + `AttributionCapture` mounted in `App`; qualification/attribution windows remain server-side + pending §9 |
| Campaign vs. ordinary-post distinction in analytics | ✅ reporting UI (Phase I) — `/admin/analytics` carries a **shares-by-related-campaign** breakdown (campaign vs "no related campaign") and every share row shows its related campaign; Community drill-down rows flag campaign/group origin on posts; campaign-scoped figures stay on `/admin/campaigns/:id` (Phase F). Attribution-event-level campaign splits remain display-only pending §17-4 |
| Loading / empty / error states | ✅ skeletons + `EmptyState` used broadly; error states thin |
| Access denied page | ✅ `AccessDeniedPage` |
| Mobile-first (§8) | ✅ single column, bottom nav ≤5, cards, sheets; needs filter-drawer + scroll-context preservation checks |
| Group & Circles separation | ✅ enforced — group features stay member-facing (`GroupDetailPage`, `CommunityGroups`, `useGroupRequests`); the admin surfaces only *identify* group-origin content (badges on content/queue/reports + participation drill-down) and put group *context* behind `view_group_context` (§17-7 notice); no group membership/settings/approval management is duplicated in Community admin (§9) |

---

## 3. Open decisions (§9) — DO NOT INVENT

These require Henry's confirmation before implementation:

1. `#Exchange`: exact item types + per-role actions (current types: offer_request, swap, trade, service, other)
2. Post types list + which require approval before publishing
3. Visibility rules per content type
4. Direct messaging — in scope? who can message whom?
5. Stories/Reels — real formats or familiar-feed-style only? (code already has both)
6. Campaign tracking: qualifying events, attribution window, dedup rules
7. Rewards: any reward-eligible shares/outcomes? approved rules?
8. Notifications: which events trigger in-app/email?
9. Profile & following: can users follow accounts/topics? public profile fields?
10. Admin publishing: what bypasses moderation?
11. Connected products: which campaign/user integrations are live via approved APIs (e.g., FundOrDonate routing for donations §4.2)?
12. One account holding both business + consumer access: switching behaviour must follow the CHS account model (§2.1)

---

## 4. Recommended build order (§10 mapped to this repo)

1. ✅ **Audit** — this document
2. ✅ **Shared data model & permissions** — DONE:
   - `lib/constants.ts`: `PostStatus` (draft/pending/published/rejected/archived), `ShareEventStatus` (pending/attributed/qualified/rejected), `ShareEventType`, `ContentVisibility`
   - `types/community-public.ts`: post `status` widened, `moderationReason/moderatedBy/moderatedAt/scheduledAt`, exchange `visibility`, new `ShareRecord` + `AttributionEvent`
   - `lib/permissions.ts` (new): `canViewPost` / `canViewExchange` / `canViewVisibility` — audience + status rules, viewer from auth store
   - Enforcement in demo fallbacks of `community.service`, `discover.service`, `entities.service` (feed, post detail, author posts, search, hashtags, exchange list/detail, business profile, campaign updates)
   - `attribution.service.ts` (new) + `AttributionCapture` in `App.tsx`: records `?ref=` visits deduped per session, keeps pending-ref context, demo event store
   - Demo data: draft/pending/rejected posts for the demo business + a business-only exchange (`e2`) to prove audience rules
   - `tsc` + `vite build` green
3. ✅ **Public experience polish** — DONE (§2 shared experience):
   - Bottom nav per §2.2 (Home, Discover, #Exchange, Activity, Profile) with role-aware destinations and unread badge on Activity
   - `/community/profile` screen added; Create post relocated from nav to feed composer + Profile menu
   - Auth handoff completed: guest taps on Activity/Profile → sign-in → returns to the attempted destination; demo sign-in also honours return-to-action (business default `/business/dashboard` only when no action was attempted)
   - Notifications page gated for signed-out visitors with sign-in CTA
   - Desktop header nav (md+) so primary navigation exists at every breakpoint
   - Public browsing unchanged: feed, discover, exchange, detail pages all work signed out; sign-in only required for participating actions (`useAuthGate`)
4. ✅ **Business dashboard** — DONE (§3):
   - **Create Post** (`components/business/BusinessPostComposer`): post types (Update/Offer/Announcement), title, content with 1000-char limit + counter, media URLs with add/remove + preview, topic/hashtag chips, audience & visibility selector (Everyone / Signed-in members / Businesses only), preview before publishing, Save Draft / Cancel / Publish, validation errors beside fields
   - **My Posts** (`BusinessPostsPage`): status filter tabs with counts (All/Published/Pending/Drafts/Rejected/Archived), status badges, moderation feedback callouts on pending/rejected (with reason + resubmit guidance), per-status actions (edit, publish draft, share, archive, restore, delete), Campaign tag only where a post is genuinely campaign-linked
   - **business.service**: `PostInput` extended (title/mediaUrls/hashtags/visibility/status), archive/restore added, publishing an edit clears moderation feedback
   - **Share & Promote** (`components/business/CampaignShareModal`): campaign name + status, attributed link, Copy Link / native share / QR + download, how-it-works instructions, eligibility warning when ended/expired, attribution status + link to results; shares recorded to the attribution store
   - **My Sharing Results** (`/business/sharing`, `BusinessSharingPage`): totals for Shares / Clicks (total; unique shown only when the backend supplies it) / Qualified as *distinct* measures, per-share cards with clicks vs registrations (unconfirmed flagged) vs qualified + related campaign and share-type badges + demo-seed chips, tracked-event list with honest pending/qualified statuses, open campaign + share again (§6.6/Phase E upgrade)
   - **Overview (§3.1)**: quick actions (Create post / Explore #Exchange / Share a campaign), "Needs your attention" strip (real pending/rejected posts), admin-pinned announcements
   - Layout nav: Overview, Posts, Offers, Campaigns, **Sharing results**, Settings
5. ✅ **Consumer dashboard** — DONE (§4):
   - Campaigns discovery (`/community/campaigns`) with search + status filters; linked from Discover and Home highlights
   - My Campaigns (`/community/my-campaigns`): Following / Updates / Shared by you / Completed — recorded events only; follows persisted in engagement store, shares via attribution store; explicit note that viewing ≠ joining; contributions deferred to connected product
   - My Sharing (`/community/sharing`): reuses shared `SharingResults` component (extracted from business view)
   - Help & Support (`/community/help`): common questions + report-a-problem form with honest demo confirmation
   - Profile enriched with Campaigns + Help sections
   - §4.1 Home additions: welcome/profile prompt, pinned announcements, campaign highlights
   - Follows now require sign-in with return-to-action; campaign follows recorded as events
   - ShareModal records created shares so consumer sharing appears in results
6. ✅ **Admin dashboard** — DONE (§5, see table in §2.5 above): moderation over the step-2
   statuses, exchange management, users & access, campaign connections, sharing & attribution
   inspection with export, community configuration, and a full audit log. Admin mutations run
   against the same demo store objects the public/business/consumer surfaces read, so one action
   updates every view (Workflow A verified end-to-end).
7. ✅ **Connect services** — one action in one dashboard updates views in the others.
8. ✅ **End-to-end tests** — DONE: Playwright suite (`playwright.config.ts`, `tests/e2e/`, 14 tests on
   desktop + mobile-viewport projects, run with `npm run test:e2e`; `/api/**` answered with an instant
   502 so demo fallbacks run fast) covering **mobile layouts** (public five-tab bottom nav; admin
   bottom nav + More sheet; desktop side menu), **permissions** (signed-out `/admin` → sign-in,
   consumer `/admin` → Access Denied, business-only exchange audience), **moderation** (reject with
   §5.2 failed-action validation → author's Rejected tab shows the same reason → public feed hides it
   → audit entry, one SPA session per the in-memory demo-post rule), **failed actions** (login
   validation, duplicate report reason), **attribution** (`?ref=` visit increments the recorded-visits
   total on `/admin/sharing`), and **CHS auth return-to-action** (Activity/Profile taps and header
   Sign in all return to the attempted destination).
9. ✅ **Handoff doc** — DONE: [`docs/community-handoff.md`](./community-handoff.md) — existing vs. new,
   full route list with guards, API requirements per area (endpoints already called + local-store
   structures the backend must own), localStorage persistence model, demo accounts/fixtures, the §9 +
   §17 open-decision registers, test-suite description and known limitations.

Routes to add (proposal, pending decisions): `/admin/*` (protected `['admin']`),
`/consumer/*` (protected `['consumer']`), `/business/sharing` (results),
`/community/campaigns` (discovery).

> Implementation principle: build shared services once; dashboards are permission-filtered
> views — never three disconnected systems.

---

## 5. Admin dashboard — complete control specification (phased plan)

Consolidated admin scope (17-section control spec). **Frontend only** — no backend work.
Decision gates from §17 below block *rules*, never *structure*: UI shells, tables, filters,
status components and permission-aware action patterns are built now; disputed rules are wired
when agreed. Demo data used for records the backend does not supply is clearly labelled
(`source: 'demo'`), never presented as real outcomes.

### Phase tracker

| Phase | Scope | Status |
|-------|-------|--------|
| **A. Foundations** | First-class `ReportRecord` (status/reason/reporter/resolution) + seeded demo reports; configurable **report reasons** (report modal now reads config, not a hardcoded list); admin-managed **category store** (community + exchange, seeded from existing data, consumed by Discover grid/category page + exchange composer); **announcement record + store** (Phase C builds the UI); **hashtag admin flags**; **audit enrichment** (previous → resulting status + reason on every entry); **admin action matrix** (`canAdmin`, nav + controls gated; role assignments pending §17-6); `reportPost` demo fallback fix (previously threw without a backend) | ✅ **DONE** |
| **B. Community Management core** | Content list **search + type/creator/location/date/status filters**, open-original, per-post **moderation history** + **linked comments** (remove/restore) + schedule shell (§17-1 pending); central **moderation queue** `/admin/moderation` over posts/comments/exchanges/users with workflow statuses (pending → under review → escalated → resolved; assign-to-reviewer; visible/not-visible indicator; duplicate reports merged per target); **reports center** `/admin/reports` (full ledger, configurable reasons link, decisions + recorded outcomes, open-original); comments & engagement oversight (§3.4) incl. **comment report entry point** (CommentItem menu) and reported-comment badges; report entry points added for **exchanges** (detail page); `ReportModal` generalized to any target type | ✅ **DONE** |
| **C. Announcements** | Composer (title/content/media/category/audience/location scope/group scope/publish timing/expiry/pin) at `/admin/announcements` with lifecycle actions (publish now, schedule, pin/unpin, expire, archive, edit, delete — all audited); **one record fanned out** through a single shared `AnnouncementStrip` on public/consumer home, business Overview, and group pages — audience, location and group targeting applied centrally in `announcementsService.isTargetedAt` (§4, §15); lifecycle swept on read (scheduled → published → expired) so timing works without a timer; Overview **due-publish/due-expiry tasks**; demo seed labelled `source: 'demo'`; viewer matrix verified in-browser (public/consumer/business/admin/group) | ✅ **DONE** |
| **D. #Exchange completion** | Exchange **category management** on `/admin/exchange` (add/rename/reorder/show-hide, audited; same store the composer + filters consume; category store **self-heals** ids seeded after first init); **full status vocabulary** as tabs All/Active/Completed/Expired/Cancelled with live counts and distinct badges — display only, per-status actions restricted to the spec's vocabulary (approve from cancelled/expired, reject + archive on active; **no transition exists for completed** — rules pending §17-2); demo records seeded in completed/expired states (mirrors draft/pending/rejected demo posts); **visibility enforcement**: non-active exchanges leave public browse/search (author + admin only, mirroring `canViewPost`); reported exchanges **cross-linked** (open-report badge → central queue; reject resolves linked reports); **Messages-context panel** behind the new `view_messages_context` permission with the §17-7 privacy-scope notice, showing request messages from the demo store; final-state notes on cards; audit verified (reject/approve exchange, create/update category); in-browser verified end-to-end: reject → public hidden + queue row + report resolution → cancelled tab → approve restore | ✅ **DONE** |
| **E. Sharing & Attribution** | All shares upgraded (content type, related campaign/product, QR); clicks (total vs unique only if supplied); registrations (attributed vs unconfirmed); joins; **referrals view**; 7-stage journey drill-down (§6.6) — windows/dedup/qualification read backend values only (§17-3/4) | ✅ **DONE** — `ShareRecord` carries related campaign/product, QR record, share type, backend-only unique clicks and a `demo`/`user` source label; `recordShareCreated` auto-derives related campaign and stores the QR; demo funnel seed (3 shares + events covering every status, labelled demo); admin Sharing rebuilt: funnel stats, **Shares/Referrals tabs**, per-share **§6.6 7-stage journey** (share → click → registration → attribution → join → contribution → referral outcome) with `not recorded`/`unconfirmed`/`unique — not supplied` states; **referrals table** derived from registration events (one row per signup, backend status + window columns, §17-4 note); business/consumer **My Sharing** upgraded: clicks total + unique-if-supplied, **Registrations replace the client-computed "Awaiting outcome" figure**, related-campaign + share-type badges, demo-seed chips; browser-verified: full/early/empty journeys, referral statuses (attributed/pending/rejected), user-created share with QR + related campaign on admin page, business surface |
| **F. Campaign integration** | Per-campaign detail: sharing config, referral config (actual configured criteria, never hardcoded), QR record, campaign-scoped attribution (§7.4), config-driven leaderboard, rewards link | ✅ **DONE** — new `/admin/campaigns/:id` (list gains Manage links + live config badges): **sharing config** toggle (audited); **referral config** storing the *actual configured criteria text + attribution window* as data (§17-4 — frontend never hardcodes or enforces qualification; edit + save audited); **QR record** = an ordinary tracked share (`shareType: 'qr'`, one ledger entry visible on `/admin/sharing`, §15 — never a duplicate counter); **campaign-scoped attribution** (§7.4) — shares/clicks/registrations(±unconfirmed)/joins/qualified filtered to the campaign with backend-supply captions and a link to the full §6.6 journey; **config-driven leaderboard** — ranking metric (qualified / confirmed registrations / clicks-total) is stored config, not a hardcoded rule; pending registrations shown separately and never ranked, demo rows labelled, distinct-measures note; **rewards link** — campaign rewards with Open-reward-page links + §17-5 triggers-pending notice; per-campaign config store `campaign-config.service.ts` (`source: 'demo'` seed for camp1); browser-verified: detail render, QR create → single ledger record, metric switch re-ranks, criteria save, 3 audit entries |
| **G. People & Groups** | Business/consumer participation drill-down (§8); group-origin identification + reported group content (§9) without duplicating Groups admin | ✅ **DONE** — new `/admin/users/:id` **account participation drill-down** (§8): header w/ type + status controls (`manage_users`), participation summary (posts by status, comments ±removed, exchange items, shares w/ clicks-totals caption, referrals ±pending/rejected, reports filed/received) all counted from the same stores as the other screens (§15, server authoritative); **group-origin content** card + posts/exchange/sharing/reports/moderation-history sections; **group-origin identification** across surfaces (§9): `Group: …` badges on `/admin/content` cards, `/admin/moderation` rows (post + comment targets inherit the parent post's group) and `/admin/reports` rows; **group context panel** (shared `GroupContextModal`) behind the new `view_group_context` permission (default admin, §17-6/§17-7 pending) with §17-7 privacy-scope notice, group facts, group content + open-report counts, and the **Groups & Circles boundary note** (no membership/settings/approvals duplicated — §9); demo exhibits: business group-origin post p9 (g2) + reported group-origin post report seed on p8 (g1); browser-verified: queue row badge + modal, content cards (consumer + business), reports ledger badge, c1/b2 drill-downs, zero console errors |
| **Community Hub Managers & Membership** *(user-requested, outside the original 12 phases)* | Admin-only manager appointment + lifecycle (staff role, not a membership); configurable structure/areas/hierarchy; independent manager permissions; dedicated Community Manager Dashboard limited to scope + authorised actions; centralized Membership & Feature Access rules (member-facing only) | ✅ **DONE** — new `/admin/managers` (+ `/admin/managers/:id`) and `/admin/membership`, sidebar sections after Campaigns and after Configuration respectively, two new admin actions (`manage_managers`, `configure_membership`); **`ManagerRecord`/`ManagerConfig`** in `managers.service.ts` (localStorage `community_managers` + `community_manager_config`, demo-seeded mgr1/mgr2): structure config (single/multiple/**hierarchy**), area CRUD (named area + optional city), Create Manager flow (existing account or CHS invite → areas → hierarchy level + supervisor → **8 independent permission switches** → restrictions (content types, announcement audiences) → review & confirm; appointing Admin + date captured automatically); detail page: reassign / permissions / restrictions saves, **suspend / reactivate / remove role** (audited; CHS account untouched), retained activity history; **`/manager` ManagerLayout + 6 pages** (Overview, Content, Reports, #Exchange, Announcements, My appointment) — sections and actions filtered by the manager's own permissions, scope resolved from assigned areas (platform-wide vs city), out-of-scope items hidden with an honest count, account restrictions reserved for the central Admin, **escalation = audited entry, never a state change** (`adminApi.escalateToAdmin`); all manager actions reuse the same audited `adminApi` methods (§15 — same records as admin screens); **`MembershipConfig`** in `membership.service.ts` (demo-seeded 4 plans + 6 member-facing features): per-feature allowed plans / usage limit / expiry rule / suspension rule / onboarding toggle / access message + next step, per-feature auditable exceptions, plan add/remove with allow-list cleanup, banner enforcing *membership rules never grant admin/moderation permissions*; audit `targetType` extended with `manager`/`membership`; `homeForUser` lands active managers on `/manager`; login page **Manager demo button** (Maya Patel); tsc + vite build green |
| **H. Rewards & Notifications** | Reward lifecycle oversight reading central Rewards data (§11 — no Community-local reward engine); notification event inventory + destination verification (§10); triggers/templates gated by §17-6 | ✅ **DONE** — new `/admin/rewards` (sidebar **Rewards & Notifications** after Sharing & Attribution, gated `manage_rewards`); **Rewards tab (§11)**: all central reward records with status vocabulary (available/ended, display-only), qualification text shown *as configured* (never evaluated — §9/§17-5), campaign cross-link, reward-page link, **linked Community content** via `rewardId` (new demo exhibit p10 promoting r2), demo-seed labels incl. new ended reward r3 — zero reward mutations (Community holds no reward engine); **Notification events tab (§10)**: factual inventory of 8 events (4 front-end wired, 3 backend/demo-seed, 1 reserved type) with per-row in-app type, emission point, destination and **destination verification** — every destination checked against App.tsx route patterns *and* its example link checked against the demo record (green/red pass banner); **message templates** per event (title/body + in-app/email toggles) in `notification-config.service.ts` (`community_notification_templates`, seeded `demo` → `user` on save) behind new `configure_notifications` action (default admin, §17-6), each save audited (`update notification template`, `targetType: 'config'`, changed-fields summary) — emitters keep their built-in text: which events trigger and in-app/email delivery remain open (§9-8); tsc + build green, browser-verified end-to-end (nav order, both tabs, all-green verification banner, template save → `source: 'user'` + audit entry rendering on `/admin/audit`, zero console errors) |
| **I. Analytics & reporting** | Community/Exchange/Sharing report suites with filters + drill-down (§12); Overview date/location filters (§2D); metric definitions + date ranges; export policy pending §17-8 | ✅ **DONE** — new `/admin/analytics` (sidebar **Analytics & Reporting** between Rewards & Notifications and Configuration, gated by new `view_analytics` action, default admin): three tabbed suites — **Community** (posts created/published/pending, comments, reports filed ±open/resolved, announcements published), **#Exchange** (items by status, items with a recorded request — count only, category breakdown), **Sharing** (shares, recorded visits, registrations ±unconfirmed, joins, qualified) — one shared filter bar (date from/to + location select + **All time / Last 7 days / Last 24 hours** presets + Clear) whose date range matches each record's own date (creation for posts/exchange/shares, occurrence for events, filing for reports, publish for announcements) and whose location applies only to records that carry one; **every metric card carries its definition + a filter-scope note** ("location not recorded on this record", "shares carry no location", …) so a filter never silently does nothing; **drill-down lists the exact records** behind each figure (posts/comments/reports/exchange items/shares, capped at 25 with "use Export JSON for the full list"); **shares-by-related-campaign** breakdown (campaign vs ordinary-target distinction, §5); **Export JSON** = filtered records + metric definitions + explicit §17-8 export-policy-pending notice — never anything broader; honesty rules preserved (shares ≠ visits ≠ registrations ≠ qualified, pending never counted, unique clicks only when backend-supplied, demo seeds labelled); **Overview (§2D)** gains the same date/location filter bar applying to **metric cards only** — each caption states which filters touched it or why the record type can't honour one (accounts carry no date/location; campaigns carry no date; reports/shares/visits/qualified carry no location), while outstanding work and recent administrative actions always list everything; demo exhibit **p11** (local_info post in **Malvern** — all other records are Worcester) gives the location filter a visible effect; tsc + `vite build` green |
| **J. Config consolidation & §15 verification** | Single configuration surface (categories, hashtags, exchange categories, announcement settings, campaign sharing/referral, QR, leaderboard, rewards link, visibility — §13); **wire remaining toggles into composers** (exchange-type switches); §15 matrix pass: one action observed on all three surfaces | ✅ **DONE** — `/admin/config` rewritten as the single configuration surface with **9 sections**: #Exchange item types (existing toggles + §17-2 note), **Community categories** (new full editor — add / inline-rename / hide-show / reorder via audited `createCategory`/`updateCategory`/`moveCategory`, same store Discover consumes), #Exchange categories (read-only summary + "Manage on #Exchange" link — one editing surface §15), **Hashtags** (new editor over `listHashtags`/`updateHashtag`: Feature/Unfeature + Restrict/Remove restriction, both audited; note that what "restricted" enforces is pending §9), **Announcements** (read-only sweep/targeting/publishing-rights rules + Manage link — no platform-level switches invented), **Campaign sharing/referral/leaderboard/rewards** (read-only per-campaign summary from `getCampaignConfig` + `listRewards` with Manage links to campaign detail — summary, not a second editor §15), report reasons (existing), post types (read-only §9), visibility rules (existing); **exchange composer wired to the type switches** (`ExchangeListPage` consumes `adminConfigService.getConfig()`: disabled types hidden from the composer chips while browse filter tabs keep history, `whoCanCreate` chips locked with Lock icon + "Businesses only — not available for your account" title, no permitted type → amber "submissions closed for your account type" notice + disabled submit, `requiresApproval` on the selected type → honest Info notice stating the review workflow is pending §17-2 and the demo publishes immediately, `openComposer` auto-selects a permitted type); **hashtag flags made visible** (§3.3): new `discoverApi.getHashtag` + "Featured topic"/"Restricted topic" badges + restricted notice on `HashtagPage` — reading the same objects admin edits (§15); **hashtag flags persisted** in `community_admin_config.hashtagFlags` (`setHashtagFlags`/`applyHashtagFlags`, applied on admin + discover reads) so flags survive reloads and the audit record can never disagree with the record (§15/§16 — defect found and fixed during verification: in-memory-only flags reverted on reload while the audit entry persisted); **§15 matrix pass browser-verified end-to-end**: disable 'swap' → config "Disabled" badge + admin #Exchange "Type disabled" badges on both swap items + consumer composer chip absent (re-enabled after); consumer composer with swap enabled → locked business-only chip with lock icon; swap selected as admin → approval notice rendered; restrict #Volunteering → config "Restricted" badge + public hashtag-page badge + notice surviving two full reloads + audit `update hashtag` (unrestricted after); create "Neighbourhood Watch" category → config list + live Discover grid + audit `create category` (hidden after); `/admin/audit` shows `update exchange type config`, `update hashtag`, `create category`; tsc + build green, zero console errors |
| **K. Permissions & audit hardening** | Admin role matrix UI (§17-6), audit filters/search, permission-action audit across all pages (visible vs disabled-with-reason vs denied) | ✅ **DONE** — **role matrix UI (§17-6)**: grants are now data — persisted in `community_admin_role_grants` (`getRoleGrants`/`writeRoleGrants` in `lib/permissions.ts`, seeded from the exported `DEFAULT_GRANTS`, `canAdmin` reads the store) with audited `adminApi.setRoleGrant` / `resetRoleGrants` (`update role grant` / `reset role grants`, before→after on every change); new **"Admin roles & permissions"** section on Configuration (10th section): 16 actions × Admin/Business/Consumer checkbox matrix grouped Moderation/Configuration/Oversight, pending-§17-6 banner (ships seeded admin-only), per-row "No role holds this" warning, Reset-to-defaults action, notes that public visitors hold no admin actions and manager permissions are separate; **permission-action audit across all pages**: section-level **denial** in `AdminLayout` — deep links resolve to their nav item's action (detail routes inherit their list's) and render an honest denied panel (names the required permission, cites §17-6/§5.5, offers audited "Restore default grants" so a matrix edit can never lock admins out) instead of the full page; in-page controls audited and consistent with the established **disabled-with-reason** pattern (`Requires 'X' — role grants pending §17-6` titles on exchange categories/messages, campaign config, rewards templates, user status, group-context buttons; campaign attribution panel hidden as a privacy view panel); `community-role-grants-changed` event re-renders the shell immediately on grant changes (nav updates without navigation); **audit filters/search** on `/admin/audit`: search (action/target/admin/id/details) + action select + target-type select (options derived from recorded entries) + Clear + "N of M entries" count + filtered-empty state ("the full log is unchanged, only this view is filtered"); browser-verified end-to-end: matrix renders 48 checkboxes/16 admin-only defaults → revoke `View audit log` → nav drops Audit Log+Overview immediately (same-page event) and `/admin/audit` deep link shows the denied panel with no entries rendered → restore from the denied panel → sections return + `reset role grants` audit entry → business-column grant/revoke round-trip (`['admin','business']` → `['admin']`) → filters (search "role" 2/9, action 1/9, type hashtag 3/9, clear 9/9); tsc + build green, zero console errors |
| **L. Tests & handoff** | Build-order step 8 E2E journeys + step 9 handoff doc (API requirements per phase, §17 register) | ✅ **DONE** — **E2E journeys** (build-order step 8): Playwright added (`@playwright/test` dev dependency; `playwright.config.ts` with a dedicated dev server on port 5299, desktop + Pixel-5 mobile projects — `*.mobile.spec.ts` mobile-only, everything else desktop; `/api/**` intercepted with an instant 502 so demo fallbacks run fast); **14 tests, all green** across 8 specs under `tests/e2e/` with shared helpers (`demoSignIn`/`formSignIn`/`logOut`, API-blocking fixture): **mobile layouts** (public bottom nav = exactly Home/Discover/#Exchange/Activity/Profile; admin bottom nav 4 primary + More sheet with all 11 remaining sections + View Community; desktop side menu 15 links), **permissions** (signed-out `/admin` → `/auth/login`; consumer `/admin` → Access Denied page; business-only exchange e2 hidden from the public list, visible to businesses), **moderation** (admin rejects published p1 — empty reason refused with the §5.2 error — reason recorded → same record's reason on the business Rejected tab → hidden from the guest feed → audit entry with `Reason:`; one SPA session because demo posts are in-memory §15), **failed actions** (login inline validation one rule at a time + stays on `/auth/login`; duplicate report reason refused with list unchanged), **attribution** (`?ref=e2e-visit-1` → `/api/community/track/visit` attempted → demo fallback persists the pending visit → "Clicks (total)" on `/admin/sharing` increments by exactly 1), **CHS auth return-to-action** (mobile guest Activity/Profile buttons → sign-in form → returns to notifications/profile; desktop Activity prompt Sign in → notifications; header Sign in from Discover → returns to Discover); test fixes along the way proved real behaviours (demo posts reset on hard reload → journeys stay in one session; logout from a protected surface returns to sign-in). **Handoff doc** (build-order step 9): `docs/community-handoff.md` — existing vs. new inventory, full route table with guards (public 22 / auth 2 / business 6 / admin 18 / manager 6), API requirements per area (endpoints already attempted + the local-store structures the backend must own: audit, config, categories, campaign config, managers, membership, notification templates, role grants), localStorage persistence table (27 keys), demo accounts + fixtures, §9 (12 items) + §17 (9 gates) registers restated without answers, test-suite description, known limitations; spec steps 8–9 marked ✅ |

### §17 decision gates mapped to phases

| §17 | Decision | Lands in | Build-now shell |
|------|----------|----------|-----------------|
| 1 | Content approval per type | B | Approve/reject flow (exists); per-type config fields; **schedule shell** (records requested publish time + audit; auto-publication pending — note: announcement scheduling/auto-publish is explicitly part of the admin control spec, built in Phase C; this gate covers *post/content-type* scheduling rules) |
| 2 | Exchange categories/transitions | A/D | Category CRUD (built: management UI on `/admin/exchange`, audited) + status display vocabulary (built: all four states displayed with per-status actions limited to approve/reject/archive/remove — **no transition for completed**, none invented); public visibility of non-active states enforced (author + admin only); type switches (enabled / who-can-create / requires-approval) consumed by the member composer (built in J — approval notice shown to members, **no approval state invented**); the submitted→active transition itself remains open |
| 3 | Attribution windows/dedup | E | Journey UI reading backend statuses (built: §6.6 drill-down displays recorded statuses; unique clicks and windows shown only when backend-supplied, never computed; pending never counted as qualified) |
| 4 | Referral qualification | E/F | Referral table with status columns (built: referrals tab derived from registration events with pending/attributed/qualified/rejected columns + backend window values) + per-campaign criteria UI (built in F: campaign detail stores/displays the *actual configured* criteria text and window as data, editable + audited — frontend never hardcodes or enforces qualification logic) |
| 5 | Reward triggers/claims | H | Reward lifecycle view (**built in H**: `/admin/rewards` Rewards tab — read-only central records with status and qualification text as configured; no trigger, claim or eligibility evaluation exists in Community, §11/§17-5) |
| 6 | Admin roles/permissions | A/H/K | `canAdmin` matrix; default grants all to `admin` (built in H: `configure_notifications` gates notification-template editing; `manage_rewards` gates the rewards surface); **built in K: role matrix UI** — persisted grants (`community_admin_role_grants`) + Configuration matrix section + audited grant/reset + section-level denial with restore, all default admin-only; actual role assignments remain the open decision |
| 7 | Privacy of user/group/message data | D/G | Context panels behind permission gates (built: exchange Messages-context panel behind `view_messages_context` with the §17-7 scope notice; **group-context panel built in G** behind `view_group_context` — group facts + group-origin content + open-report counts, with the Groups & Circles administration boundary note; group *membership* data is not surfaced at all pending this decision) |
| 8 | Metrics/export policy | I | **Built in I**: every metric carries its definition, its record source and a filter-scope note (date range / location, or why a filter cannot apply); `/admin/analytics` **Export JSON** ships only the filtered records + definitions shown on screen with an explicit "export policy pending §17-8" notice — approved scope, recipients and retention remain open |
| 9 | Controls vs linked systems | F/H/J | Links to Campaigns/Groups/Rewards admin (built in F: campaign detail links each campaign reward to its public reward page with the §17-5 triggers-pending notice; contributions remain the fundraising service's; built in H: admin reads central reward records **read-only** — no Community-local reward engine, §11) |
