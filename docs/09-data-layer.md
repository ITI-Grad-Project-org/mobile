# 09 — The Data Layer

Everything under `src/api/`: one RTK Query api, 23 endpoint modules, three
different multipart conventions, a retrying uploader, and the defensive reads that
exist because this backend's responses are not always the shape you expect.

Store-side concerns (tags, cache keys, optimistic updates) are in
[`04-state-management.md`](04-state-management.md). The backend contract itself is
[`07-Uply-endpoints.md`](07-Uply-endpoints.md).

---

## 1. Layout

```
src/api/
├── config.ts          BASE_URL · DASHBOARD_URL
├── baseApi.ts         the single createApi: base query, reauth, tag types
├── tokenRefresh.ts    the one shared refresh promise
├── tenantEpoch.ts     stale-response guard
├── types.ts           ~1000 lines of DTOs, enums and response types
├── pagination.ts      unwrapList / unwrapTotal
├── formData.ts        appendFile / appendFiles / appendFields
├── imagePrep.ts       client-side downscale before upload
├── mediaUpload.ts     native multipart uploader with retry + reauth
├── client.ts          legacy axios instance + uploadImage/uploadDocument
└── endpoints/         23 modules, each injecting into baseApi
```

---

## 2. `baseApi` — the one api

```ts
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [ /* 28 tags — see doc 04 §9 */ ],
  endpoints: () => ({}),          // features inject their own
});
```

There is exactly **one** `createApi` call in the codebase. Every domain module
does `baseApi.injectEndpoints({ … })` and exports its hooks. Never create a second
api — a second one gets its own cache and its own middleware, and tags stop
crossing between them.

`baseQueryWithReauth` wraps `fetchBaseQuery` with the tenant-epoch guard and the
401→refresh→retry→logout ladder, both documented in
[`08-auth-and-tenancy.md`](08-auth-and-tenancy.md).

---

## 3. The endpoint modules

| Module | Surface | Notable |
| --- | --- | --- |
| `auth` | both personas: register/login/google/me/memberships/refresh/logout, 3-step reset, `switchTenant` | `switchTenant` has **no** `invalidatesTags` — deliberate |
| `profile` | `/coaches/me`, `/clients/me`, public coach profile | two *different* multipart conventions (§6) |
| `coachMedia` | avatar, transformation photos, certifications | `queryFn` + native uploader, a **third** convention |
| `tenant` | create, `/tenant/me`, by id/slug, logo | |
| `clients` | coach roster | |
| `directory` | `/coaches/directory` | also tags `CoachProfile` — the payload carries `rating` |
| `invitations` | coach + client sides | client side gated by `CLIENT_INVITATIONS_READY` |
| `joinRequests` | client `/client/me/join-requests`, coach `/join-requests` | client feed tagged `'MINE'` — spans tenants |
| `onboarding` | validate → confirm | |
| `intake` | client intake CRUD | |
| `exercises` | per-tenant library + `initialize-library-from-defaults` | archive = `DELETE`, restore = `/unarchive` |
| `programs` | coach training builder | days are generated; `PUT` sets = full replace |
| `training` | client execution | set outcomes drive `Activity` |
| `foods` · `meals` | per-tenant nutrition libraries | `PATCH { isActive: true }` restores |
| `nutritionPlans` | coach nutrition builder | `PUT` meal items = full replace |
| `nutrition` | client nutrition logging | 409s are meaningful (§9) |
| `measurements` | client history + coach reads + pending-review queue | rows under `docs` |
| `reviews` | public + client's own | optimistic `foldRating` |
| `analytics` | 8 coach-only read routes | `tenantId` is cache-key only |
| `chat` | conversations, messages, read receipts | custom `serializeQueryArgs` |
| `activity` | `/client/me/activity` heat-map | omit `year` for a rolling 365 days |
| `upload` | `DELETE /upload/{key}` + re-exports the legacy uploaders | |

### The shape of an endpoint module

```ts
import { baseApi } from '../baseApi';

export const exercisesEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listExercises: builder.query<any[], { tenantId: string } & ListExercisesQuery>({
      query: ({ category, search }) => ({ url: '/exercises', params: { category, search } }),
      providesTags: (result, error, { tenantId }) => [
        { type: 'Exercises', id: `LIST-${tenantId}` },
        ...(result ?? []).map((ex) => ({ type: 'Exercises' as const, id: `${tenantId}:${ex.id}` })),
      ],
    }),
  }),
});

export const { useListExercisesQuery, useLazyListExercisesQuery } = exercisesEndpoints;
```

Conventions, all enforced by convention rather than tooling:

- One module per backend domain, named `<domain>.endpoints.ts`.
- Endpoint names are `verbNoun` (`getClients`, `publishProgram`, `addExtraSet`).
- Take `tenantId` in the args of anything tenant-scoped, and destructure it out
  before building the request.
