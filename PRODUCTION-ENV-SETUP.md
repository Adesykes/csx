# Production Environment Variables Setup

## 🚀 Render.com (Backend) Environment Variables

Add these environment variables in your Render.com dashboard:

```bash
# Database
MONGODB_URI=mongodb+srv://sykesade:Stormbenbuddy%401@cxs.pqwo0ie.mongodb.net/csx-nail-lounge?retryWrites=true&w=majority&appName=CXS

# Email Service
RESEND_API_KEY=re_eXtifyzs_DmYQbtUz8xMjD9cbaJW9AmiC

# Admin Configuration
ADMIN_EMAIL=sykesa@sky.com
ADMIN_PASSWORD=Stormben1
ADMIN_EMAIL_NOTIFICATIONS=charliesykes16@outlook.com

# Security
JWT_SECRET=f7c531b653b2d94e6ca8309187ebe2377ac4bff21845e995e5cb1b5745c11ee6a

# Stripe (if using)
STRIPE_SECRET_KEY=sk_test_...

# Server Configuration
NODE_ENV=production
PORT=3000
```

## 🌐 Vercel (Frontend) Environment Variables

Add these environment variables in your Vercel dashboard:

```bash
# API Configuration
VITE_API_URL=https://csx-nail-lounge-backend.onrender.com

# Stripe (if using)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

## 📋 How to Add Environment Variables

### Render.com (Backend):
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add each variable with "Add Environment Variable"
5. Deploy your service

### Vercel (Frontend):
1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add each variable for "Production" environment
5. Redeploy your application

## ✅ Critical Variables for Email System

The email system requires these specific variables on **Render**:

- `RESEND_API_KEY` - Your Resend API key for sending emails
- `ADMIN_EMAIL_NOTIFICATIONS` - Where booking notifications go
- `MONGODB_URI` - Database connection for storing bookings

## 🔍 Verification

After deployment, check the browser console logs in production to verify:
- `API_BASE_URL` shows the correct Render URL
- `Production mode: true`
- Email confirmations work when testing bookings

## 🚨 Important Notes

1. **Never commit .env files** - They contain sensitive data
2. **Use different API keys** for production vs development
3. **Test email functionality** after deployment
4. **Monitor Render logs** for any email sending errors
