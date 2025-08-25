# Project Structure & Organization

## Root Directory Layout

```
shiftwise-workforce-planning/
├── src/                    # Backend source code
├── frontend/               # React frontend application
├── aws/                    # AWS deployment configurations
├── config/                 # Environment configurations
├── docs/                   # Documentation
├── scripts/                # Deployment and utility scripts
├── data/                   # Local database files
├── logs/                   # Application logs
└── ssl/                    # SSL certificates
```

## Backend Structure (`src/`)

### Core Directories
- **`api/`** - REST API layer
  - `routes/` - Express route handlers
  - `middleware/` - Authentication, validation, CORS
  - `schemas/` - Zod validation schemas
- **`models/`** - Data models and TypeScript interfaces
- **`repositories/`** - Data access layer with database operations
- **`services/`** - Business logic and core algorithms
- **`constraints/`** - Constraint satisfaction system
  - `base/` - Core constraint framework
  - `hard/` - Hard constraints (must be satisfied)
  - `soft/` - Soft constraints (optimization targets)
- **`database/`** - Database schema, migrations, and configuration
- **`types/`** - Shared TypeScript type definitions
- **`test/`** - Comprehensive test suite

### Key Patterns
- **Repository Pattern**: Data access abstraction in `repositories/`
- **Service Layer**: Business logic separation in `services/`
- **Constraint System**: Modular constraint validation in `constraints/`
- **Schema Validation**: Zod schemas in `api/schemas/`

## Frontend Structure (`frontend/src/`)

### Core Directories
- **`components/`** - React components organized by feature
  - Each component has its own folder with `.tsx`, `.css`, and `__tests__/`
  - Index files for clean imports
- **`pages/`** - Top-level page components for routing
- **`services/`** - API client and external service integrations
- **`contexts/`** - React context providers for state management
- **`types/`** - Frontend-specific TypeScript definitions
- **`test/`** - Frontend test utilities and setup

### Component Organization
- **Feature-based folders**: `PlanningBoard/`, `EmployeeManagement/`, etc.
- **Co-located tests**: `__tests__/` folder within each component directory
- **CSS Modules**: Component-scoped styling with `.css` files
- **Index exports**: Clean import paths using `index.ts` files

## Configuration & Infrastructure

### Environment Management
- **`config/environments/`** - Environment-specific configurations
- **`.env` files** - Local environment variables
- **Docker Compose** - Multi-service local development

### Deployment
- **`aws/`** - Cloud deployment configurations
  - `ec2/` - Simple EC2 deployment
  - `ecs/` - Production ECS/Fargate deployment
- **`scripts/`** - Automation scripts for deployment and monitoring
- **Dockerfiles** - Multi-stage builds for backend and frontend

## Testing Structure

### Backend Tests (`src/test/`)
- **`api/`** - API endpoint testing
- **`services/`** - Business logic unit tests
- **`models/`** - Data model validation
- **`repositories/`** - Database operation tests
- **`constraints/`** - Constraint system validation
- **`e2e/`** - End-to-end workflow tests
- **`integration/`** - Cross-system integration tests

### Frontend Tests (`frontend/src/components/*/tests/`)
- **Component tests** - React Testing Library
- **Integration tests** - Multi-component workflows
- **Setup files** - Test configuration and utilities

## Naming Conventions

### Files & Directories
- **PascalCase** for components and classes: `PlanningBoard.tsx`
- **camelCase** for services and utilities: `employeeService.ts`
- **kebab-case** for routes and endpoints: `/api/shift-assignments`
- **lowercase** for configuration files: `package.json`, `tsconfig.json`

### Code Structure
- **Interfaces** prefixed with `I`: `IEmployee`, `IConstraint`
- **Types** suffixed with `Type`: `AssignmentType`, `ConstraintType`
- **Enums** in PascalCase: `ContractType`, `SkillLevel`
- **Constants** in UPPER_SNAKE_CASE: `MAX_HOURS_PER_DAY`