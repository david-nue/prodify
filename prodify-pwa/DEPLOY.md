# Prodify — Deployment Guide
Built by David Nueva

## Folder structure
```
prodify/
  index.html       ← the app
  manifest.json    ← PWA config
  sw.js            ← service worker (offline support)
  vercel.json      ← Vercel routing config
  icons/
    icon-72.png
    icon-96.png
    icon-128.png
    icon-144.png
    icon-152.png
    icon-192.png
    icon-384.png
    icon-512.png
```

---

## Step 1 — Deploy to Vercel (free)

1. Go to **vercel.com** and sign up (free)
2. Click **"Add New Project"**
3. Choose **"Browse"** and upload this entire folder
4. Click **Deploy** — done, you get a free `.vercel.app` URL instantly

---

## Step 2 — Buy a domain (optional but recommended)

1. Go to **cloudflare.com/products/registrar**
2. Search for your domain (e.g. `prodify.app`, `prodifyapp.com`)
3. Buy it — Cloudflare charges at-cost (~$9–15/yr, no renewal markup)

---

## Step 3 — Connect domain to Vercel

1. In Vercel → your project → **Settings → Domains**
2. Add your domain (e.g. `prodify.app`)
3. Vercel gives you DNS records to add
4. In Cloudflare → your domain → **DNS → Add record**
5. Paste the records Vercel gave you
6. Wait 1–5 minutes → your app is live at your domain

---

## Installing as an app

### iOS (iPhone/iPad)
1. Open your URL in **Safari**
2. Tap the **Share** button (square with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add** — Prodify appears as an app icon

### Android
1. Open your URL in **Chrome**
2. Chrome shows an **"Install App"** banner at the bottom
3. Tap **Install** — or tap the 3-dot menu → "Add to Home Screen"

### Windows
1. Open your URL in **Chrome or Edge**
2. Look for the **install icon** in the address bar (computer with arrow)
3. Click it → **Install**
4. Prodify opens in its own window like a desktop app

### Mac
1. Open your URL in **Chrome**
2. Click the install icon in the address bar
3. Click **Install**
   — or in Safari: **File → Add to Dock**
