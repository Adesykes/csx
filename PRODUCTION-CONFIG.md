# Production Deployment Configuration

## Environment Detection Logic

The application automatically detects the environment and uses the appropriate API URL:

### Development (localhost)
- **API URL**: `http://localhost:3000`
- **Detected when**: `import.meta.env.PROD === false`
- **Configuration**: Uses local development server

### Production (deployed)
- **API URL**: `https://csx-nail-lounge-backend.onrender.com`
- **Detected when**: `import.meta.env.PROD === true`
- **Configuration**: Uses production Render.com backend

## Environment Variables

### Frontend (Vercel)
```bash
# Optional: Override automatic detection
VITE_API_URL=https://csx-nail-lounge-backend.onrender.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### Backend (Render.com)
```bash
MONGODB_URI=your_mongodb_connection_string
RESEND_API_KEY=your_resend_api_key
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
PORT=3000
NODE_ENV=production
```

## How It Works

1. **Development**: 
   - Vite sets `import.meta.env.PROD = false`
   - API points to `http://localhost:3000`
   - Local development server handles requests

2. **Production Build**:
   - Vite sets `import.meta.env.PROD = true`
   - API points to `https://csx-nail-lounge-backend.onrender.com`
   - Production backend handles requests

3. **Manual Override**:
   - Set `VITE_API_URL` environment variable to override automatic detection
   - Useful for staging environments or custom deployments

## Debug Information

The application logs the following to browser console:
- Current API_BASE_URL
- VITE_API_URL environment variable value
- Production mode status

This helps verify the correct configuration is being used in each environment.
