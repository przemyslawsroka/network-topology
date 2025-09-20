# Architecture Documentation

## Repository Structure

This document outlines the proposed folder structure for the Network Topology application repository, organizing the codebase into logical components for maintainability and deployment.

```
network-topology/
├── README.md
├── .gitignore
├── docker-compose.yml
├── package.json
├── requirements/
│   ├── functional.md
│   ├── non-functional.md
│   └── architecture.md
├── frontend/
│   ├── package.json
│   ├── angular.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── models/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── directives/
│   │   │   │   ├── pipes/
│   │   │   │   └── material.module.ts
│   │   │   ├── features/
│   │   │   │   └── network-topology/
│   │   │   │       ├── components/
│   │   │   │       ├── services/
│   │   │   │       ├── models/
│   │   │   │       └── network-topology.module.ts
│   │   │   ├── layout/
│   │   │   │   ├── header/
│   │   │   │   ├── sidebar/
│   │   │   │   └── main-layout/
│   │   │   ├── app.component.ts
│   │   │   ├── app.module.ts
│   │   │   └── app-routing.module.ts
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── styles/
│   │   ├── environments/
│   │   └── styles.scss
│   ├── e2e/
│   └── Dockerfile
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── environment.ts
│   │   │   └── logger.ts
│   │   ├── controllers/
│   │   │   ├── topology.controller.ts
│   │   │   ├── metrics.controller.ts
│   │   │   └── flow-logs.controller.ts
│   │   ├── services/
│   │   │   ├── topology.service.ts
│   │   │   ├── metrics.service.ts
│   │   │   ├── flow-logs.service.ts
│   │   │   └── data-processor.service.ts
│   │   ├── models/
│   │   │   ├── network-node.model.ts
│   │   │   ├── flow-log.model.ts
│   │   │   └── metric.model.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── topology.routes.ts
│   │   │   ├── metrics.routes.ts
│   │   │   └── flow-logs.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   └── cors.middleware.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── validators.ts
│   │   │   └── helpers.ts
│   │   └── types/
│   │       ├── api.types.ts
│   │       └── database.types.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   └── Dockerfile
├── infra/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── versions.tf
│   │   ├── modules/
│   │   │   ├── vpc/
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── eks/
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   ├── rds/
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   └── outputs.tf
│   │   │   └── monitoring/
│   │   │       ├── main.tf
│   │   │       ├── variables.tf
│   │   │       └── outputs.tf
│   │   └── environments/
│   │       ├── dev/
│   │       │   ├── terraform.tfvars
│   │       │   └── backend.tf
│   │       ├── staging/
│   │       │   ├── terraform.tfvars
│   │       │   └── backend.tf
│   │       └── prod/
│   │           ├── terraform.tfvars
│   │           └── backend.tf
│   ├── kubernetes/
│   │   ├── namespaces/
│   │   ├── deployments/
│   │   │   ├── frontend-deployment.yaml
│   │   │   └── backend-deployment.yaml
│   │   ├── services/
│   │   │   ├── frontend-service.yaml
│   │   │   └── backend-service.yaml
│   │   ├── ingress/
│   │   │   └── ingress.yaml
│   │   ├── configmaps/
│   │   └── secrets/
│   └── helm/
│       ├── network-topology/
│       │   ├── Chart.yaml
│       │   ├── values.yaml
│       │   ├── values-dev.yaml
│       │   ├── values-staging.yaml
│       │   ├── values-prod.yaml
│       │   └── templates/
│       │       ├── deployment.yaml
│       │       ├── service.yaml
│       │       ├── ingress.yaml
│       │       ├── configmap.yaml
│       │       └── secret.yaml
│       └── dependencies/
├── deploy/
│   ├── scripts/
│   │   ├── build.sh
│   │   ├── deploy.sh
│   │   ├── rollback.sh
│   │   ├── setup-environment.sh
│   │   └── health-check.sh
│   ├── ci-cd/
│   │   ├── .github/
│   │   │   └── workflows/
│   │   │       ├── ci.yml
│   │   │       ├── cd-dev.yml
│   │   │       ├── cd-staging.yml
│   │   │       └── cd-prod.yml
│   │   ├── jenkins/
│   │   │   ├── Jenkinsfile
│   │   │   └── scripts/
│   │   └── gitlab-ci/
│   │       └── .gitlab-ci.yml
│   ├── docker/
│   │   ├── docker-compose.dev.yml
│   │   ├── docker-compose.staging.yml
│   │   ├── docker-compose.prod.yml
│   │   └── nginx/
│   │       ├── nginx.conf
│   │       └── ssl/
│   └── monitoring/
│       ├── prometheus/
│       │   ├── prometheus.yml
│       │   └── rules/
│       ├── grafana/
│       │   ├── dashboards/
│       │   └── datasources/
│       └── alertmanager/
│           └── alertmanager.yml
├── docs/
│   ├── api/
│   │   ├── swagger.yaml
│   │   └── postman/
│   ├── development/
│   │   ├── setup.md
│   │   ├── coding-standards.md
│   │   └── contributing.md
│   └── deployment/
│       ├── local-setup.md
│       ├── staging-deployment.md
│       └── production-deployment.md
└── tests/
    ├── e2e/
    │   ├── cypress/
    │   │   ├── integration/
    │   │   ├── fixtures/
    │   │   └── support/
    │   └── cypress.json
    ├── performance/
    │   ├── k6/
    │   └── artillery/
    └── security/
        ├── zap/
        └── bandit/
```

