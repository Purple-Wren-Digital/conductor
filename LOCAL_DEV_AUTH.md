# Local Development Authentication

## Setup

The system is configured to bypass Auth0 authentication in local development for easier testing.

### Backend Configuration

1. **Start backend in development mode:**
   ```bash
   cd backend
   NODE_ENV=development encore run
   ```

2. **The backend will accept "local" as auth token when `NODE_ENV=development`**

### Frontend Configuration

1. **Start frontend in development mode:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **The frontend will automatically use "local" token when `NODE_ENV=development`**

## How It Works

- **Backend (`backend/auth/auth.ts`)**: When `NODE_ENV=development`, any request with `Authorization: Bearer local` bypasses Auth0 validation
- **Frontend (`frontend/lib/api/client-side.ts` & `server-side.ts`)**: Automatically sends "local" as the auth token in development mode

## Testing

### Test Backend Directly
```bash
# Any endpoint will work with "local" token
curl -H "Authorization: Bearer local" http://localhost:4000/dashboard/metrics
curl -H "Authorization: Bearer local" http://localhost:4000/tickets
```

### Test Full Stack
1. Start both frontend and backend in development mode
2. Visit http://localhost:3000
3. All API calls will automatically use "local" token

## Mock User Data

When using "local" token, the system returns:
- **userID**: "local-dev-user"
- **email**: "local@localhost.com"
- **imageUrl**: placeholder image

## Production

This ONLY works when `NODE_ENV=development`. In production, normal Auth0 authentication is required.