- Export both the eager and lazy hooks when a screen might need to prime.
- Comment the **non-obvious** invalidations. Most of the sharp edges in this
  codebase are recorded that way, in the endpoint file, next to the code.

### `any` in response types

Many endpoints are typed `any` or `unknown`. That is not laziness — large parts of
this API ship no OpenAPI response schema, and a fabricated interface would be a
lie the compiler enforces. The house rule:

> **Type what the server documents. Normalise what it doesn't.**

Hence `normalizeOverview`, `normalizeAttention`, `normalizeActivity`,
`normalizePlan`, `normalizeReviews`, `normalizeClientAnalytics`,
`resolveCoachFields`. Each has a dev-only `describe*Shape` that prints the payload
once so the real shape is discoverable from Metro rather than by guesswork.

---

## 4. Reading lists defensively

List endpoints are inconsistent: some return a bare array, and the paginated ones
wrap rows in an envelope whose key **varies by resource** — `docs` on measurements
(counters under `meta`), `data` elsewhere.

```ts
import { unwrapList, unwrapTotal } from '@/api/pagination';

const rows  = unwrapList<Measurement>(result);          // docs|data|items|results|records
const total = unwrapTotal(result, rows.length);         // meta.total ?? total ?? length
```

**Always read lists through these.** Guessing the wrong key returns `[]` with no
error — which is exactly how the coach's check-in queue came back empty while the
API was returning rows.

---

## 5. Naming: `clientId` is a user id

Three id kinds circulate and they are not interchangeable:

| Id | Where it comes from | Where it is accepted |
| --- | --- | --- |
| **user id** | `client.id` on a `/client` row | `/client/{clientId}/measurements`, `/(coach)/chat/[id]` |
| **membershipId** | `/client` row, `/analytics/*` | `/analytics/clients/{membershipId}/progress`, AI `membershipId` scope |
| **tenantId** | membership | cache keys, directory + public profile routes |

`useCoachHomeData` publishes a `clientUserIds: Map<membershipId, userId>` because
crossing them is the single most common 404 in this app.

---

## 6. The three multipart conventions

There is no single convention. Do not share a helper across them.

### A — JSON `data` part + files · `PATCH /coaches/me`

```ts
const form = new FormData();
form.append('data', JSON.stringify(data));           // all scalar fields, JSON-encoded
appendFile(form, 'avatar', avatarUri, 'avatar.jpg');
appendFiles(form, 'transformationPhotos', transformationUris, 'transformation');
appendFiles(form, 'certificateFiles', certificateUris, 'certificate');
```

### B — flat fields + files · `PATCH /clients/me`, measurements

```ts
const form = new FormData();
appendFields(form, fields);                    // scalars as repeated flat parts
appendFiles(form, 'photos', photoUris, 'photo');
```

### C — flat fields + one file, through the native uploader · `/coaches/me/*`

Used by `coachMedia.endpoints.ts` via `queryFn` (§7).

### `formData.ts` helpers

```ts
isRemoteUri(uri)    // https://…  → an already-hosted value, nothing to upload
isLocalFileUri(uri) // file:// ph:// content://  → needs uploading
appendFile(form, field, uri, name?)      // → boolean: was a part written?
appendFiles(form, field, uris, prefix?)  // → number of parts written
appendFields(form, fields)               // drops null/undefined, arrays → repeated parts
```

Two behaviours that matter:

- **Already-hosted URLs are skipped.** Re-uploading a photo the server already has
  would duplicate it. Pass the mixed array as-is; the helper filters.
- **An unreadable URI drops that part** rather than failing the whole save — a
  revoked photo permission or a cleared cache should not lose the user's text.
- `appendFields` **drops `null`/`undefined`**, so a `PATCH` carries only what was
  actually set.

---

## 7. Uploading files

React Native's JS `FormData` transport is unreliable for file bodies — bare
"Network Error", mangled multipart. Both uploaders stream the file **natively**.

### `mediaUpload.ts` — the one to use

```ts
await uploadFile({ path: '/coaches/me/avatar', method: 'PUT',
                   fieldName: 'avatar', fileUri, fields? });
```

| Behaviour | Value |
| --- | --- |
| Timeout | 45s |
| Attempts | 3, backoff `800ms` / `2400ms` |
| Retried statuses | 408, 425, 429, 500, 502, 503, 504 |
| 401 | one `refreshAccessToken()` then a retry |
| Failure | throws `MediaUploadError` with `status` and the API's own `message` |

One file per request. A multi-photo add becomes **N parallel requests** — which is
the better shape anyway: one failure doesn't take the others with it.

Wiring it into RTK Query uses `queryFn`:

