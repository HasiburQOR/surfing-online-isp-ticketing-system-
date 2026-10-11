# Surfing Online ISP — Website, Customer Support Portal & Admin Panel

One Next.js app, one database, three parts:

| URL | What it is | Who uses it |
|-----|-----------|-------------|
| `/` | Public marketing website (packages, coverage, FAQ, "Request a New Connection" form) | Everyone |
| `/support` | Customer support portal — log in with the **ID + password issued by the ISP**, raise tickets, reply, close, reopen | Customers |
| `/admin` | Admin panel — edit the website, manage tickets, customers and connection requests | Admin only |

Stack: Next.js 16 (App Router) · React 19 · Prisma 6 · SQLite · Tailwind 4 / shadcn/ui · Docker.

---

## Deploy on Dokploy (VPS)

The repo is Dokploy-ready: a single service, no published ports, a named volume for data, and a health check.
Dokploy's Traefik provides the domain and the HTTPS certificate.

### 1. Put the code in a Git repository

Dokploy builds from Git (GitHub, GitLab, Gitea, Bitbucket…). Push this folder to a **private** repo.
`.env` files are git-ignored on purpose — secrets go into Dokploy, not into Git.

### 2. Create the service

1. In Dokploy: **Project → Create Service → Compose**.
2. **Provider**: choose your Git provider, repository and branch. **Compose Path**: `./docker-compose.yml`.
3. **Compose Type**: *Docker Compose* (not Stack).
4. In the service's **Advanced** tab make sure **Isolated Deployment** is on (default on recent Dokploy versions).

### 3. Environment tab

Paste (adjust the values):

```env
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
ADMIN_EMAIL=admin@surfingonline.bd
ADMIN_PASSWORD=choose-a-strong-password
SEED_DEMO_DATA=false
```

- `NEXT_PUBLIC_SITE_URL` must be your real `https://` address. It is baked into the build (canonical URLs, sitemap),
  so **redeploy after changing it**.
- If you leave `ADMIN_PASSWORD` empty, a random one is generated and printed once in the service **Logs**.
- `SESSION_SECRET` is optional — if empty, one is generated and stored in the data volume, so logins survive redeploys.

### 4. Domains tab

