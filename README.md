# GC-FRB Room and Facility Booking

## Run locally

Configure the backend first. Copy `Gcfrb_backend/.env.example` to
`Gcfrb_backend/.env`, then add the Supabase project URL and service-role key
from your Supabase project. Keep this backend-only file private; never put the
service-role key in the frontend.

Install dependencies and start the frontend and API together from the
repository root:

```powershell
npm --prefix Gcfrb_backend install
npm --prefix GC-FRB install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Admin sign-in is at
`/admin/login`; student sign-in is at `/login`. Admin and student accounts must
already exist in the `admins` and `users` Supabase tables with bcrypt password
hashes. Protected pages verify the saved token with the API before rendering.

`npm run dev` starts both services (`http://localhost:5173` for the frontend
and `http://localhost:4000` for the API). To run only the API, use
`npm run dev:backend` from the repository root.

For Google student sign-in, copy `GC-FRB/env.example` to `GC-FRB/.env.local`,
then set `VITE_SUPABASE_URL` and the project's publishable (or legacy anon) key.
In Supabase, enable the Google provider and add `http://localhost:5173/auth/callback`
to the project's allowed redirect URLs. Set the Google OAuth callback URL shown
in Supabase's Google provider settings in your Google Cloud OAuth client.
Google sign-in matches the verified email to an existing row in `users`; it
does not create accounts automatically.

The frontend uses `http://localhost:4000` as its API URL by default. Set
`VITE_API_URL` in `GC-FRB/.env.local` to override it. Keep `VITE_USE_MOCK=false`
for Supabase-backed login and page data. Email/password login checks the existing
`users.email` and bcrypt `users.password_hash` fields.

Admin bookings, room management, and reports use the existing database columns.
The current schema does not store facility amenities, descriptions, hourly
rates, or the extra booking-form details; the UI reports this when saving.
Admin-created bookings require the requester name to match one unique
`users.full_name`. Removing a facility marks it unavailable to preserve
existing booking history.
