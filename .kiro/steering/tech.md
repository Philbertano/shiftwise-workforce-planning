# Technology Stack & Build System

## Core Technologies

### Backend
- **Node.js 18+** with TypeScript 5.0+ for type safety
- **Express.js** REST API with OpenAPI documentation
- **PostgreSQL** (production) / SQLite (development) for data persistence
- **Redis** for caching and session management
- **Zod** for runtime schema validation
- **JWT** for authentication with bcrypt password hashing

### Frontend
- **React 18** with modern hooks and functional components
- **TypeScript 5.0+** for type-safe component development
- **Vite** for fast development and optimized production builds
- **CSS Modules** for component-scoped styling
- **React Router** for client-side routing
- **React DnD** for drag-and-drop interactions

### Testing & Quality
- **Vitest** for unit, integration, and e2e testing
- **Supertest** for API testing
- **Testing Library** for React component testing
- **JSDoc** for code documentation

### Infrastructure
- **Docker** with multi-stage builds for containerization
- **Docker Compose** for local development orchestration
- **AWS ECS/Fargate** for production deployment
- **CloudFormation** for infrastructure as code
- **Nginx** for reverse proxy and static file serving

## Common Commands

### Development
```bash
# Start local development (all services)
./start-local.sh

# Backend development
npm run dev

# Frontend development
cd frontend && npm run dev

# Database operations
npm run migrate
npm run seed
```

### Testing
```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Specific test suites
npm run test:e2e
npm run test:performance
npm run test:scenarios
```

### Build & Deploy
```bash
# Build backend
npm run build

# Build frontend
cd frontend && npm run build

# Docker build
docker-compose up -d

# AWS deployment
cd aws/ec2 && ./deploy-ec2.sh
cd aws/ecs && ./deploy-ecs.sh
```

## Code Standards
- **TypeScript strict mode disabled** for rapid development
- **ESLint** and **Prettier** for code quality (when configured)
- **Conventional Commits** for commit messages
- **95%+ test coverage** requirement for services and models
- **Component-scoped CSS** using CSS modules
- **Functional components** with hooks over class components