Add a domain: **Host** `yourdomain.com` · **Service Name** `web` · **Container Port** `3000` · **HTTPS** on
(Let's Encrypt). Point the domain's DNS **A record** at your VPS IP first. Add `www.yourdomain.com` as a second
domain if you want it.

### 5. Deploy

Click **Deploy**. The first build takes a few minutes. Then:

- Website — `https://yourdomain.com`
- Customer portal — `https://yourdomain.com/support`
- Admin — `https://yourdomain.com/admin`

Set up **auto-deploy** (Deployments tab → webhook) if you want every `git push` to redeploy.

### 6. Backups

All data is in the `web-db` named volume (SQLite database, uploaded banner images, session secret).
In Dokploy use **Volume Backups** on the service (to S3 or compatible storage) and schedule it daily.
Redeploying does **not** touch the volume; deleting the service with "delete volumes" does.

### If something doesn't work

| Symptom | Fix |
|---------|-----|
| 404 / 502 from the domain | Domains tab: service name must be `web`, port `3000`. Ensure **Isolated Deployment** is on; redeploy. |
| Can't log in as admin | Check Logs for the generated password (if `ADMIN_PASSWORD` was empty). The admin is created on first start only — changing `ADMIN_PASSWORD` later has no effect; use the Password button in the panel, or delete the volume to start over. |
| Links/sitemap show `localhost` | `NEXT_PUBLIC_SITE_URL` wasn't set before the build. Set it and redeploy. |
| Build killed / out of memory | The VPS needs about 2 GB RAM free for the Next.js build; add a swap file or build on a bigger box. |

---

## Run locally (testing)

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

- Website: <http://localhost:3000>
- Customer portal: <http://localhost:3000/support>
- Admin: <http://localhost:3000/admin>

| Where | Login | Password |
|-------|-------|----------|
| `/admin` | `admin@surfingonline.bd` | `admin123` |
| `/support` (demo customers) | `rahim123`, `karim456`, `fatima789` | `customer123` |

These demo logins exist **only** with `docker-compose.local.yml`. On a real domain the demo password `admin123` is
refused automatically and a random admin password is generated instead.

Stop: `docker compose -f docker-compose.yml -f docker-compose.local.yml down` · wipe all data: add `-v`.

---

## How customers get access

1. In **Admin → Customers → Add customer**, create the customer's **Username / ID** and **Password**
   (there is a *Generate* button for a readable random password).
2. Give those details to the customer. They log in at `/support`.
3. Passwords are stored encrypted — you can't read them back, only **reset** them (Edit → Reset password).
4. To stop someone logging in, switch **Account enabled** off. Takes effect immediately, even for logged-in customers.

No OTP or SMS is involved: ID + password only.

## Tickets

**Customers** (at `/support`) can: raise a ticket, see only their own tickets, reply, **close** a ticket
themselves, and **reopen** it (within 7 days of closing, or any time while it's "Resolved").

**Admin** (at `/admin → Support Tickets`) can: see every ticket, search/filter, reply, add **internal notes**
(never shown to the customer), change status and priority, **mark resolved** (with a note the customer sees),
**close**, **reopen**, and **create a ticket on a customer's behalf** (phone call, walk-in, WhatsApp…).

Status flow: `Open → In progress ⇄ Waiting for customer → Resolved → Closed`, and `Closed/Resolved → Reopened`.
A customer reply to a "Waiting for customer" ticket moves it back to "In progress" automatically.

Only the admin has access to the ticket list and customer data. Ticket categories are editable in
**Admin → Ticket Categories**.

## Connection requests

The "Request a New Connection" form on the website lands in **Admin → Connection Requests**
(with a badge for new ones). For each request you can call the number, set a status
(New → Contacted → Install scheduled → Connected / Not proceeding), and keep internal notes.
The form is rate-limited to 5 submissions per hour per visitor.

## Editing the website (Admin → Website group)

Settings (including the **trust points** under the hero buttons: "No hidden charges", "Free installation"…,
one per line), **Banners & Offers** (poster carousel at the top of the home page), Packages, Technology,
Benefits, Support info, Coverage areas, Stats and FAQs. Changes publish immediately.

## Coverage map

The Coverage section shows a real street map (OpenStreetMap) with one circle per area you serve.
In **Admin → Coverage Areas** each area has a **Latitude / Longitude** and a **Circle radius**:

1. Open Google Maps, right-click the centre of the area, click the numbers at the top of the menu to copy them.
2. Paste into the *Latitude* box — both boxes fill in automatically.
3. Set the radius (metres) to roughly how far your fibre reaches, then Save. The map updates immediately.

Areas without coordinates still appear in the list (no pin). Turn **Available** off to show an area as "Coming soon"
(dashed grey circle). The default areas are Farmgate, Kawran Bazar, Tejkuni Para, Tejkuni Bazar, Begunbari and BG Press Quarter —
add, remove or fine-tune them to match your real network.

## Security notes

- `/api/cms/*` (website editing + image upload) and everything under `/api/admin/*` require an admin login.
- Customers can only ever read or act on their own tickets.
- Login attempts are limited (5 wrong passwords per ID/IP → 15-minute lock).
- Sessions are signed, HTTP-only cookies (admin 12 h, customer 7 days). Behind HTTPS (Dokploy/Traefik) the cookie
  `Secure` flag is turned on automatically.
- Standard security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are sent on every page.

## Data

Everything lives in the `web-db` Docker volume: `/app/db/custom.db` (SQLite), `/app/db/uploads` (banner images),
`/app/db/.session-secret`. The health check is `GET /api/health`.

## Project layout

```
src/
├── app/
│   ├── page.tsx              # public website
│   ├── support/              # customer portal pages
│   ├── admin/                # admin login + panel
│   └── api/
│       ├── cms/              # website content APIs (admin only)
│       ├── admin/            # tickets, customers, categories, leads, login, password
│       ├── support/          # customer login + ticket actions
│       ├── leads/            # public connection-request form
│       ├── uploads/          # serves uploaded banner images
│       └── health/           # health check
├── components/{cms,support,ticketing,site,ui}
├── lib/                      # auth, tickets, bootstrap, cms, db …
└── proxy.ts                  # blocks /api/cms/* without an admin session
prisma/schema.prisma          # all tables
docker-compose.yml            # Dokploy / production
docker-compose.local.yml      # local testing add-on
```

`mini-services/ticketing` is the old standalone ticketing app. It is no longer used (its features now live in the
main app) and can be deleted.