## Component Descriptions

### Frontend (`/frontend`)
- **Technology**: Angular with TypeScript
- **Location**: `/frontend` directory
- **Purpose**: Houses the Angular application with Material Design components
- **Key Features**:
  - Modular architecture with feature-based organization
  - Shared components and services in dedicated folders
  - GCP Console-like layout components
  - Environment-specific configuration
  - Comprehensive testing setup

### Backend (`/backend`)
- **Technology**: Node.js with Express and TypeScript
- **Location**: `/backend` directory
- **Purpose**: RESTful API server for network topology data
- **Key Features**:
  - MVC architecture with controllers, services, and models
  - Middleware for authentication, validation, and error handling
  - Database integration and data processing services
  - Comprehensive testing structure

### Infrastructure (`/infra`)
- **Technology**: Terraform, Kubernetes, Helm
- **Location**: `/infra` directory
- **Purpose**: Infrastructure as Code for cloud deployment
- **Components**:
  - **Terraform**: Cloud resource provisioning and management
  - **Kubernetes**: Container orchestration manifests
  - **Helm**: Package management for Kubernetes deployments

### Deployment (`/deploy`)
- **Technology**: Shell scripts, Docker, CI/CD pipelines
- **Location**: `/deploy` directory
- **Purpose**: Deployment automation and monitoring
- **Components**:
  - **Scripts**: Build, deploy, and maintenance automation
  - **CI/CD**: Pipeline configurations for multiple platforms
  - **Docker**: Container configurations for different environments
  - **Monitoring**: Observability and alerting setup

## Key Architectural Decisions

### 1. Monorepo Structure
- Single repository containing all components for easier dependency management
- Clear separation of concerns with dedicated folders
- Shared configuration and documentation

### 2. Containerization
- Docker containers for both frontend and backend
- Docker Compose for local development
- Kubernetes for production deployment

### 3. Environment Management
- Separate configurations for dev, staging, and production
- Infrastructure as Code for reproducible deployments
- Environment-specific variable management

### 4. Testing Strategy
- Unit tests within each component
- Integration tests for API endpoints
- E2E tests for complete user workflows
- Performance and security testing suites

### 5. CI/CD Pipeline
- Automated testing on pull requests
- Environment-specific deployment pipelines
- Rollback capabilities and health checks
- Multi-platform CI/CD support (GitHub Actions, Jenkins, GitLab CI)

This architecture ensures scalability, maintainability, and follows modern development practices while supporting the specific requirements of the network topology application.
