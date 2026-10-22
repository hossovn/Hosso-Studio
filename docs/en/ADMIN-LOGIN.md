# Signing in to the Hosso Studio admin

[Tiếng Việt](../ADMIN-LOGIN.md) | **English**

Hosso Studio uses Payload CMS as its admin layer. You do **not** need to register: the first admin account is created automatically the first time the system starts.

## 1. Quick summary

| Item | Details |
|---|---|
| Address | http://localhost:3000/admin |
| Email | `HOSSO_ADMIN_EMAIL` in `apps/studio/.env` (default `admin@example.com`) |
| Password | `HOSSO_ADMIN_PASSWORD` in `apps/studio/.env` (12 random characters) |
| Role | `admin` (full access) |
| Language | Account → Language: Vietnamese or English (admin and builder) |

## 2. Detailed flow (running locally)

### Step 1. Run the dev command

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs `node scripts/ensure-env.mjs` before it starts Studio.

### Step 2. Create `apps/studio/.env`

`scripts/ensure-env.mjs` does the following:

1. If `apps/studio/.env` **already exists**, the script stops and leaves the file alone.
2. Otherwise it copies `.env.example` to `apps/studio/.env`.
3. For keys still empty it fills random values: `HOSSO_SECRET`, `HOSSO_ENCRYPTION_KEY`, `HOSSO_ADMIN_PASSWORD`.
4. It prints a line saying `apps/studio/.env` was created (the admin account and password are in that file).

`HOSSO_ADMIN_EMAIL` keeps the value from `.env.example`, which is `admin@example.com`. You can edit this email in `.env` **before the first run** of Studio.

### Step 3. Studio creates the admin account

When Studio starts, Payload calls `onInit` in [payload.config.ts](../../apps/studio/src/payload.config.ts). That hook calls `ensureAdmin` ([seed.ts](../../apps/studio/src/lib/seed.ts)):

- Condition: both `HOSSO_ADMIN_EMAIL` and `HOSSO_ADMIN_PASSWORD` are set, **and** the `users` table is empty.
- Action: create a user with `roles: ['admin']` and log "Created the admin account: <email>".
- If the database already has users, the function does nothing.

After that, if `HOSSO_SEED` is not `false`, `seedIfEmpty` loads the sample pages (in every configured language).

### Step 4. Read the credentials

Open `apps/studio/.env` and read two lines:

```
HOSSO_ADMIN_EMAIL=admin@example.com
HOSSO_ADMIN_PASSWORD=<random string>
```

### Step 5. Sign in

1. Open http://localhost:3000/admin.
2. Enter the email and password from step 4.
3. You land on the dashboard, which shows the "Get started" checklist (name and logo, menu, home page, at least 3 published pages).

### Step 6. Open the drag-and-drop builder

Admin → **Pages** → open a page → **Open the drag-and-drop builder**. Or go straight to `/editor/<id>`. Posts use `/editor/<id>?c=posts`.

## 3. Special cases

### 3.1. `.env` has no admin email or password

Then `ensureAdmin` creates nothing. The first time you open `/admin`, Payload shows the **create first user** screen. Enter an email and password of your choice.

The first user always gets the `admin` role. The `beforeChange` hook in [Users.ts](../../apps/studio/src/collections/Users.ts) enforces this.

### 3.2. Docker

Set these in the `.env` at the repository root, then run `docker compose up --build`:

```
HOSSO_ADMIN_EMAIL=you@company.com
HOSSO_ADMIN_PASSWORD=your-password
```

If you leave both empty, no admin is created automatically and you use the create-first-user screen as in 3.1. Docker does **not** generate a password the way `pnpm dev` does.

### 3.3. Changing `.env` after the first run does not change the existing account

`ensureAdmin` only runs when the database has no users. To change things:

- **Change the password or email:** Admin → System → **Users** → open the user → edit → Save.
- **Start over (loses data):** stop Studio, delete `apps/studio/data/studio.db`, run `pnpm dev` again. The seed reloads the sample pages.

### 3.4. Forgot the password

- If you never changed the password in the admin, it is still the value in `apps/studio/.env`.
- If you changed it and forgot: sign in with another admin account to reset it, or use "start over" from 3.3.

### 3.5. Sign-in fails even with the right password

Check in this order:

1. Is Studio reading the right `apps/studio/.env` (not the `.env` at the root, unless you run Docker)?
2. Was `.env` regenerated? If you deleted `.env` but kept `studio.db`, the newly generated password will **not match** the old user in the database.
3. Was `HOSSO_SECRET` changed? Changing the secret invalidates existing sessions but does not break passwords.

## 4. User roles

Defined in [Users.ts](../../apps/studio/src/collections/Users.ts). Only `admin` can create or delete users and assign roles.

| Role | Permissions |
|---|---|
| `admin` | Full access, including site and plugin settings |
| `publisher` | Publishes content, cannot change settings |
| `editor` | Edits pages and posts, saves drafts only (the default role for new users) |
| `author` | Writes only their own posts, saves drafts |
| `moderator` | Comments and forms |

Users who are not `admin` can only read and edit **their own account**.

To add someone: Admin → Users → **Create new** → enter an email, a password and choose a role.

## 5. Safety tips when going to a server

- Set a strong `HOSSO_ADMIN_PASSWORD` and do not use `admin@example.com` as a real email.
- Never commit `apps/studio/.env` (it holds `HOSSO_SECRET` and `HOSSO_ENCRYPTION_KEY`).
- `HOSSO_ENCRYPTION_KEY` encrypts the WIM plugin's API key and webhook secret. If you lose it you must enter those values again.
- Set `HOSSO_PUBLIC_URL` to your real domain.
