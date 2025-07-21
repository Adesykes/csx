# 🌐 CSXnaillounge.co.uk Domain Setup Guide

## Domain Architecture
```
csxnaillounge.co.uk → Vercel (Frontend)
api.csxnaillounge.co.uk → Render (Backend API)
```

## Step-by-Step Setup

### 1. Deploy Backend to Render First

#### A. Create Render Web Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (Adesykes/csx)
4. Configure:
   - **Name:** `csx-nail-lounge-backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

#### B. Set Environment Variables in Render
```
MONGODB_URI=mongodb+srv://sykesade:Stormbenbuddy%401@csx.pqwo0ie.mongodb.net/csx?retryWrites=true&w=majority&appName=CSX
JWT_SECRET=f7c531b653b2d94e6ca8309187ebe2377ac4bff21845e995e5cb1b5745c11ee6a
STRIPE_SECRET_KEY=your_stripe_secret_key
NODE_ENV=production
PORT=10000
```

#### C. Add Custom Domain in Render
1. In Render dashboard → Your service → Settings
2. Click "Custom Domains"
3. Add: `api.csxnaillounge.co.uk`
4. Note the CNAME target (e.g., `your-service.onrender.com`)

### 2. Deploy Frontend to Vercel

#### A. Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import GitHub repository (Adesykes/csx)
4. Configure:
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

#### B. Set Environment Variables in Vercel
```
VITE_API_URL=https://api.csxnaillounge.co.uk
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### C. Add Custom Domain in Vercel
1. In Vercel dashboard → Your project → Settings → Domains
2. Add: `csxnaillounge.co.uk`
3. Add: `www.csxnaillounge.co.uk` (optional)
4. Note the DNS records needed

### 3. Configure DNS (Do this through your domain provider)

You'll need to add these DNS records to your domain:

#### For the main domain (Frontend):
```
Type: A
Name: @ (or csxnaillounge.co.uk)
Value: 76.76.19.61 (Vercel's IP)

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

#### For the API subdomain (Backend):
```
Type: CNAME
Name: api
Value: your-render-service.onrender.com
```

### 4. SSL Certificates
- **Vercel:** Automatically provides SSL for your domain
- **Render:** Automatically provides SSL for your API subdomain

### 5. Testing Your Setup

#### Test Frontend:
- Visit: https://csxnaillounge.co.uk
- Should load your booking interface

#### Test Backend API:
- Visit: https://api.csxnaillounge.co.uk/health
- Should return: `{"status":"OK","timestamp":"..."}`

#### Test Full Flow:
1. Book an appointment on your website
2. Check admin panel functionality
3. Verify payments work

## DNS Provider Instructions

### If using Namecheap:
1. Go to Domain List → Manage → Advanced DNS
2. Add the DNS records above

### If using GoDaddy:
1. Go to DNS Management
2. Add the records above

### If using Cloudflare:
1. Go to DNS → Records
2. Add the records above
3. Make sure proxy status is "DNS only" for CNAME records

## Troubleshooting

### Common Issues:
- **DNS propagation:** Can take up to 48 hours
- **SSL certificate:** May take a few minutes to provision
- **CORS errors:** Ensure domain is added to server CORS settings

### Check DNS propagation:
- Use: https://dnschecker.org/
- Enter your domain to see if DNS has propagated

## Security Checklist
- [ ] Use HTTPS everywhere
- [ ] Verify CORS settings include your domain
- [ ] Test admin authentication works
- [ ] Verify payment processing functions

---

## 🎉 Final Result:
- **Main Site:** https://csxnaillounge.co.uk
- **Admin Panel:** https://csxnaillounge.co.uk/admin/login
- **API:** https://api.csxnaillounge.co.uk

Your professional nail salon booking system will be live on your custom domain!