```ts
setCoachAvatar: builder.mutation<unknown, { uri: string }>({
  queryFn: async ({ uri }) => {
    try {
      const fileUri = await prepareImage(uri);
      return { data: await uploadFile({ path: '/coaches/me/avatar', method: 'PUT',
                                        fieldName: 'avatar', fileUri }) };
    } catch (e) { return toQueryError(e); }
  },
  invalidatesTags: ['Me'],
}),
```

### `imagePrep.ts` — always downscale first

```ts
prepareImage(uri, { maxEdge = PHOTO_MAX_EDGE, quality = 0.7 })
PHOTO_MAX_EDGE    = 1600   // avatars, transformations, progress photos
DOCUMENT_MAX_EDGE = 2200   // certificates — they get read, keep the text legible
```

- **PDFs and non-images pass through untouched.**
- It renders once with no actions purely to read the real dimensions, because
  resizing blind would *upscale* a small image and make the file bigger.
- An image already under the cap is returned **as-is** — re-encoding would be a
  second lossy JPEG pass over a file the picker already compressed, for no win.
- Results are memoised by `uri|maxEdge|quality`.

### `client.ts` — legacy

An axios instance with its own interceptor-based refresh, plus `uploadImage` /
`uploadImages` / `uploadDocument` against `/upload/*`. Still used for standalone
document uploads. **New work should use `mediaUpload.ts` + RTK Query** — the axios
instance duplicates the refresh logic instead of sharing the single in-flight
promise.

---

## 8. Error handling

RTK Query surfaces `FetchBaseQueryError`:

| `status` | Meaning |
| --- | --- |
| number | HTTP status; `error.data` is the parsed body |
| `'FETCH_ERROR'` | network unreachable |
| `'PARSING_ERROR'` | non-JSON body |
| `'CUSTOM_ERROR'` | this app's stale-tenant discard |

The message extractor used by `SignupFlow` is the pattern to copy — Nest returns
validation errors as a **string array**:

```ts
const body = e?.data;
if (typeof body === 'string' && body.trim()) return body;
if (Array.isArray(body?.message)) return body.message.join('\n');   // Nest validation
if (typeof body?.message === 'string') return body.message;
if (e?.status === 'FETCH_ERROR') return "Couldn't reach the server…";
if (typeof e?.status === 'number') return `Request failed (${e.status}).`;
```

`shared/utils/query.ts` provides `isPending` / `isHardError` so a screen can tell a
real failure from a still-loading state.

---

## 9. Status codes that are *not* errors

Treat these as domain outcomes, not failures:

| Code | Where | Meaning |
| --- | --- | --- |
| **409** | `GET /client/me/nutrition/plans/current` | two published plans cover today — surface the conflict |
| **409** | `POST …/logs/{id}/complete` | a planned meal still has no outcome |
| **409** | add meal to a fully flexible day | not allowed by design |
| **409** | `POST /nutrition/library/foods` | duplicate normalised name+brand — usually an **archived** original; offer to restore |
| **404** | `/analytics/clients/{membershipId}/*` | the membership belongs to another tenant. **Surface it** — rendering an empty state hides a wrong-tenant bug behind "this client did nothing" |
| **400** | `/client/me/activity?year=` | invalid year |

---

## 10. Idempotent starts

Two endpoints are *start-or-resume*, not create:

```
POST /client/me/training/days/{programDayId}/log
POST /client/me/nutrition/days/{dayId}/log
```

Calling them twice is safe and returns the existing log. Screens rely on this —
they call on mount rather than tracking whether a log already exists.

---

## 11. Full-replacement `PUT`s

```
PUT …/exercises/{plannedExerciseId}/sets        body: { sets: [...] }
PUT …/meals/{plannedMealId}/items               body: { items: [...] }
PUT /nutrition/library/meals/{mealId}/items     body: { items: [...] }
```

These are **transactional full replacements, not deltas**. Send every item you
want to keep, in the order you want it. Omitting one deletes it.

Meal-library edits do **not** affect published plans — those snapshotted the meal
at publish time.

---

## 12. Adding an endpoint — checklist

1. Pick the right `*.endpoints.ts` (or create one named for the backend domain).
2. `verbNoun` name, matching the API's own vocabulary.
3. Type the args properly; type the response only as far as the API documents it.
4. Tenant-scoped? Take `tenantId` in the args, destructure it out of the request,
   use it in the tags.
5. `providesTags` for queries; `invalidatesTags` for mutations — including
   **cross-domain** ones (a program write touches `Analytics`; a set outcome
   touches `Activity`).
6. Comment any invalidation whose reason isn't obvious.
7. Export the hook (and the lazy variant if a screen might prime it).
8. Multipart? Match the existing convention for that route (§6) and go through
   `prepareImage` + `uploadFile`.
