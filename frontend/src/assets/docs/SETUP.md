# Setup Guide for Network Topology Application

## Quick Start

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Google OAuth**:
   - Update `src/environments/environment.ts` with your Google OAuth client ID
   - Ensure your domain is added to authorized origins in Google Cloud Console

3. **Start development server**:
   ```bash
   npm run start:dev
   ```

4. **Open browser**: Navigate to `http://localhost:4200`

## Google Cloud Console Setup

### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services > Credentials**
4. Click **+ CREATE CREDENTIALS > OAuth 2.0 Client IDs**
5. Configure the consent screen if prompted
6. Choose **Web application** as application type
7. Add authorized origins:
   - `http://localhost:4200` (development)
   - Your production domain (production)
8. Copy the generated client ID

### Step 2: Enable Required APIs

Enable these APIs in your GCP project:
- **Identity and Access Management (IAM) API**
- **Compute Engine API**
- **Cloud Resource Manager API**
- **VPC Access API** (for flow logs)

### Step 3: Configure Environment

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  googleClientId: 'your-client-id-here.apps.googleusercontent.com',
  apiUrl: 'http://localhost:3000/api'
};
```

## Authentication Flow

The application uses Google Identity Services for OAuth 2.0 authentication:

1. User clicks "Sign in with Google"
2. Google authentication popup/redirect appears
3. User authorizes the required scopes
4. Application receives ID token and access token
5. User can access protected network topology features

## Required OAuth Scopes

- `https://www.googleapis.com/auth/cloud-platform.read-only`
- `https://www.googleapis.com/auth/compute.readonly`
- `profile`
- `email`

## Development Commands

- `npm run start:dev` - Start development server
- `npm run build:dev` - Build for development
- `npm run build:prod` - Build for production
- `npm test` - Run unit tests
- `npm run lint` - Run linting

## Troubleshooting

### Common Issues

1. **"Invalid OAuth client" error**:
   - Verify client ID in environment.ts
   - Check authorized origins in Google Cloud Console

2. **CORS errors**:
   - Ensure backend allows frontend domain
   - Check if running on correct ports

3. **Build warnings about budget**:
   - These are size warnings for CSS files
   - Can be ignored for development
   - Optimize styles for production if needed

4. **Google Identity Services not loading**:
   - Check internet connection
   - Verify script tag in index.html
   - Clear browser cache

### Getting Help

- Check browser console for detailed error messages
- Verify network tab for failed requests
- Ensure all required GCP APIs are enabled
- Test OAuth flow in Google OAuth Playground first
