# Network Topology Viewer

A modern web application for visualizing Google Cloud Platform network topology, built with Angular and Node.js.

## 🏗️ Architecture

This project follows a monorepo structure with clear separation of concerns:

```
network-topology/
├── frontend/           # Angular application with Material Design
├── backend/           # Node.js/Express API server (coming soon)
├── infra/             # Terraform infrastructure code (coming soon)
├── deploy/            # Deployment scripts and CI/CD (coming soon)
├── requirements/      # Project documentation and requirements
└── start-dev.sh      # Development startup script
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.17+ 
- npm 8+
- Git

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd network-topology
   ```

2. **Start the development environment**:
   ```bash
   ./start-dev.sh
   ```

3. **Open your browser**: Navigate to `http://localhost:4200`

The startup script will:
- ✅ Check Node.js and npm installation
- ✅ Install dependencies if needed
- ✅ Start the Angular development server
- ✅ Provide helpful information about the running environment

## 🔐 Authentication Setup

To use the GCP OAuth functionality:

1. Set up Google Cloud Console OAuth 2.0 credentials
2. Update `frontend/src/environments/environment.ts` with your client ID
3. See detailed setup instructions in `frontend/README.md`

## 📋 Features

### ✅ Implemented
- **Angular Frontend**: Modern Material Design interface
- **GCP OAuth Authentication**: Secure login with Google Cloud Platform
- **Responsive Design**: Works on desktop and mobile
- **Development Environment**: Easy local development setup

### 🚧 Coming Soon
- **Backend API**: Node.js/Express server for data processing
- **Network Visualization**: Interactive topology graphs
- **VPC Flow Logs**: Traffic analysis and insights
- **Infrastructure**: Terraform deployment scripts
- **CI/CD**: Automated testing and deployment

## 📁 Project Structure

### Frontend (`/frontend`)
Angular 18 application with:
- Material Design components
- GCP Console-like UI
- OAuth authentication
- Standalone component architecture
- TypeScript with strict typing

### Requirements (`/requirements`)
Project documentation including:
- `functional.md` - Feature requirements
- `non-functional.md` - Technical requirements  
- `architecture.md` - System architecture

## 🛠️ Development Commands

From the root directory:
```bash
./start-dev.sh           # Start development environment
```

From the frontend directory:
```bash
npm run start:dev         # Start development server
npm run build:prod        # Build for production
npm test                  # Run tests
npm run lint              # Run linting
```

## 🔍 Troubleshooting

### Common Issues

1. **Port 4200 already in use**:
   ```bash
   lsof -ti:4200 | xargs kill -9
   ```

2. **Dependencies not installed**:
   ```bash
   cd frontend && npm install
   ```

3. **OAuth not working**:
   - Check client ID in environment files
   - Verify authorized domains in Google Cloud Console

### Getting Help

- Check browser console for error messages
- Review `frontend/README.md` for detailed setup
- Verify all prerequisites are installed
- Check the `frontend/src/assets/docs/SETUP.md` guide

## 🤝 Contributing

1. Read the requirements in `/requirements`
2. Follow the architecture guidelines
3. Use TypeScript with strict typing
4. Follow Angular best practices
5. Write tests for new features

## 📄 License

MIT License - see LICENSE file for details

## 🏢 Project Goals

This application aims to provide GCP users with:
- **Clear network visibility**: Understand your cloud infrastructure
- **Traffic insights**: Analyze VPC flow logs and patterns  
- **Performance monitoring**: Real-time metrics and alerting
- **Security analysis**: Detect anomalies and threats
- **Easy deployment**: Infrastructure as code with Terraform

---

Built with ❤️ using Angular, Material Design, and Google Cloud Platform
