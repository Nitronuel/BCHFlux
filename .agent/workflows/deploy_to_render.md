---
description: How to deploy the NestJS backend to Render
---

# Deploy Backend to Render

1.  **Log in to Render Dashboard**: [dashboard.render.com](https://dashboard.render.com)
2.  **Click "New +"** -> **"Web Service"**.
3.  **Connect GitHub**:
    *   Select "Build and deploy from a Git repository".
    *   Find and select your repo: `Nitronuel/BCHFlux`.
4.  **Configure Service**:
    *   **Name**: `bchflux-backend` (or similar)
    *   **Region**: Choose the one closest to you (e.g., Frankfurt, Oregon).
    *   **Branch**: `main`
    *   **Root Directory**: `server` (Important! Your backend is in a subfolder)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm run start:prod`
    *   **Instance Type**: `Free`
5.  **Environment Variables** (Scroll down to "Advanced" or "Environment"):
    *   Add the variables from your `server/.env` file:
        *   `SUPABASE_URL`: (Your URL)
        *   `SUPABASE_KEY`: (Your Service Role Key)
        *   `PORT`: `3000` (Render might set this automatically, but good to have)
6.  **Deploy**: Click "Create Web Service".

## Important Notes for Free Tier
*   **Spin Down**: The free instance will "sleep" after 15 minutes of inactivity. The first request after sleep will take ~30-60 seconds to respond.
*   **Background Jobs**: Your `MatchingEngine` runs every 5 seconds. It will **stop running** when the service sleeps. For a hackathon demo, this is fine (just visit the site to wake it up). for production, you need a paid instance ($7/month).
