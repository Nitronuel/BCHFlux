---
description: How to deploy the React frontend to Vercel
---

# Deploy Frontend to Vercel

1.  **Log in to Vercel Dashboard**: [vercel.com](https://vercel.com)
2.  **Click "Add New..."** -> **"Project"**.
3.  **Import Git Repository**:
    *   Connect your GitHub account.
    *   Import `Nitronuel/BCHFlux`.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (Vercel should detect this automatically).
    *   **Root Directory**: `.` (Default is fine, or explicitly select root if asked).
        *   *Wait, actually the user's root has `vite.config.ts`, so root is correct.*
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
5.  **Environment Variables**:
    *   **Expand** the "Environment Variables" section.
    *   Add the following:
        *   `VITE_API_URL`: **(Paste your Render Backend URL here)**
            *   *Example: `https://bchflux-backend.onrender.com`*
            *   *Note: Do NOT add a trailing slash `/` at the end.*
        *   `VITE_SUPABASE_URL`: (Your Supabase URL)
        *   `VITE_SUPABASE_ANON_KEY`: (Your Anon Key)
6.  **Deploy**: Click "Deploy".

## After Deployment
*   Vercel will give you a domain (e.g., `bchflux.vercel.app`).
*   **Important**: You might need to update your **Supabase Auth Settings** to allow this new domain as a "Redirect URL" for login to work properly.
    *   Go to Supabase -> Authentication -> URL Configuration.
    *   Add `https://your-vercel-domain.app/**` to Site URL or Redirect URLs.