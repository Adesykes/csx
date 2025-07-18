# CSX Nail Lounge - Online Booking Platform

A comprehensive online booking platform for CSX Nail Lounge built with React, TypeScript, MongoDB, and deployed on Vercel.

## Features

- **Interactive Booking System**: Full calendar with available appointment slots
- **Service Management**: Dynamic pricing and service selection
- **Payment Processing**: Secure payments with Stripe integration
- **Admin Dashboard**: Manage appointments, services, and view revenue reports
- **Revenue Tracking**: Export revenue data for tax purposes
- **Responsive Design**: Optimized for mobile and desktop

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: MongoDB Atlas
- **Payments**: Stripe
- **Hosting**: Vercel

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd csx-nail-lounge
npm install
```

### 2. Set up MongoDB Atlas
1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get your connection string
4. Create collections: `services`, `appointments`, `users`

### 3. Set up Stripe
1. Create a Stripe account at https://stripe.com
2. Get your publishable and secret keys from the dashboard

### 4. Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/csx-nail-lounge
JWT_SECRET=your-super-secret-jwt-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
```

### 5. Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts to deploy
4. Add environment variables in Vercel dashboard

### 6. Create Admin User
You'll need to manually create an admin user in your MongoDB database:
```javascript
{
  email: "admin@csxnaillounge.com",
  password: "$2a$12$hashedPasswordHere", // Use bcrypt to hash
  name: "Admin User",
  role: "admin"
}
```

## API Endpoints

- `GET /api/services` - Get all active services
- `POST /api/services` - Create new service (admin)
- `PUT /api/services` - Update service (admin)
- `DELETE /api/services` - Delete service (admin)
- `GET /api/appointments` - Get all appointments (admin)
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments` - Update appointment (admin)
- `POST /api/auth/login` - Admin login
- `POST /api/create-payment-intent` - Create Stripe payment intent
- `GET /api/revenue` - Get revenue data (admin)

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## License

Private - CSX Nail Lounge