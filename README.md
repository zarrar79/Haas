# HAS — Hackathon as a Service

## Theme (single file)

Edit **`src/theme/tokens.css` only** to change colors, radii, and fonts.
Dark + light modes use `[data-theme="dark"|"light"]`. Toggle is in the header.

## Steps 0–3 (done)

- Theme tokens + light/dark switch  
- Admin shell: header, expandable sidebar, mobile drawer  
- Nav placement: sidebar ↔ header  
- API tester: **hidden by default**, header **API** opens a right drawer  
- Login (themed) + Home overview inside the shell  

## Next

Members, teams, challenges, system screens (same pattern: list + forms + actions).

## Wired screens (live APIs)

| Screen | Behavior |
|--------|----------|
| `/home` | GET `/api/haas/me` |
| `/hackathons` | GET list + filters + table |
| `/hackathons/new` | POST create form |
| `/hackathons/[id]` | GET detail, PATCH edit, archive/restore/break-glass |
| `/events/[id]` | Workspace hub (Enter from list) |

## Run

```bash
npm run dev
```

Open `/login` → `/home` → **Hackathons**. Use **API** in the header for the tester.
