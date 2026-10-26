# PlaceGo Frontend

The PlaceGo website (blue and white theme) plus an admin panel. Plain HTML, CSS and JavaScript: no build step, no framework. Upload the folder to any hosting and it works.

```
placego-frontend/
├── index.html          # main website
├── admin.html          # admin panel (login, enquiries, manage content)
├── css/
│   ├── style.css       # website styles
│   └── admin.css       # admin panel styles
├── js/
│   ├── config.js       # <-- set your backend API URL here
│   ├── main.js         # website logic (loads content from API, contact form)
│   └── admin.js        # admin panel logic
└── assets/             # put logo.png here
```

## 1. Connect to the backend

Open `js/config.js` and set your API address:

```js
API_BASE_URL: location.hostname === "localhost" ... ? "http://localhost:5000/api"   // local
                                                   : "https://api.placego.online/api" // live
```

Change `https://api.placego.online/api` to wherever you deploy the backend.

**If the backend is offline**, the website still shows everything using built-in fallback content (in `js/main.js`). Only the contact form needs the backend.

## 2. Run locally

The backend must allow your local address in `CORS_ORIGINS` (already includes `http://localhost:5500`).

```bash
# from this folder, any static server works:
npx serve -l 5500 .
# or
python -m http.server 5500
# or VS Code "Live Server" extension (port 5500)
```

- Website: http://localhost:5500/
- Admin: http://localhost:5500/admin.html (login with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the backend `.env`)

## 3. Logo

Copy your `logo.png` into `assets/`. Until then, the page loads the logo from https://placego.online/logo.png.

## 4. Admin panel

At `/admin.html` you can:
- See all contact form enquiries, search, filter by status, mark read, delete, export CSV
- Add / edit / hide / delete **Products**, **Industries**, **Clients** (with logo URL), **Testimonials**
- Control the display order and visibility of every item

Changes show on the website straight away (content is cached for up to 60 seconds).

## 5. Deploy

- **Hostinger / cPanel**: upload everything inside this folder to `public_html/`.
- **Netlify / Vercel**: drag and drop this folder, or connect a GitHub repo (no build command, publish directory `.`).
- After deploying, add the website URL (e.g. `https://placego.online`) to `CORS_ORIGINS` in the backend `.env`.

## 6. What to edit

| What | Where |
|---|---|
| Products, industries, clients, testimonials | Admin panel (no code changes) |
| Services list (the 4 tabs) | `SERVICES` in `js/main.js` |
| Hero text, about, stats, address, phone | `index.html` |
| Colours and fonts | `:root` variables at the top of `css/style.css` |
