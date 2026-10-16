# GC-FRB (frontend)

React + Vite + Tailwind v4. **One single-page app** (one `index.html`, client-side routing) split into two
fully separate portals, each living in ONE file and loaded as its own chunk:

| URL        | File                            | What's inside                                                                 |
| ---------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `/admin/*` | `src/admin/AdminDashboard.jsx`  | login, dashboard, bookings, booking details, new booking, facilities, facility details, reports |
| `/*`       | `src/booker/BookerApp.jsx`      | landing page, booking flow (`/book`, placeholder)                             |

`src/App.jsx` only decides which portal to load. Shared bits: `src/api.js`, `src/lib/reportPdf.js`, `src/assets`, `src/index.css`.

## Run
```bash
cp env.example .env.local   # VITE_USE_MOCK=true lets you log in without the backend
npm install
npm run dev                 # http://localhost:5173/admin/login
```
