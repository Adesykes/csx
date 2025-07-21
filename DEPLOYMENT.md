# CSX Nail Lounge - Deployment Guide

## Prerequisites
1. MongoDB Atlas account with database set up
2. Stripe account for payments
3. Vercel account for frontend hosting
4. Render account for backend hosting

## Backend Deployment (Render)

### Step 1: Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: csx-nail-lounge-backend
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18

### Step 2: Set Environment Variables in Render
Add these environment variables in Render dashboard:
```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
NODE_ENV=production
PORT=10000
```

### Step 3: Prepare Backend Files
1. Copy all API routes from `server.ts` to `server-production.ts`
2. Update CORS origin in `server-production.ts` with your Vercel URL
3. Create a separate backend repository or use a monorepo structure

## Frontend Deployment (Vercel)

### Step 1: Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2: Set Environment Variables in Vercel
Add these environment variables in Vercel dashboard:
```
VITE_API_URL=https://your-render-app.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

### Step 3: Update API Base URL
The `src/lib/api.ts` file should automatically use the `VITE_API_URL` environment variable.

## Post-Deployment Steps

### 1. Update CORS Configuration
After deployment, update the CORS origin in your backend to include your Vercel URL:
```typescript
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app'],
  credentials: true
}));
```

### 2. Test the Application
1. Visit your Vercel URL
2. Test customer booking flow
3. Test admin login and functionality
4. Verify payment processing works

### 3. Set Up Custom Domain (Optional)
- In Vercel: Settings → Domains → Add your custom domain
- In Render: Settings → Custom Domains → Add your custom domain

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Ensure your Vercel URL is added to CORS origins
2. **Environment Variables**: Double-check all environment variables are set correctly
3. **MongoDB Connection**: Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0 for Render
4. **API Routes**: Ensure all routes from server.ts are copied to production server

### Logs:
- **Render**: View logs in Render dashboard → Your Service → Logs
- **Vercel**: View logs in Vercel dashboard → Your Project → Functions tab

## Security Notes
- Use strong JWT secrets (32+ characters)
- Use production Stripe keys for live deployment
- Ensure MongoDB Atlas has proper access controls
- Consider setting up monitoring and alerts
