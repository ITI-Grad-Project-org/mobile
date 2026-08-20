# 3Keys API — Reference & Integration Guide

**Base URL:** `https://api.74.162.148.3.nip.io`
**Swagger UI:** `/api/docs` · **OpenAPI JSON:** `/api/docs-json`
**Spec version:** `1.0` · **NestJS** · **Auth:** JWT Bearer (`Authorization: Bearer <accessToken>`)
**Coverage:** 79 paths · 102 operations · 38 schemas

> 🔒 = requires a bearer token.

---

## Table of Contents

1. [What Changed Since the Last Version](#what-changed-since-the-last-version)
2. [Concepts & Domain Model](#concepts--domain-model)
3. [Auth Model Overview](#auth-model-overview)
4. [Coach Auth](#1-coach-auth--auth)
5. [Customer Auth](#2-customer-auth--authcustomer)
6. [Coaches](#3-coaches--coaches)
7. [Coach Directory](#4-coach-directory--coachesdirectory-new)
8. [Tenants](#5-tenants--tenant)
9. [Clients (coach-side)](#6-clients-coach-side--client)
10. [Client Profile](#7-client-profile--clientsme)
11. [Client Intake](#8-client-intake--clientmeintake)
12. [Invitations](#9-invitations--invitation) · [Onboarding](#9b-onboarding--clientmeonboarding-new)
13. [Join Requests](#10-join-requests-new)
14. [Exercise Library](#11-exercise-library--exercises-new)
15. [Training Programs — Coach](#12-training-programs--coach--planstrainingclient-programs-new)
16. [Training — Client](#13-training--client--clientmetraining-new)
17. [Measurements](#14-measurements--clientmemeasurements)
18. [Reviews](#15-reviews)
19. [Upload](#16-upload--upload)
20. [Health](#17-health)
21. [WebSocket gateways](#18-websocket-gateways--not-rest)
22. [Enum Reference](#enum-reference)
23. [TypeScript Types](#typescript-types)
24. [Integration Guide](#integration-guide)

---

## What Changed Since the Last Version

### ⚠️ Breaking changes (fix these first)

| # | Change | Action required |
|---|---|---|
| 1 | **Password reset is now a 3-step OTP flow.** `ResetPasswordDto` no longer takes `token` — it takes **`resetToken`**, obtained from a new `/verify-reset-otp` step. | Add the OTP screen; rename `token` → `resetToken` |
| 2 | **`RegisterCoachDto` slimmed down.** `phone`, `bio`, `specialties`, `yearsExperience`, `certifications` were **removed** from registration. | Move those to a post-signup `PATCH /coaches/me` step |
| 3 | **The token-link invitation accept flow was removed.** `GET /invitation/token/{token}` and `POST /invitation/token/{token}/accept` are gone, along with `AcceptInvitationDto`. Clients now redeem a **6-digit code** via `POST /client/me/onboarding/validate` + `/confirm`. | Replace the deep-link accept screen with a 6-digit code input |
| 4 | **`CreateClientIntakeDto` required fields reduced** to `goal` + `trainingExperience`. `activityLevel`, `availableEquipment`, `dietaryPreferences` are now optional. | Relax client-side validation |
| 5 | **`CertificationDto.year` (number) → `issueDate` / `expiryDate`** (date strings), plus new `fileUrl`. | Update the certifications form |
| 6 | **Enums widened** — `gender` gained `other`; `goal` gained `yoga_mobility`; `specialties` gained `mobility`, `postpartum`, `yoga`; `dietaryPreferences` gained `omnivore`, `kosher`, `pescatarian`, `gluten_free`. | Regenerate union types |

### ✨ New feature areas

| Area | Endpoints | What it does |
|---|---|---|
| **Training Programs (coach)** | 16 | Full builder: draft → days → exercises → sets → publish, plus reschedule/cancel and log review |
| **Training (client)** | 12 | Execution: calendar, start/resume workout, log sets, extra sets, complete, skip |
| **Exercise Library** | 6 | Per-tenant exercise CRUD, seedable from defaults |
| **Join Requests** | 6 | Client applies to a coach; coach approves/rejects |
| **Coach Directory** | 2 | Browse/search coaches accepting new clients |
| **Onboarding** | 2 | 6-digit code redemption — the single entry path for both invitations and approved join requests |
| **Reset OTP** | 2 | `verify-reset-otp` for both personas |

### 🔧 Field additions to existing DTOs

- **`UpdateCoachDto`** — large expansion: `avatarUrl`, `age`, `gender`, `location`, `careerExperience`, `portfolioUrl`, `transformationPhotos[]`, `featuredReviews`, `offlineAvailability`, `availabilityHours`, `priceFrom`, `priceTo`
- **`UpdateClientDto`** — added `weightKg`, `avatarUrl`
- **`CreateClientIntakeDto`** — added `focusAreas[]`, `trainingStyles[]`

---

## Concepts & Domain Model

```
Coach ──owns──> Tenant ──has──> Exercise Library
                  │
                  ├──> Memberships ──> Clients
                  │        ▲
                  │        └── activated by Onboarding (6-digit code), reached via:
                  │              ├── Invitation   (coach invites by email)
                  │              └── Join Request (client applies from directory, coach approves)
                  │
                  └──> Client Programs (per membership)
                         └── Program Days (dated)
                               └── Planned Exercises (ordered, superset-able)
                                     └── Prescribed Sets
                                           └── Logged Sets (client's actuals)
```

**Key ideas:**

- A **tenant** is a coach's workspace. Coaches get one automatically at registration.
- A **membership** links a client to a tenant. `membershipId` — not `clientId` — is what programs are assigned to.
- Clients can belong to **multiple tenants** and switch the active one; tokens are tenant-scoped.
- Programs follow a **lifecycle**: `draft` → `published` → (`cancelled`). Drafts are freely editable; published programs are locked apart from reschedule/cancel.
- Programs are **dated**, not relative. `startDate` + `durationWeeks` generate concrete calendar days — you don't create days, you update the generated ones.

---

## Auth Model Overview

Two separate identity systems, each with its own token pair:

| Persona | Prefix | Notes |
|---|---|---|
| **Coach** | `/auth/*` | Registration auto-creates the tenant and seeds the exercise library |
| **Customer (client)** | `/auth/customer/*` | Multi-tenant, switchable; supports Google Sign-In |

**Refresh:** send the **refresh token** as the bearer on `POST /auth/refresh` (or `/auth/customer/refresh`).

> ⚠️ The spec documents no response bodies for login/refresh. Confirm the actual shape (likely `{ accessToken, refreshToken, ... }`) with one live call.

### Password reset — 3 steps (changed)

```
1. POST /auth/forgot-password       { email }                    → emails a 6-digit code
2. POST /auth/verify-reset-otp      { email, otp }               → { resetToken }  (single-use)
3. POST /auth/reset-password        { resetToken, newPassword }  → done
```

The identical flow exists under `/auth/customer/*` for clients.

---

## 1. Coach Auth — `/auth`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| POST | `/auth/register` | – | Register a coach (auto-creates tenant + seeds exercise library) |
| POST | `/auth/login` | – | Login |
| POST | `/auth/refresh` | 🔒 | Refresh token pair |
| POST | `/auth/logout` | 🔒 | Logout & invalidate refresh token |
| POST | `/auth/forgot-password` | – | Email a 6-digit reset code |
| POST | `/auth/verify-reset-otp` | – | **NEW** — exchange code for a reset token |
| POST | `/auth/reset-password` | – | Set new password using the reset token |
| GET | `/auth/me` | 🔒 | Current profile incl. `currentTenant` + memberships |

### POST `/auth/register` — `RegisterCoachDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| firstName | string | ✅ | |
| lastName | string | ✅ | |
| email | string | ✅ | |
| password | string | ✅ | min 6 |
| confirmPassword | string | ✅ | |
| businessName | string | ✅ | Becomes the coach's tenant |
| timezone | string | – | e.g. `Africa/Cairo` |
| currency | string | – | e.g. `EGP` |

```json
{
  "firstName": "Jane", "lastName": "Smith",
  "email": "jane@acme.com",
  "password": "password123", "confirmPassword": "password123",
  "businessName": "Iron Temple Coaching"
}
```

`201` created · `400` validation · `409` email/phone in use

> ⚠️ **Changed:** `phone`, `bio`, `specialties`, `yearsExperience`, `certifications` are gone from registration — set them afterwards via `PATCH /coaches/me`.

### POST `/auth/login` — `LoginDto`

`{ email, password }` → `200` · `400` validation · `401` invalid credentials

### POST `/auth/verify-reset-otp` — `VerifyResetOtpDto` **(NEW)**

| Field | Type | Req | Notes |
|---|---|---|---|
| email | string | ✅ | |
| otp | string | ✅ | 6-digit code from the email, e.g. `"482913"` |

`200` returns a single-use `resetToken` · `403` invalid, expired, or exhausted code

### POST `/auth/reset-password` — `ResetPasswordDto` ⚠️ changed

| Field | Type | Req | Notes |
|---|---|---|---|
| resetToken | string | ✅ | Single-use ticket from `/verify-reset-otp` (was `token`) |
| newPassword | string | ✅ | min 8 |

---

## 2. Customer Auth — `/auth/customer`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| POST | `/auth/customer/register` | – | Register a customer |
| POST | `/auth/customer/login` | – | Login |
| POST | `/auth/customer/google` | – | Sign in / register with a Google ID token |
| POST | `/auth/customer/refresh` | 🔒 | Refresh token pair |
| GET | `/auth/customer/memberships` | 🔒 | List tenants this customer belongs to |
| POST | `/auth/customer/switch-tenant` | 🔒 | Switch active tenant → re-scoped tokens |
| POST | `/auth/customer/logout` | 🔒 | Logout |
| POST | `/auth/customer/forgot-password` | – | Email a 6-digit code |
| POST | `/auth/customer/verify-reset-otp` | – | **NEW** — exchange code for reset token |
| POST | `/auth/customer/reset-password` | – | Set new password |
| GET | `/auth/customer/me` | 🔒 | Current customer profile |

**`CreateClientDto`** — required: `firstName`, `lastName`, `email`, `password` (min 6), `confirmPassword` · optional: `phone`
→ `201` · `400` validation · `409` email/phone in use

**`GoogleAuthDto`** — `{ idToken }` from the Google Sign-In SDK. An existing account with the same email is auto-linked. → `200` · `401` invalid token · `403` customer is blocked

**`SwitchTenantDto`** — `{ tenantId }` (uuid). → `200` re-scoped tokens · `403` not a member of this tenant
---

## 3. Coaches — `/coaches`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/coaches/me` | 🔒 | Get my profile |
| PATCH | `/coaches/me` | 🔒 | Update my profile |
| DELETE | `/coaches/me` | 🔒 | Delete my account |
| GET | `/coaches/{id}` | 🔒 | Get coach by id (must be yourself) |
| GET | `/coaches/{tenantId}/profile` | – | Public profile with rating & reviews |

### PATCH `/coaches/me` — `UpdateCoachDto` (all optional) ⚠️ heavily expanded

| Field | Type | Notes |
|---|---|---|
| firstName, lastName | string | |
| avatarUrl | string | **NEW** |
| phone | string | |
| age | number | **NEW** — 16–100 |
| gender | enum | **NEW** — `male` \| `female` \| `other` |
| location | string | **NEW** |
| specialties | enum[] | ⚠️ widened — see [Enum Reference](#enum-reference) |
| yearsExperience | number | 0–70 |
| careerExperience | string | **NEW** — free text |
| certifications | `CertificationDto[]` | ⚠️ shape changed |
| portfolioUrl | string | **NEW** |
| transformationPhotos | string[] | **NEW** — upload via `/upload/images` first |
| featuredReviews | string | **NEW** |
| bio | string | |
| offlineAvailability | enum | **NEW** — `yes` \| `no` \| `hybrid` |
| availabilityHours | string | **NEW** |
| priceFrom, priceTo | number | **NEW** |

### `CertificationDto` ⚠️ changed

| Field | Type | Req | Notes |
|---|---|---|---|
| name | string | ✅ | |
| issuer | string | – | |
| issueDate | string | – | **NEW** (`YYYY-MM-DD`) — replaced `year` |
| expiryDate | string | – | **NEW** |
| fileUrl | string | – | **NEW** — scanned certificate |
| credentialUrl | string | – | Public verification link |

---

## 4. Coach Directory — `/coaches/directory` **(NEW)**

Client-facing discovery. Both endpoints 🔒.

| Method | Path | Summary |
|---|---|---|
| GET | `/coaches/directory` | Browse coaches accepting new clients |
| GET | `/coaches/directory/{tenantId}` | View a single coach profile — `404` not found |

**Query params for browse:**

| Param | Type | Default | Notes |
|---|---|---|---|
| search | string | – | Free-text on coach name or business name |
| specialty | enum | – | See specialty enum |
| page | number | 1 | |
| limit | number | 20 | max **50** |

```
GET /coaches/directory?search=marco&specialty=strength&page=1&limit=20
```

---

## 5. Tenants — `/tenant`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| POST | `/tenant` | 🔒 | Create tenant — `400` validation or slug taken |
| GET | `/tenant/me` | 🔒 | Current user's tenant — `404` |
| GET | `/tenant/{id}` | 🔒 | By ID (must be yours) — `403` not yours · `404` |
| GET | `/tenant/slug/{slug}` | 🔒 | By slug — `404` |

**`CreateTenantDto`** — required `name`, `slug` · optional `logoUrl`, `timezone`, `currency`

---

## 6. Clients (coach-side) — `/client`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/client` | 🔒 | List clients in my tenant |
| GET | `/client/{id}` | 🔒 | Get one — `404` not in this tenant |
| DELETE | `/client/{id}` | 🔒 | Remove from tenant (their account survives) |

---

## 7. Client Profile — `/clients/me`

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/clients/me` | 🔒 | Get my profile |
| PATCH | `/clients/me` | 🔒 | Update my profile |
| DELETE | `/clients/me` | 🔒 | Delete my account |

**`UpdateClientDto`** (all optional): `firstName`, `lastName`, `phone`, `dateOfBirth` (`YYYY-MM-DD`), `gender` (`male`\|`female`\|`other` ⚠️), `heightCm`, **`weightKg`** (NEW), **`avatarUrl`** (NEW)

> ⚠️ Path asymmetry persists: coach-side list is **`/client`** (singular); the client's own profile is **`/clients/me`** (plural).

---

## 8. Client Intake — `/client/me/intake`

Singleton per client per active tenant. All 🔒.

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/intake` | Create — `409` already exists |
| GET | `/client/me/intake` | Get |
| PATCH | `/client/me/intake` | Update |
| DELETE | `/client/me/intake` | Delete |

Common errors: `400` no active tenant selected · `404` membership or intake not found

### `CreateClientIntakeDto` ⚠️ requirements relaxed

| Field | Type | Req | Notes |
|---|---|---|---|
| goal | enum | ✅ | ⚠️ gained `yoga_mobility` |
| trainingExperience | enum | ✅ | `beginner` \| `intermediate` \| `advanced` |
| activityLevel | enum | – | ⚠️ was required |
| trainingDaysPerWeek | number | – | 0–7 |
| focusAreas | enum[] | – | **NEW** — `strength` \| `yoga` \| `cardio` \| `weight_loss` \| `mobility` |
| trainingStyles | enum[] | – | **NEW** — `strength` \| `hypertrophy` \| `cardio` \| `hiit` \| `mobility` \| `yoga` |
| availableEquipment | enum[] | – | ⚠️ was required |
| dietaryPreferences | enum[] | – | ⚠️ was required; widened |
| allergies | string[] | – | |
| medicalConditions | string[] | – | |
| injuries | string[] | – | |
| notes | string | – | |

`UpdateClientIntakeDto` — same fields, all optional.

---

## 9. Invitations — `/invitation`

Coach-side management only. All 🔒.

| Method | Path | Summary |
|---|---|---|
| POST | `/invitation` | Invite by email — `400` a pending invitation already exists |
| GET | `/invitation` | List invitations in my tenant |
| GET | `/invitation/{id}` | Get one — `404` not in this tenant |
| DELETE | `/invitation/{id}` | Revoke a pending invitation — `404` |

**`CreateInvitationDto`** — required `email` · optional `name` (personalises the email)

> ⚠️ **Removed:** `GET /invitation/token/{token}` and `POST /invitation/token/{token}/accept` no longer exist. Clients now redeem a **6-digit code** through [Onboarding](#9b-onboarding--clientmeonboarding-new) instead of a magic-link token.

---

## 9b. Onboarding — `/client/me/onboarding` **(NEW)**

How a client actually joins a tenant. Replaces the old token-link accept flow, and also handles join-request approvals — one code path for both. Both endpoints 🔒 (the client must be logged in).

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/onboarding/validate` | Check a code without joining yet |
| POST | `/client/me/onboarding/confirm` | Join the tenant, optionally sending intake |

### POST `/client/me/onboarding/validate` — `ValidateOnboardingDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| code | string | ✅ | 6-digit code from the invite **or approval** email, e.g. `"482013"` |

`200` code is valid — returns the tenant it unlocks · `400` invalid or expired code

Use this to show a "You're joining **Iron Temple Coaching**" confirmation screen before committing.

### POST `/client/me/onboarding/confirm` — `ConfirmOnboardingDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| code | string | ✅ | Same 6-digit code |
| intake | `CreateClientIntakeDto` | – | Optionally submit intake in the same call |

`200` joined; membership activated · `400` invalid or expired code

**Flow:** coach `POST /invitation` (or approves a join request) → client receives a 6-digit code by email → client logs in → `validate` (preview the tenant) → `confirm` (join, optionally with intake) → client appears in `GET /client`.

> The code arrives by **email**, not as a link. Your accept screen is now a 6-digit input, not a deep-link handler.

---

## 10. Join Requests **(NEW)**

The inverse of invitations: the client finds a coach in the directory and applies.

### Client side — `/client/me/join-requests` (all 🔒)

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/join-requests` | Ask to train with a coach |
| GET | `/client/me/join-requests` | List my pending & rejected requests |
| DELETE | `/client/me/join-requests/{id}` | Withdraw an unanswered request — `404` |

**`CreateJoinRequestDto`**

| Field | Type | Req | Notes |
|---|---|---|---|
| tenantId | string (uuid) | ✅ | Tenant of the coach chosen in the directory |
| message | string | – | Short note the coach reads when deciding |

`201` sent · `400` already a member, or a request is pending · `403` coach not accepting new clients · `404` coach not found

### Coach side — `/join-requests` (all 🔒)

| Method | Path | Summary |
|---|---|---|
| GET | `/join-requests` | List clients awaiting a decision in my tenant |
| POST | `/join-requests/{id}/approve` | Approve → activates the membership |
| POST | `/join-requests/{id}/reject` | Turn down |

Both actions: `200` ok · `404` pending request not found in this tenant

> Two paths into a tenant exist, but they now **converge**: invitations are coach-initiated, join requests are client-initiated, and both end with the client redeeming a 6-digit code via [`/client/me/onboarding/confirm`](#9b-onboarding--clientmeonboarding-new). Build that redemption screen once and both flows are covered.
---

## 11. Exercise Library — `/exercises` **(NEW)**

Per-tenant, coach-managed. All 🔒.

| Method | Path | Summary |
|---|---|---|
| POST | `/exercises/initialize-library-from-defaults` | Seed the library from system defaults |
| POST | `/exercises` | Create an exercise |
| GET | `/exercises` | List / filter |
| GET | `/exercises/{exerciseId}` | Get one |
| PATCH | `/exercises/{exerciseId}` | Update |
| DELETE | `/exercises/{exerciseId}` | **Archive** (soft delete) |

**List query params:** `category` (enum), `primaryMuscle` (enum), `search` (case-insensitive name), `includeInactive` (bool, default `false`)

### `CreateExerciseDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| name | string | ✅ | e.g. `"Romanian Deadlift"` |
| category | enum | ✅ | `strength` \| `cardio` \| `mobility` \| `plyometric` \| `core` |
| primaryMuscle | enum | ✅ | See muscle enum |
| instructionSteps | string[] | ✅ | Ordered coaching cues |
| secondaryMuscles | enum[] | – | |
| equipment | enum[] | – | |
| demoVideoUrl | string | – | |
| demoGifUrl | string | – | |
| thumbnailUrl | string | – | |

`UpdateExerciseDto` — same fields, all optional.

```json
{
  "name": "Romanian Deadlift",
  "category": "strength",
  "primaryMuscle": "hamstrings",
  "secondaryMuscles": ["glutes", "back"],
  "equipment": ["barbell"],
  "instructionSteps": [
    "Stand with feet hip-width apart holding the bar",
    "Hinge at the hips, keeping the back flat",
    "Lower the bar along the legs to mid-shin",
    "Drive the hips forward to return to standing"
  ]
}
```

> Registration already seeds a library for new coaches. `initialize-library-from-defaults` is for re-seeding or for tenants created manually via `POST /tenant`.

---

## 12. Training Programs — Coach — `/plans/training/client-programs` **(NEW)**

The program builder. All 🔒.

### Lifecycle

```
POST (create draft) → build days / exercises / sets → POST /publish
                                                          ↓
                                          POST /reschedule   |   POST /cancel
```

Drafts are editable; published programs are largely locked (`409` on edit attempts).

### Program-level

| Method | Path | Summary |
|---|---|---|
| POST | `/plans/training/client-programs` | Create a dated draft |
| GET | `/plans/training/client-programs` | List programs in my tenant |
| GET | `/plans/training/client-programs/{programId}` | Get the ordered builder tree — `404` |
| PATCH | `/plans/training/client-programs/{programId}` | Update draft metadata — `404` · `409` no longer a draft |
| DELETE | `/plans/training/client-programs/{programId}` | Archive from normal coach lists |
| POST | `/plans/training/client-programs/{programId}/publish` | Publish — `400` incomplete · `409` lifecycle/overlap conflict |
| POST | `/plans/training/client-programs/{programId}/reschedule` | Reschedule a future published program — `409` |
| POST | `/plans/training/client-programs/{programId}/cancel` | Cancel — `409` already cancelled |

**List query params:** `membershipId` (uuid), `status` (`draft`\|`published`\|`cancelled`), `goal` (enum), `difficulty` (enum), `search` (program name), `isArchived` (bool, default `false`)

#### `CreateClientProgramDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| membershipId | string (uuid) | ✅ | **Membership**, not client id |
| name | string | ✅ | max 150 |
| durationWeeks | number | ✅ | 1–52 |
| startDate | string (date) | ✅ | `YYYY-MM-DD` |
| description | string | – | |
| goal | enum | – | incl. `yoga_mobility` |
| difficulty | enum | – | `beginner` \| `intermediate` \| `advanced` |

**`UpdateClientProgramDto`** — `name`, `description`, `goal`, `difficulty`, `startDate` (all optional; drafts only)
**`RescheduleClientProgramDto`** — `{ startDate }` (required)

### Days

| Method | Path | Summary |
|---|---|---|
| PATCH | `.../{programId}/days/{programDayId}` | Update title, notes, or rest status |
| GET | `.../{programId}/days/{programDayId}/log` | Review the day beside its canonical workout log |

**`UpdateProgramDayDto`** (all optional): `name` (max 150), `notes`, `isRestDay` (bool)
Errors: `400` invalid day update · `404` editable program day not found · `409` rest or published-day conflict

> Days are **generated** from `startDate` + `durationWeeks`. You don't create them — you update the ones that exist.

### Exercises within a day

| Method | Path | Summary |
|---|---|---|
| POST | `.../days/{programDayId}/exercises/from-library` | Add an existing library exercise |
| POST | `.../days/{programDayId}/exercises/create-in-library` | Create a reusable exercise **and** prescribe it |
| PATCH | `.../exercises/{plannedExerciseId}` | Update or reorder |
| DELETE | `.../exercises/{plannedExerciseId}` | Delete and compact positions |
| PUT | `.../exercises/{plannedExerciseId}/sets` | Replace **all** prescribed sets |

#### `PrescribeExerciseDto` (from-library)

| Field | Type | Req | Notes |
|---|---|---|---|
| exerciseId | string (uuid) | ✅ | From the tenant library |
| sets | `PrescribedSetDto[]` | ✅ | One entry per set, in order |
| position | number | – | Default: append to end of day |
| supersetGroup | number | – | Exercises sharing a group form a superset |
| restSeconds | number | – | default `90` |
| tempo | string | – | e.g. `"3-1-1-0"` |
| coachNotes | string | – | The blue "Coach note" banner |

`201` added · `400` invalid prescription or position · `404` day or exercise not found · `409` rest or published-day conflict

#### `PrescribedSetDto` (all optional)

| Field | Type | Notes |
|---|---|---|
| setType | enum | `working` (default) \| `warmup` \| `drop_set` \| `amrap` \| `to_failure` |
| repsMin | number | Required unless time-based or `amrap`/`to_failure`/`drop_set` |
| repsMax | number | Omit ⇒ fixed reps |
| durationSeconds | number | Time-based alternative (planks, cardio) |
| weightKg | number | Omit ⇒ bodyweight / open |
| intensityType | enum | `rpe` \| `rir` \| `percent_1rm` |
| intensityValue | number | RPE 8.5 / RIR 2 / 75 (%1RM) |

#### `CreateAndPrescribeExerciseDto` (create-in-library)

```json
{
  "exercise":     { /* CreateExerciseDto */ },
  "prescription": { /* InlineExercisePrescriptionDto = PrescribeExerciseDto minus exerciseId */ }
}
```

`201` created and prescribed · `400` invalid · `404` editable day not found · `409` rest-day or duplicate-name conflict

**`UpdatePlannedExerciseDto`** (all optional): `position` (≥1), `supersetGroup` (≥1), `restSeconds` (≥0), `tempo`, `coachNotes`
**`ReplacePlannedSetsDto`**: `{ sets: PrescribedSetDto[] }` — a **full replacement**, not a patch. Send every set you want to keep.

### Log review

| Method | Path | Summary |
|---|---|---|
| GET | `.../{programId}/logs` | All workout logs for the program — `404` |

### Full prescription example

```json
{
  "exerciseId": "…uuid…",
  "restSeconds": 120,
  "tempo": "3-1-1-0",
  "supersetGroup": 1,
  "coachNotes": "Keep the bar close to your shins.",
  "sets": [
    { "setType": "warmup",  "repsMin": 10, "weightKg": 40 },
    { "setType": "working", "repsMin": 8, "repsMax": 10, "weightKg": 70,
      "intensityType": "rpe", "intensityValue": 8 },
    { "setType": "amrap",   "weightKg": 60 }
  ]
}
```

---

## 13. Training — Client — `/client/me/training` **(NEW)**

Workout execution. All 🔒.

### Reading the plan

| Method | Path | Summary |
|---|---|---|
| GET | `/client/me/training/programs` | My published programs |
| GET | `/client/me/training/programs/current` | Currently active program — `404` |
| GET | `/client/me/training/programs/{programId}` | Full published program — `404` |
| GET | `/client/me/training/calendar` | Calendar in an inclusive range |
| GET | `/client/me/training/days/{programDayId}` | One day's prescription — `404` |

**Calendar params (both required):** `from`, `to` — `YYYY-MM-DD`, inclusive. `400` on an invalid range.

```
GET /client/me/training/calendar?from=2026-07-01&to=2026-07-31
```

### Executing a workout

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/training/days/{programDayId}/log` | Start **or resume** a workout log |
| POST | `/client/me/training/days/{programDayId}/skip` | Skip the day |
| GET | `/client/me/training/logs/{logId}` | Get a log |
| PATCH | `/client/me/training/logs/{logId}/sets/{loggedSetId}` | Submit actuals for a prescribed set |
| POST | `/client/me/training/logs/{logId}/extra-sets` | Add an extra set |
| DELETE | `/client/me/training/logs/{logId}/extra-sets/{loggedSetId}` | Remove an extra set |
| POST | `/client/me/training/logs/{logId}/complete` | Finalize the log |

**Typical sequence:**

```
POST /days/{programDayId}/log            → log with pre-created logged sets
PATCH /logs/{logId}/sets/{loggedSetId}   → once per set as the client trains
POST /logs/{logId}/extra-sets            → optional bonus sets
POST /logs/{logId}/complete              → finalize (409 if sets still pending)
```

`POST /log` is idempotent — it starts a new log or resumes the existing one, so it's safe to call whenever the client opens the day.

#### `UpdatePrescribedLoggedSetDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| outcome | enum | ✅ | `completed` \| `partial` \| `skipped` |
| reps | number | – | |
| weightKg | number | – | |
| durationSeconds | number | – | |
| rpe | number | – | 1–10 |

`400` invalid outcome or actual values · `404` log or set not found · `409` log is finalized

#### `CreateExtraLoggedSetDto`

| Field | Type | Req | Notes |
|---|---|---|---|
| loggedExerciseId | string (uuid) | ✅ | Prescribed logged exercise receiving the extra set |
| outcome | enum | ✅ | `completed` \| `partial` (no `skipped`) |
| reps, weightKg, durationSeconds, rpe | number | – | As above |

#### `CompleteWorkoutDto` (all optional)

| Field | Type | Notes |
|---|---|---|
| durationMinutes | number | 1–32767 |
| clientNotes | string | max 5000 |
| overallRpe | number | 1–10 |

`409` if sets are still pending or the log is already finalized.
---

## 14. Measurements — `/client/me/measurements`

All 🔒. One log per date.

| Method | Path | Summary |
|---|---|---|
| POST | `/client/me/measurements` | Create — `409` date already logged |
| GET | `/client/me/measurements` | List (paginated + date filters) |
| GET | `/client/me/measurements/{id}` | Get one |
| PATCH | `/client/me/measurements/{id}` | Update — `409` date collision |
| DELETE | `/client/me/measurements/{id}` | Delete |

**List params:** `page` (default 1), `limit` (default 10), `from`, `to` (`YYYY-MM-DD`)
Common errors: `400` no active tenant selected · `404` membership or measurement not found

**`CreateMeasurementDto` / `UpdateMeasurementDto`** (all optional): `measuredAt` (default today), `weightKg`, `bodyFatPct`, `chestCm`, `waistCm`, `hipsCm`, `armCm`, `thighCm`, `photos[]` (upload via `/upload/images` first)

---

## 15. Reviews

| Method | Path | 🔒 | Summary |
|---|---|---|---|
| GET | `/reviews/me` | 🔒 | Reviews for my coach tenant |
| GET | `/reviews/coaches/{tenantId}` | – | Public reviews for a coach tenant |
| GET | `/reviews/coaches/{tenantId}/summary` | – | Public rating summary |
| GET | `/coaches/{tenantId}/profile` | – | Public profile w/ rating & reviews |
| POST | `/client/me/reviews` | 🔒 | Create my review for the active coach tenant |
| GET | `/client/me/reviews/current` | 🔒 | My review for the active tenant |
| PATCH | `/client/me/reviews` | 🔒 | Update my review |
| DELETE | `/client/me/reviews` | 🔒 | Delete my review |

**`CreateReviewDto`** — required `rating` (1–5), `comment` · **`UpdateReviewDto`** — both optional

> One review per client per tenant — the client-side routes have no `{id}`; they act on the active tenant's review.

---

## 16. Upload — `/upload`

⚠️ Still declares **no `security`** in the spec — verify whether auth is actually enforced.

| Method | Path | Body | Summary |
|---|---|---|---|
| POST | `/upload/image` | multipart: `file` (binary), `type` (`coach`\|`client`) | Single image |
| POST | `/upload/images` | multipart: `files[]`, `type` | Multiple |
| DELETE | `/upload/{key}` | – | Delete by S3 key |

`201` uploaded · `400` invalid file or type

Feeds: `avatarUrl`, `transformationPhotos[]`, `demoVideoUrl` / `demoGifUrl` / `thumbnailUrl`, measurement `photos[]`, certification `fileUrl`.

---

## 17. Health

`GET /health` → `200` `{ status: "ok", info: { database: { status: "up" } }, error, details }` · `503` when a dependency is down (the example shows Redis).

---

## 18. WebSocket gateways — not REST

Two socket.io **v4** gateways sit outside this REST surface. Neither appears in the
OpenAPI spec, and neither has a REST equivalent.

| Purpose | Namespace | Client module |
|---|---|---|
| AI assistant | `/` (default) | `src/lib/aiSocket.ts` |
| Coach ⇄ client messaging | `/chat` | `src/lib/chatSocket.ts` |

Both authenticate with the **access** token via the handshake's `auth.token` (a refresh
token is rejected; a query-string token is ignored). The AI gateway re-verifies on
**every** message, so a 15-minute token expiry closes a live socket mid-session.

**There is no `/assistant/*` REST route.** Any reference to `POST /assistant/ask` or
`GET /assistant/jobs/{id}` is against a job-ticket design that was never built.

The AI assistant chat is **not persisted anywhere** — no endpoint returns its history,
and an answer in flight when the socket drops is permanently lost. Durable AI output is
a different feature: plan suggestions, stored in `ai_plan_suggestions` and fetched over
REST.

Full event contract, correlation rules, and failure matrix: **[docs/06-Ai-Integration.md](06-Ai-Integration.md)**.
Messaging: **[docs/10-chat-messaging.md](10-chat-messaging.md)**.

---

## Enum Reference

| Enum | Values |
|---|---|
| **specialty** ⚠️ | `strength` `hypertrophy` `endurance` `weight_loss` `mobility`* `rehab` `postpartum`* `yoga`* `nutrition` `powerlifting` `crossfit` `calisthenics` `general_fitness` |
| **goal** ⚠️ | `fat_loss` `muscle_gain` `recomposition` `strength` `endurance` `general_health` `yoga_mobility`* |
| **activityLevel** | `sedentary` `lightly_active` `moderately_active` `very_active` `athlete` |
| **trainingExperience / difficulty** | `beginner` `intermediate` `advanced` |
| **equipment** | `none` `dumbbells` `barbell` `kettlebell` `resistance_bands` `machines` `full_gym` |
| **dietaryPreference** ⚠️ | `none` `omnivore`* `halal` `kosher`* `vegetarian` `vegan` `pescatarian`* `gluten_free`* `keto` `low_carb` `intermittent_fasting` |
| **focusArea** ✨ | `strength` `yoga` `cardio` `weight_loss` `mobility` |
| **trainingStyle** ✨ | `strength` `hypertrophy` `cardio` `hiit` `mobility` `yoga` |
| **gender** ⚠️ | `male` `female` `other`* |
| **exerciseCategory** ✨ | `strength` `cardio` `mobility` `plyometric` `core` |
| **muscle** ✨ | `chest` `back` `shoulders` `biceps` `triceps` `forearms` `quads` `hamstrings` `glutes` `calves` `core` `full_body` |
| **setType** ✨ | `working` `warmup` `drop_set` `amrap` `to_failure` |
| **intensityType** ✨ | `rpe` `rir` `percent_1rm` |
| **setOutcome** ✨ | `completed` `partial` `skipped` (extra sets exclude `skipped`) |
| **programStatus** ✨ | `draft` `published` `cancelled` |
| **offlineAvailability** ✨ | `yes` `no` `hybrid` |

`*` = newly added value · ✨ = entirely new enum

> `specialty` in the directory filter matches `UpdateCoachDto` — both differ from the older registration list, which no longer exists.

---

## TypeScript Types

```ts
// ---------- Enums ----------
export type Specialty =
  | 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'mobility'
  | 'rehab' | 'postpartum' | 'yoga' | 'nutrition' | 'powerlifting'
  | 'crossfit' | 'calisthenics' | 'general_fitness';

export type Goal =
  | 'fat_loss' | 'muscle_gain' | 'recomposition' | 'strength'
  | 'endurance' | 'general_health' | 'yoga_mobility';

export type ActivityLevel =
  | 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'athlete';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Equipment =
  | 'none' | 'dumbbells' | 'barbell' | 'kettlebell'
  | 'resistance_bands' | 'machines' | 'full_gym';
export type DietaryPreference =
  | 'none' | 'omnivore' | 'halal' | 'kosher' | 'vegetarian' | 'vegan'
  | 'pescatarian' | 'gluten_free' | 'keto' | 'low_carb' | 'intermittent_fasting';
export type FocusArea = 'strength' | 'yoga' | 'cardio' | 'weight_loss' | 'mobility';
export type TrainingStyle =
  | 'strength' | 'hypertrophy' | 'cardio' | 'hiit' | 'mobility' | 'yoga';
export type Gender = 'male' | 'female' | 'other';

export type ExerciseCategory = 'strength' | 'cardio' | 'mobility' | 'plyometric' | 'core';
export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'full_body';

export type SetType = 'working' | 'warmup' | 'drop_set' | 'amrap' | 'to_failure';
export type IntensityType = 'rpe' | 'rir' | 'percent_1rm';
export type SetOutcome = 'completed' | 'partial' | 'skipped';
export type ProgramStatus = 'draft' | 'published' | 'cancelled';

// ---------- Auth ----------
export interface RegisterCoachDto {
  firstName: string; lastName: string; email: string;
  password: string; confirmPassword: string;
  businessName: string;
  timezone?: string; currency?: string;
}
export interface VerifyResetOtpDto { email: string; otp: string; }
export interface ResetPasswordDto { resetToken: string; newPassword: string; }
export interface SwitchTenantDto { tenantId: string; }

// ---------- Coach ----------
export interface Certification {
  name: string; issuer?: string;
  issueDate?: string; expiryDate?: string;
  fileUrl?: string; credentialUrl?: string;
}
export interface UpdateCoachDto {
  firstName?: string; lastName?: string; avatarUrl?: string; phone?: string;
  age?: number; gender?: Gender; location?: string;
  specialties?: Specialty[]; yearsExperience?: number; careerExperience?: string;
  certifications?: Certification[]; portfolioUrl?: string;
  transformationPhotos?: string[]; featuredReviews?: string; bio?: string;
  offlineAvailability?: 'yes' | 'no' | 'hybrid';
  availabilityHours?: string; priceFrom?: number; priceTo?: number;
}

// ---------- Client ----------
export interface UpdateClientDto {
  firstName?: string; lastName?: string; phone?: string;
  dateOfBirth?: string; gender?: Gender;
  heightCm?: number; weightKg?: number; avatarUrl?: string;
}

export interface ClientIntakeDto {
  goal: Goal;
  trainingExperience: Difficulty;
  activityLevel?: ActivityLevel;
  trainingDaysPerWeek?: number;
  focusAreas?: FocusArea[];
  trainingStyles?: TrainingStyle[];
  availableEquipment?: Equipment[];
  dietaryPreferences?: DietaryPreference[];
  allergies?: string[]; medicalConditions?: string[];
  injuries?: string[]; notes?: string;
}

export interface CreateJoinRequestDto { tenantId: string; message?: string; }
export interface ValidateOnboardingDto { code: string; }
export interface ConfirmOnboardingDto { code: string; intake?: ClientIntakeDto; }

// ---------- Exercises ----------
export interface CreateExerciseDto {
  name: string;
  category: ExerciseCategory;
  primaryMuscle: Muscle;
  instructionSteps: string[];
  secondaryMuscles?: Muscle[];
  equipment?: Equipment[];
  demoVideoUrl?: string; demoGifUrl?: string; thumbnailUrl?: string;
}
export type UpdateExerciseDto = Partial<CreateExerciseDto>;

// ---------- Programs ----------
export interface CreateClientProgramDto {
  membershipId: string;
  name: string;              // max 150
  durationWeeks: number;     // 1–52
  startDate: string;         // YYYY-MM-DD
  description?: string; goal?: Goal; difficulty?: Difficulty;
}
export interface UpdateProgramDayDto {
  name?: string; notes?: string; isRestDay?: boolean;
}

export interface PrescribedSetDto {
  setType?: SetType;
  repsMin?: number; repsMax?: number;
  durationSeconds?: number; weightKg?: number;
  intensityType?: IntensityType; intensityValue?: number;
}

export interface PrescribeExerciseDto {
  exerciseId: string;
  sets: PrescribedSetDto[];
  position?: number; supersetGroup?: number;
  restSeconds?: number; tempo?: string; coachNotes?: string;
}
export type InlineExercisePrescriptionDto = Omit<PrescribeExerciseDto, 'exerciseId'>;
export interface CreateAndPrescribeExerciseDto {
  exercise: CreateExerciseDto;
  prescription: InlineExercisePrescriptionDto;
}
export interface UpdatePlannedExerciseDto {
  position?: number; supersetGroup?: number;
  restSeconds?: number; tempo?: string; coachNotes?: string;
}

// ---------- Logging ----------
export interface UpdatePrescribedLoggedSetDto {
  outcome: SetOutcome;
  reps?: number; weightKg?: number; durationSeconds?: number; rpe?: number;
}
export interface CreateExtraLoggedSetDto {
  loggedExerciseId: string;
  outcome: 'completed' | 'partial';
  reps?: number; weightKg?: number; durationSeconds?: number; rpe?: number;
}
export interface CompleteWorkoutDto {
  durationMinutes?: number; clientNotes?: string; overallRpe?: number;
}
```

---

## Integration Guide

### RTK Query base setup

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

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> =
  async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error?.status === 401) {
      const { refreshToken, persona } = (api.getState() as RootState).auth;
      const refreshPath = persona === 'coach' ? '/auth/refresh' : '/auth/customer/refresh';

      const refresh = await rawBaseQuery(
        { url: refreshPath, method: 'POST',
          headers: { Authorization: `Bearer ${refreshToken}` } },
        api, extraOptions,
      );

      if (refresh.data) {
        api.dispatch(setTokens(refresh.data as any));
        result = await rawBaseQuery(args, api, extraOptions);  // retry original
      } else {
        api.dispatch(logout());
      }
    }
    return result;
  };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me', 'Tenant', 'Clients', 'Intake', 'Measurements', 'Invitations',
    'Reviews', 'Directory', 'JoinRequests', 'Exercises', 'Programs',
    'Program', 'Calendar', 'WorkoutLog',
  ],
  endpoints: () => ({}),
});
```

### Program builder slice

```ts
// programsApi.ts
import { baseApi } from './baseApi';
import type { CreateClientProgramDto, PrescribeExerciseDto, PrescribedSetDto } from './types';

const P = '/plans/training/client-programs';

export const programsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listPrograms: build.query<any, {
      membershipId?: string; status?: string; goal?: string;
      difficulty?: string; search?: string; isArchived?: boolean;
    }>({
      query: (params) => ({ url: P, params }),
      providesTags: ['Programs'],
    }),

    getProgram: build.query<any, string>({
      query: (programId) => `${P}/${programId}`,
      providesTags: (_r, _e, id) => [{ type: 'Program', id }],
    }),

    createProgram: build.mutation<any, CreateClientProgramDto>({
      query: (body) => ({ url: P, method: 'POST', body }),
      invalidatesTags: ['Programs'],
    }),

    addExerciseFromLibrary: build.mutation<any, {
      programId: string; programDayId: string; body: PrescribeExerciseDto;
    }>({
      query: ({ programId, programDayId, body }) => ({
        url: `${P}/${programId}/days/${programDayId}/exercises/from-library`,
        method: 'POST', body,
      }),
      invalidatesTags: (_r, _e, { programId }) => [{ type: 'Program', id: programId }],
    }),

    // PUT = full replacement of every set
    replaceSets: build.mutation<any, {
      programId: string; plannedExerciseId: string; sets: PrescribedSetDto[];
    }>({
      query: ({ programId, plannedExerciseId, sets }) => ({
        url: `${P}/${programId}/exercises/${plannedExerciseId}/sets`,
        method: 'PUT', body: { sets },
      }),
      invalidatesTags: (_r, _e, { programId }) => [{ type: 'Program', id: programId }],
    }),

    publishProgram: build.mutation<any, string>({
      query: (programId) => ({ url: `${P}/${programId}/publish`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Program', id }, 'Programs'],
    }),
  }),
});
```

### Workout logging slice

```ts
// workoutApi.ts
import { baseApi } from './baseApi';
import type { UpdatePrescribedLoggedSetDto, CompleteWorkoutDto } from './types';

const T = '/client/me/training';

export const workoutApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    calendar: build.query<any, { from: string; to: string }>({
      query: (params) => ({ url: `${T}/calendar`, params }),
      providesTags: ['Calendar'],
    }),

    currentProgram: build.query<any, void>({
      query: () => `${T}/programs/current`,
    }),

    // Idempotent: starts a new log or resumes the existing one
    startOrResumeLog: build.mutation<any, string>({
      query: (programDayId) => ({ url: `${T}/days/${programDayId}/log`, method: 'POST' }),
      invalidatesTags: ['Calendar'],
    }),

    logSet: build.mutation<any, {
      logId: string; loggedSetId: string; body: UpdatePrescribedLoggedSetDto;
    }>({
      query: ({ logId, loggedSetId, body }) => ({
        url: `${T}/logs/${logId}/sets/${loggedSetId}`, method: 'PATCH', body,
      }),
      invalidatesTags: (_r, _e, { logId }) => [{ type: 'WorkoutLog', id: logId }],
    }),

    completeWorkout: build.mutation<any, { logId: string; body: CompleteWorkoutDto }>({
      query: ({ logId, body }) => ({
        url: `${T}/logs/${logId}/complete`, method: 'POST', body,
      }),
      invalidatesTags: ['Calendar', 'WorkoutLog'],
    }),
  }),
});
```

### Password reset — 3-step UI flow

```ts
// 1) Email screen
await forgotPassword({ email });

// 2) OTP screen (6-digit input)
const { resetToken } = await verifyResetOtp({ email, otp }).unwrap();
// 403 → "Code is invalid or expired" + offer resend

// 3) New password screen
await resetPassword({ resetToken, newPassword });
```

Keep `resetToken` in component state only — it's single-use and short-lived. Don't persist it.

### Multipart upload (Expo / React Native)

```ts
const uploadImage = async (uri: string, type: 'coach' | 'client', accessToken: string) => {
  const form = new FormData();
  form.append('file', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
  form.append('type', type);

  const res = await fetch(`${BASE_URL}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }, // never set Content-Type manually
    body: form,
  });
  return res.json();
};
```

### Error-handling map

| Status | Meaning in this API | UX suggestion |
|---|---|---|
| `400` "no active tenant selected" | Client hasn't picked a tenant | Route to the tenant switcher |
| `400` on publish | Program is incomplete | Highlight empty days |
| `403` on verify-reset-otp | Bad / expired / exhausted code | Offer resend, keep the email filled |
| `403` on join request | Coach not accepting new clients | Hide or disable the apply button |
| `400` on onboarding validate/confirm | Invalid or expired 6-digit code | Keep the input filled, offer "resend code" |
| `409` on measurement | Date already logged | Offer "edit existing entry" |
| `409` on program edit | No longer a draft | Disable editing when `status !== 'draft'` |
| `409` on publish/reschedule | Date overlap with another program | Show the conflicting program |
| `409` on set logging | Log is finalized | Make finalized logs read-only |
| `409` on complete | Sets still pending | List the unfinished sets |

### Migration checklist

- [ ] **Password reset** — add the OTP screen; rename `token` → `resetToken`
- [ ] **Coach registration** — strip removed fields; add a post-signup profile step
- [ ] **Invitation accept** — delete the token/deep-link accept screen; build a 6-digit code input calling `onboarding/validate` → `onboarding/confirm`
- [ ] **Certifications form** — `year` → `issueDate` / `expiryDate`, add `fileUrl`
- [ ] **Intake validation** — only `goal` and `trainingExperience` are required now
- [ ] **Regenerate enum unions** — `gender`, `goal`, `specialty`, `dietaryPreferences` all widened
- [ ] Track `persona` alongside tokens (refresh paths differ)
- [ ] Persist tokens in `expo-secure-store`
- [ ] On tenant switch, replace both tokens and reset tenant-scoped cache
- [ ] Programs key off **`membershipId`**, not `clientId`
- [ ] Treat `PUT .../sets` as full replacement — send every set
- [ ] Poll or refetch `/calendar` after completing a workout
- [ ] Confirm login/refresh response shapes (undocumented in the spec)
- [ ] Confirm whether `/upload/*` enforces auth (no `security` declared)
