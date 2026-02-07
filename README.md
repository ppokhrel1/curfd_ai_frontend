# CURFD AI - React Frontend

Modern React + TypeScript + Vite application for CURFD AI platform.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and configure:
   - `VITE_BACKEND_URL` - Your backend server URL
   - `VITE_API_URL` - API endpoint path
   - `VITE_WS_URL` - WebSocket endpoint path
   - `VITE_ENCRYPTION_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Add your API keys (OpenAI, Stripe, Google OAuth)

3. **Run development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

All configuration is controlled via `.env` files:

- `.env` - Development configuration
- `.env.production` - Production configuration (set in Vercel)
- `.env.example` - Template with all required variables

## Production Deployment

Deploy to Vercel:
1. Set environment variables in Vercel dashboard
2. Use `.env.production` as reference
3. Deploy

## Tech Stack

- React 18 + TypeScript
- Vite for build tooling
- Three.js for 3D visualization
- Zustand for state management
- TailwindCSS for styling
