# Network Topology Frontend

Angular application for visualizing GCP network topology with OAuth authentication.

## Features

- **GCP OAuth Authentication**: Secure login with Google Cloud Platform credentials
- **Material Design UI**: Clean, modern interface following GCP Console design patterns
- **Network Topology Visualization**: Interactive visualization of network infrastructure
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js 20.17+ 
- npm 8+
- Angular CLI 18+
- Google Cloud Platform project with OAuth 2.0 configured

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Identity and Access Management (IAM) API
   - Compute Engine API
   - Cloud Resource Manager API
4. Go to "Credentials" and create OAuth 2.0 Client IDs
5. Add your domain to authorized origins
6. Copy the client ID

### 3. Update Environment Configuration

Edit `src/environments/environment.ts` and `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: false, // or true for production
  googleClientId: 'your-actual-client-id.apps.googleusercontent.com',
  apiUrl: 'http://localhost:3000/api' // Backend API URL
};
```

### 4. Development Server

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any source files.

### 5. Build for Production

```bash
ng build --configuration production
```

## Application Structure

```
src/
├── app/
│   ├── core/                 # Core services, guards, models
│   │   ├── services/         # Authentication and API services
│   │   ├── guards/           # Route guards
│   │   └── models/           # TypeScript interfaces
│   ├── features/             # Feature modules
│   │   ├── auth/             # Authentication components
│   │   └── network-topology/ # Main topology visualization
│   ├── shared/               # Shared components and utilities
│   └── layout/               # Layout components
├── environments/             # Environment configurations
└── assets/                   # Static assets
```

## OAuth Flow

The application implements the Google OAuth 2.0 flow for GCP authentication:

1. User clicks "Sign in with Google"
2. Google Identity Services handles authentication
3. Application receives ID token and access token
4. User information is stored and used for API calls
5. Protected routes are accessible after authentication

## Required GCP Permissions

The application requests the following OAuth scopes:

- `https://www.googleapis.com/auth/cloud-platform.read-only` - Read GCP resources
- `https://www.googleapis.com/auth/compute.readonly` - Read Compute Engine resources
- `profile` - User profile information
- `email` - User email address

## Security Notes

- All API communications use HTTPS in production
- OAuth tokens are stored securely in browser localStorage
- Tokens automatically expire and require re-authentication
- No sensitive data is stored permanently on the client

## Development Guidelines

- Follow Angular style guide and best practices
- Use TypeScript strictly with proper typing
- Implement responsive design with Angular Material
- Write unit tests for all components and services
- Follow GCP Console design patterns for consistency

## Troubleshooting

### Common Issues

1. **OAuth not working**: Verify client ID and authorized domains
2. **CORS errors**: Ensure backend CORS configuration allows frontend domain
3. **Build errors**: Check Node.js and Angular CLI versions
4. **Material Design issues**: Verify all required Material modules are imported

### Getting Help

- Check the browser console for error messages
- Verify network requests in browser dev tools
- Ensure all environment variables are set correctly
- Check that all required GCP APIs are enabled