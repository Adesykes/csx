# 🚀 Deployment Checklist

## ✅ Pre-Deployment Preparation

### Backend (Render) Setup
- [ ] Create new Render Web Service
- [ ] Set Build Command: `npm install && npm run build`
- [ ] Set Start Command: `npm start`
- [ ] Copy all API routes from `server.ts` to `server-production.ts`
- [ ] Update CORS origins with your Vercel URL

### Environment Variables (Render)
- [ ] `MONGODB_URI` - Your MongoDB Atlas connection string
- [ ] `JWT_SECRET` - Secure random string (32+ characters)
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key
- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`

### Frontend (Vercel) Setup
- [ ] Deploy repository to Vercel
- [ ] Framework preset: Vite
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`

### Environment Variables (Vercel)
- [ ] `VITE_API_URL` - Your Render backend URL (https://your-app.onrender.com)
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key

## 🔧 Configuration Updates

### MongoDB Atlas
- [ ] Whitelist IP 0.0.0.0/0 for Render access
- [ ] Verify connection string is correct
- [ ] Test database connection

### Stripe Configuration
- [ ] Switch to production keys for live deployment
- [ ] Test payment processing
- [ ] Configure webhooks if needed

## 🧪 Testing Checklist

### Customer Flow
- [ ] Homepage loads correctly
- [ ] Service selection works
- [ ] Date/time picker functions
- [ ] Booking form submits successfully
- [ ] Payment processing works
- [ ] Confirmation displays properly

### Admin Flow
- [ ] Admin login works
- [ ] Service management functions
- [ ] Appointment viewing works
- [ ] Revenue reports load
- [ ] Closure date management works

### API Endpoints
- [ ] All API routes respond correctly
- [ ] Authentication works
- [ ] CORS is properly configured
- [ ] Error handling works

## 🔒 Security Verification

### Environment Variables
- [ ] No secrets in code repository
- [ ] JWT secret is strong and unique
- [ ] Database credentials are secure
- [ ] API keys are production-ready

### Database Security
- [ ] MongoDB Atlas network access configured
- [ ] Database user has minimal required permissions
- [ ] Connection string uses SSL

## 📊 Monitoring Setup

### Health Checks
- [ ] Backend health endpoint responds
- [ ] Frontend loads without errors
- [ ] Database connectivity verified

### Logging
- [ ] Production logs are clean (no debug statements)
- [ ] Error logging is functioning
- [ ] Monitor for performance issues

## 🌐 Domain Configuration (Optional)

### Custom Domain
- [ ] Configure custom domain in Vercel
- [ ] Update CORS with custom domain
- [ ] Test SSL certificate

## 🚀 Go Live Steps

1. **Deploy Backend to Render**
   - Push code with production server
   - Set all environment variables
   - Wait for build to complete

2. **Get Backend URL**
   - Note your Render app URL
   - Update VITE_API_URL in Vercel

3. **Deploy Frontend to Vercel**
   - Set environment variables
   - Deploy from repository
   - Test deployment

4. **Final Testing**
   - Complete end-to-end testing
   - Verify all functionality works
   - Check payment processing

5. **Update DNS (if using custom domain)**
   - Point domain to Vercel
   - Update backend CORS settings

## 📝 Post-Deployment

- [ ] Monitor application performance
- [ ] Set up backup procedures
- [ ] Document any deployment-specific issues
- [ ] Plan maintenance windows

---

## 🆘 Emergency Rollback Plan

If issues occur:
1. Revert to previous Vercel deployment
2. Check Render logs for backend issues
3. Verify environment variables
4. Test database connectivity

---

**Ready to deploy? Start with the backend on Render, then frontend on Vercel!** 🎉
