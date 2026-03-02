# Vercel Deployment Guide - iWB Send

## Overview

Three separate Vercel projects:
1. **Marketing** (www.iwbsend.com) - `apps/marketing`
2. **Dashboard** (app.iwbsend.com) - `apps/dashboard`
3. **API** (api.iwbsend.com) - `apps/api`

## Prerequisites

1. **Vercel Account**: Create at https://vercel.com
2. **GitHub Connected**: Repository is at https://github.com/raunkbohra/iwb-send.git
3. **Domains**: Optional, but recommended for production

## Deployment Steps

### 1. Deploy Marketing Site

```bash
# Via Vercel CLI
vercel --cwd apps/marketing --prod --name iwb-send-marketing

# Or via Vercel Dashboard:
# 1. Go to vercel.com/new
# 2. Select "Import Git Repository"
# 3. Select raunkbohra/iwb-send
# 4. Set "Root Directory" to: apps/marketing
# 5. Framework: Next.js
# 6. Build Command: pnpm run build
# 7. Install Command: pnpm install
# 8. Output Directory: .next
# 9. Environment Variables: (none needed for marketing)
# 10. Click Deploy
```

**Configuration:**
- **Framework**: Next.js
- **Root Directory**: `apps/marketing`
- **Build Command**: `pnpm run build`
- **Install Command**: `pnpm install`
- **Node Version**: 20.x (recommended)

**After Deployment:**
- Go to Vercel Project Settings
- Domains → Add Custom Domain → `www.iwbsend.com`

### 2. Deploy Dashboard

```bash
vercel --cwd apps/dashboard --prod --name iwb-send-dashboard
```

**Configuration:**
- **Root Directory**: `apps/dashboard`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://api.iwbsend.com
  ```

**After Deployment:**
- Add Custom Domain → `app.iwbsend.com`

### 3. Deploy API

```bash
vercel --cwd apps/api --prod --name iwb-send-api
```

**Configuration:**
- **Root Directory**: `apps/api`
- **Environment Variables**:
  ```
  AWS_REGION=ap-south-1
  DATABASE_URL=postgresql://...
  ```

**After Deployment:**
- Add Custom Domain → `api.iwbsend.com`

## Step-by-Step via Dashboard

### Option A: Using Vercel Dashboard (Easiest)

1. **Login to Vercel**
   - Go to https://vercel.com/dashboard
   - Sign in with GitHub

2. **For Each App** (Marketing → Dashboard → API):
   - Click "+ Add New" → "Project"
   - Select "Import Git Repository"
   - Select `raunkbohra/iwb-send`
   - Configure:
     - **Project Name**: `iwb-send-marketing` (or dashboard/api)
     - **Root Directory**: Select `apps/marketing` (or apps/dashboard/apps/api)
     - **Framework**: Next.js
     - **Build Settings**: Keep defaults (Vercel auto-detects)
     - **Environment Variables**: Add any needed
   - Click "Deploy"

3. **Configure Domains** (After each deployment):
   - Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions
   - Wait for SSL certificate (usually instant)

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy Marketing
cd apps/marketing
vercel --prod

# Deploy Dashboard
cd ../dashboard
vercel --prod

# Deploy API
cd ../api
vercel --prod
```

## Environment Variables

### Marketing
- No variables needed (static content)

### Dashboard
```
NEXT_PUBLIC_API_URL=https://api.iwbsend.com
```

### API
```
AWS_REGION=ap-south-1
DATABASE_URL=postgresql://user:password@host/dbname
NEXT_PUBLIC_API_URL=https://api.iwbsend.com
```

## DNS Configuration (Custom Domains)

After adding domains in Vercel, update your DNS provider:

**Recommended DNS Provider**: Cloudflare (free, good for CDN)

1. **Marketing (www.iwbsend.com)**
   - Type: CNAME
   - Name: www
   - Value: cname.vercel-dns.com

2. **Dashboard (app.iwbsend.com)**
   - Type: CNAME
   - Name: app
   - Value: cname.vercel-dns.com

3. **API (api.iwbsend.com)**
   - Type: CNAME
   - Name: api
   - Value: cname.vercel-dns.com

Vercel provides exact DNS records in Project Settings → Domains

## Verification Checklist

- [ ] All 3 projects created in Vercel
- [ ] Marketing deployed → www.iwbsend.com ✓
- [ ] Dashboard deployed → app.iwbsend.com ✓
- [ ] API deployed → api.iwbsend.com ✓
- [ ] DNS configured for all domains
- [ ] SSL certificates active (green lock)
- [ ] Dashboard → Settings → check NEXT_PUBLIC_API_URL points to API
- [ ] Test API endpoint: `curl https://api.iwbsend.com/api/v1/messages`
- [ ] Monitor > Deployments show successful builds
- [ ] Analytics enabled for each project

## Post-Deployment

1. **Monitor**: Vercel Dashboard → Analytics
2. **Logs**: Vercel Dashboard → Deployments → Logs
3. **Performance**: Check Web Vitals in Vercel
4. **Scale**: Auto-scales automatically
5. **Rollback**: One-click rollback to previous deployments

## Troubleshooting

**Build fails?**
- Check build logs in Vercel Dashboard
- Verify all dependencies are installed
- Check environment variables are set

**Domain not working?**
- Verify DNS records are correct
- Wait up to 24 hours for DNS propagation
- Check SSL certificate status (should be ✓)

**API calls failing?**
- Verify `NEXT_PUBLIC_API_URL` in dashboard
- Check CORS headers in API
- Test API directly: `curl https://api.iwbsend.com/api/v1/health`

## Next Steps

1. Connect custom domain DNS
2. Set up monitoring/alerts
3. Configure CI/CD for auto-deployments on push
4. Set up preview deployments for PRs
5. Configure environment for production

---

**Estimated Deployment Time**: 5-10 minutes per app
**Cost**: Free tier available (100 GB bandwidth/month)
**Auto-Scaling**: Unlimited
