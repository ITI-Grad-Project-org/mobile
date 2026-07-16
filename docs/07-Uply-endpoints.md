# 3Keys API — Reference & Integration Guide

**Base URL:** `https://api.74.162.148.3.nip.io`
**Swagger UI:** `https://api.74.162.148.3.nip.io/api/docs` · **OpenAPI JSON:** `/api/docs-json`
**Version:** 1.0 · **Framework:** NestJS · **Auth:** JWT Bearer (`Authorization: Bearer <accessToken>`)

---

## Table of Contents

1. [Auth Model Overview](#auth-model-overview)
2. [Coach Auth](#coach-auth--auth)
3. [Customer (Client) Auth](#customer-auth--authcustomer)
4. [Coaches](#coaches)
5. [Tenants](#tenants)
6. [Clients (coach-side)](#clients-coach-side)
7. [Client Profile (client-side)](#client-profile-client-side)
8. [Client Intake](#client-intake--clientmeintake)
9. [Measurements](#measurements--clientmemeasurements)
10. [Invitations](#invitations)
11. [Reviews](#reviews)
12. [Upload (S3)](#upload-s3)
13. [Health](#health)
14. [Schemas / DTOs](#schemas--dtos)
15. [Integration Guide (RTK Query / Axios)](#integration-guide)

---

## Auth Model Overview

There are **two separate identity flows**:

| Persona | Register/Login prefix | Notes |
|---|---|---|
| **Coach** | `/auth/*` | Registering auto-creates their **tenant** and seeds the exercise library |
| **Customer (client)** | `/auth/customer/*` | Can belong to **multiple tenants** (coaches) and switch between them; supports Google Sign-In |

Both flows issue an **access token + refresh token** pair. Tokens are **tenant-scoped** for customers — switching tenants (`POST /auth/customer/switch-tenant`) returns a *re-scoped* token pair. 🔒 marks endpoints requiring `Authorization: Bearer <token>`.

> ⚠️ The spec does not document response bodies for login/refresh. Verify the exact token payload shape (e.g. `{ accessToken, refreshToken, user }`) with one real call before wiring up the client.

---

## Coach Auth — `/auth`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| POST | `/auth/register` | – | Register a new coach (auto-creates tenant + seeds exercise library) |
| POST | `/auth/login` | – | Login with email & password |
| POST | `/auth/refresh` | 🔒 | Refresh access & refresh tokens |
| POST | `/auth/logout` | 🔒 | Logout & invalidate refresh token |
| POST | `/auth/forgot-password` | – | Request password reset email |
| POST | `/auth/reset-password` | – | Reset password using emailed token |
| GET | `/auth/me` | 🔒 | Current user profile incl. `currentTenant` + memberships |

### POST `/auth/register` — body: `RegisterCoachDto`

Required: `firstName`, `lastName`, `email`, `password` (min 6), `confirmPassword`, `businessName`
Optional: `phone`, `bio`, `specialties[]`, `yearsExperience`, `certifications[]`, `timezone`, `currency`

```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@acme.com",
  "password": "password123",
  "confirmPassword": "password123",
  "businessName": "Iron Temple Coaching"
}
```

Responses: `201` created · `400` validation error · `409` email/phone already in use

### POST `/auth/login` — body: `LoginDto`

`{ "email": "...", "password": "..." }` → `200` ok · `400` validation · `401` invalid credentials

### POST `/auth/refresh` 🔒

Send the **refresh token** as the bearer token. → `200` new token pair · `403` access denied

### POST `/auth/forgot-password` / `/auth/reset-password`

`ForgetPasswordDto` `{ email }` → `200` email sent
`ResetPasswordDto` `{ token, newPassword (min 8) }` → `200` reset · `400` invalid/expired token

---

## Customer Auth — `/auth/customer`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| POST | `/auth/customer/register` | – | Register a new customer account |
| POST | `/auth/customer/login` | – | Customer login (email/password) |
| POST | `/auth/customer/google` | – | Sign in / register with Google ID token (auto-links existing email) |
| POST | `/auth/customer/refresh` | 🔒 | Refresh customer token pair |
| GET | `/auth/customer/memberships` | 🔒 | List tenants this customer belongs to (for switching) |
| POST | `/auth/customer/switch-tenant` | 🔒 | Switch active tenant → re-scoped token pair |
| POST | `/auth/customer/logout` | 🔒 | Logout |
| POST | `/auth/customer/forgot-password` | – | Request password reset email |
| POST | `/auth/customer/reset-password` | – | Reset password via emailed token |
| GET | `/auth/customer/me` | 🔒 | Current customer profile |

### POST `/auth/customer/register` — body: `CreateClientDto`

Required: `firstName`, `lastName`, `email`, `password` (min 6), `confirmPassword` · Optional: `phone`
→ `201` · `400` validation · `409` email/phone in use

### POST `/auth/customer/google` — body: `GoogleAuthDto`

`{ "idToken": "<JWT from Google Sign-In SDK>" }`
→ `200` signed in · `401` invalid token · `403` customer is blocked

### POST `/auth/customer/switch-tenant` — body: `SwitchTenantDto`

`{ "tenantId": "uuid" }` → `200` new tenant-scoped tokens · `403` not a member of this tenant

---

## Coaches

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/coaches/me` | 🔒 | Get my profile |
| PATCH | `/coaches/me` | 🔒 | Update my profile (`UpdateCoachDto`) |
| DELETE | `/coaches/me` | 🔒 | Delete my account |
| GET | `/coaches/{id}` | 🔒 | Get a coach by id (must be yourself) |
| GET | `/coaches/{tenantId}/profile` | – | **Public** coach profile with rating & reviews |

`UpdateCoachDto` (all optional): `firstName`, `lastName`, `email`, `phone`, `bio`, `specialties[]`, `yearsExperience`, `certifications[]`

---

## Tenants

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| POST | `/tenant` | 🔒 | Create a new tenant (`CreateTenantDto`) |
| GET | `/tenant/me` | 🔒 | Get current user's tenant |
| GET | `/tenant/{id}` | 🔒 | Get tenant by ID (must be your own) — `403` otherwise |
| GET | `/tenant/slug/{slug}` | – | Get tenant by slug |

`CreateTenantDto`: required `name`, `slug` · optional `logoUrl`, `timezone`, `currency`
`POST /tenant` → `201` · `400` validation or slug taken

---

## Clients (coach-side)

Coach's view of clients in **their** tenant.

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/client` | 🔒 | List clients in my tenant |
| GET | `/client/{id}` | 🔒 | Get a single client — `404` if not in this tenant |
| DELETE | `/client/{id}` | 🔒 | Remove client from tenant (does **not** delete their account) |

---

## Client Profile (client-side)

The customer managing their own account.

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/clients/me` | 🔒 | Get my profile |
| PATCH | `/clients/me` | 🔒 | Update my profile (`UpdateClientDto`) |
| DELETE | `/clients/me` | 🔒 | Delete my account |

`UpdateClientDto` (all optional): `firstName`, `lastName`, `phone`, `dateOfBirth` (`YYYY-MM-DD`), `gender` (`male`/`female`), `heightCm`

> ⚠️ Note the path asymmetry: coach-side list is **`/client`** (singular), client's own profile is **`/clients/me`** (plural).

---

## Client Intake — `/client/me/intake`

Singleton intake profile per client per active tenant. All 🔒.

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/intake` | Create intake — `409` if already exists |
| GET | `/client/me/intake` | Get intake |
| PATCH | `/client/me/intake` | Update intake |
| DELETE | `/client/me/intake` | Delete intake |

Common errors: `400` no active tenant selected · `404` membership/intake not found

### `CreateClientIntakeDto`

Required: `goal`, `activityLevel`, `trainingExperience`, `availableEquipment[]`, `dietaryPreferences[]`
Optional: `trainingDaysPerWeek` (0–7), `allergies[]`, `medicalConditions[]`, `injuries[]`, `notes`

Enums:
- `goal`: `fat_loss` | `muscle_gain` | `recomposition` | `strength` | `endurance` | `general_health`
- `activityLevel`: `sedentary` | `lightly_active` | `moderately_active` | `very_active` | `athlete`
- `trainingExperience`: `beginner` | `intermediate` | `advanced`
- `availableEquipment`: `none` | `dumbbells` | `barbell` | `kettlebell` | `resistance_bands` | `machines` | `full_gym`
- `dietaryPreferences`: `none` | `halal` | `vegetarian` | `vegan` | `keto` | `low_carb` | `intermittent_fasting`

---

## Measurements — `/client/me/measurements`

Client's body-measurement logs, one per date. All 🔒.

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/measurements` | Create log — `409` if one exists for that date |
| GET | `/client/me/measurements` | List (paginated + date filters) |
| GET | `/client/me/measurements/{id}` | Get one |
| PATCH | `/client/me/measurements/{id}` | Update — `409` on date collision |
| DELETE | `/client/me/measurements/{id}` | Delete |

**List query params:** `page` (default 1), `limit` (default 10), `from` / `to` (`YYYY-MM-DD`)

### `CreateMeasurementDto` / `UpdateMeasurementDto` (all optional)

`measuredAt` (`YYYY-MM-DD`, default today), `weightKg`, `bodyFatPct`, `chestCm`, `waistCm`, `hipsCm`, `armCm`, `thighCm`, `photos[]` (progress photo URLs — upload via `/upload/images` first)

---

## Invitations

Coach invites a client into their tenant by email. All 🔒.

| Method | Path | Summary |
|---|---|---|
| POST | `/invitation` | Invite by email (`CreateInvitationDto`) — `400` if a pending invite exists |
| GET | `/invitation` | List invitations in my tenant |
| GET | `/invitation/{id}` | Get one — `404` if not in this tenant |
| DELETE | `/invitation/{id}` | Revoke a pending invitation |
| GET | `/invitation/token/{token}` | Preview an invitation by token (accept page) |
| POST | `/invitation/token/{token}/accept` | Accept as the logged-in **client** — `400` expired/not pending · `403` addressed to another email |

`CreateInvitationDto`: required `email` · optional `name` (personalizes the email)

**Typical flow:** coach `POST /invitation` → client receives email with token link → app previews via `GET /invitation/token/{token}` → client logs in (customer auth) → `POST /invitation/token/{token}/accept` → client now appears in `GET /client`.

---

## Reviews

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/reviews/me` | 🔒 | List reviews for **my coach tenant** (coach view) |
| GET | `/reviews/coaches/{tenantId}` | – | Public reviews for a coach tenant |
| GET | `/reviews/coaches/{tenantId}/summary` | – | Public rating summary |
| GET | `/coaches/{tenantId}/profile` | – | Public coach profile w/ rating & reviews |
| POST | `/client/me/reviews` | 🔒 | Create my review for the active coach tenant (`CreateReviewDto`) |
| GET | `/client/me/reviews/current` | 🔒 | Get my review for the active tenant |
| PATCH | `/client/me/reviews` | 🔒 | Update my review (`UpdateReviewDto`) |
| DELETE | `/client/me/reviews` | 🔒 | Delete my review |

`CreateReviewDto`: required `rating` (1–5), `comment` · `UpdateReviewDto`: both optional

---

## Upload (S3)

⚠️ These endpoints have **no `security` declared in the spec** — confirm whether they actually require auth.

| Method | Path | Summary |
|---|---|---|
| POST | `/upload/image` | Upload single image — multipart: `file` (binary), `type` (`coach` \| `client`) |
| POST | `/upload/images` | Upload multiple — multipart: `files[]`, `type` |
| DELETE | `/upload/{key}` | Delete image by S3 key |

Responses: `201` uploaded · `400` invalid file or type

---

## Health

| Method | Path | Summary |
|---|---|---|
| GET | `/health` | Health check → `200` `{ status: "ok", info: { database: { status: "up" } }, ... }` · `503` when a dependency (e.g. Redis) is down |

---

## Schemas / DTOs

### `CertificationDto`
| Field | Type | Req | Example |
|---|---|---|---|
| name | string | ✅ | `"NASM CPT"` |
| issuer | string | – | `"NASM"` |
| year | number | – | `2022` |
| credentialUrl | string | – | `"https://nasm.org/verify/123"` |

### Coach `specialties` enum
`strength` | `hypertrophy` | `weight_loss` | `powerlifting` | `crossfit` | `calisthenics` | `nutrition` | `rehab` | `general_fitness`

(Full field lists for `RegisterCoachDto`, `CreateClientDto`, `CreateClientIntakeDto`, `CreateMeasurementDto`, etc. are inlined in their endpoint sections above.)

### TypeScript types (ready to drop into the app)

```ts
export type Specialty =
  | 'strength' | 'hypertrophy' | 'weight_loss' | 'powerlifting'
  | 'crossfit' | 'calisthenics' | 'nutrition' | 'rehab' | 'general_fitness';

export interface Certification {
  name: string;
  issuer?: string;
  year?: number;
  credentialUrl?: string;
}

export interface RegisterCoachDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;        // min 6
  confirmPassword: string;
  businessName: string;
  phone?: string;
  bio?: string;
  specialties?: Specialty[];
  yearsExperience?: number;
  certifications?: Certification[];
  timezone?: string;       // e.g. "Africa/Cairo"
  currency?: string;       // e.g. "EGP"
}

export type Goal =
  | 'fat_loss' | 'muscle_gain' | 'recomposition'
  | 'strength' | 'endurance' | 'general_health';
export type ActivityLevel =
  | 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type Equipment =
  | 'none' | 'dumbbells' | 'barbell' | 'kettlebell'
  | 'resistance_bands' | 'machines' | 'full_gym';
export type DietaryPreference =
  | 'none' | 'halal' | 'vegetarian' | 'vegan' | 'keto' | 'low_carb' | 'intermittent_fasting';

export interface ClientIntakeDto {
  goal: Goal;
  activityLevel: ActivityLevel;
  trainingExperience: TrainingExperience;
  availableEquipment: Equipment[];
  dietaryPreferences: DietaryPreference[];
  trainingDaysPerWeek?: number; // 0–7
  allergies?: string[];
  medicalConditions?: string[];
  injuries?: string[];
  notes?: string;
}

export interface MeasurementDto {
  measuredAt?: string;   // 'YYYY-MM-DD', defaults to today
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
  photos?: string[];
}
```

---

## Integration Guide

### RTK Query base setup (fits your Redux Toolkit stack)

```ts
// baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { setTokens, logout } from './authSlice';
import type { RootState } from './store';

const BASE_URL = 'https://api.74.162.148.3.nip.io';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Auto-refresh on 401: retries the failed request once with new tokens.
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const { refreshToken, persona } = (api.getState() as RootState).auth;
      const refreshPath = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';

      const refresh = await rawBaseQuery(
        {
          url: refreshPath,
          method: 'POST',
          headers: { Authorization: `Bearer ${refreshToken}` }, // refresh token as bearer
        },
        api,
        extraOptions,
      );

      if (refresh.data) {
        api.dispatch(setTokens(refresh.data as any));
        result = await rawBaseQuery(args, api, extraOptions); // retry original
      } else {
        api.dispatch(logout());
      }
    }
    return result;
  };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Tenant', 'Clients', 'Intake', 'Measurements', 'Invitations', 'Reviews'],
  endpoints: () => ({}),
});
```

### Example endpoint slice

```ts
// measurementsApi.ts
import { baseApi } from './baseApi';
import type { MeasurementDto } from './types';

export const measurementsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listMeasurements: build.query<any, { page?: number; limit?: number; from?: string; to?: string }>({
      query: (params) => ({ url: '/client/me/measurements', params }),
      providesTags: ['Measurements'],
    }),
    createMeasurement: build.mutation<any, MeasurementDto>({
      query: (body) => ({ url: '/client/me/measurements', method: 'POST', body }),
      invalidatesTags: ['Measurements'],
    }),
  }),
});

export const { useListMeasurementsQuery, useCreateMeasurementMutation } = measurementsApi;
```

### Multipart upload (Expo / React Native)

```ts
const uploadImage = async (uri: string, type: 'coach' | 'client', accessToken: string) => {
  const form = new FormData();
  form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
  form.append('type', type);

  const res = await fetch(`${BASE_URL}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }, // don't set Content-Type manually
    body: form,
  });
  return res.json();
};
```

### Integration checklist

- [ ] Store `persona` (`coach` | `customer`) alongside tokens — refresh paths differ.
- [ ] Persist tokens in `expo-secure-store`, not AsyncStorage.
- [ ] On customer tenant switch, **replace both tokens** and reset/invalidate all tenant-scoped RTK Query cache (`api.util.resetApiState()` or targeted `invalidatesTags`).
- [ ] Handle `409` distinctly (duplicate email, duplicate measurement date, existing intake) — these are UX cases, not generic errors.
- [ ] Handle `400 "no active tenant selected"` on all `/client/me/*` routes by routing the user to tenant selection.
- [ ] Confirm the actual login/refresh **response body shape** — not documented in the spec.
- [ ] Confirm whether `/upload/*` requires auth (no `security` in spec).
- [ ] Progress photos: upload via `/upload/images` first, then pass returned URLs in `photos[]` when creating a measurement.
