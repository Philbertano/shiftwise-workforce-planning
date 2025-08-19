# ShiftWise - AI-Powered Workforce Planning System

<div align="center">

![ShiftWise Logo](https://via.placeholder.com/200x80/2563eb/ffffff?text=ShiftWise)

**Intelligent workforce planning for production environments with AI-powered optimization**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Deployable-ff9900.svg)](https://aws.amazon.com/)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🎯 Features](#-features) • [🏗️ Architecture](#️-architecture) • [🤝 Contributing](#-contributing)

</div>

## 🎯 Overview

ShiftWise is a comprehensive workforce planning system designed for production environments. It uses AI-powered algorithms to automatically generate optimal shift assignments while ensuring compliance with labor laws, skill requirements, and operational constraints.

### Key Capabilities

- **🤖 AI-Powered Planning**: Automatic shift generation with constraint satisfaction
- **📊 Real-time Coverage Analysis**: Visual heatmaps and gap identification
- **🔄 What-if Simulations**: Impact analysis for absences and changes
- **💬 Natural Language Interface**: AI assistant for planning queries
- **📈 Performance Optimization**: Sub-3-second plan generation for 200+ employees
- **🔒 Enterprise Security**: Role-based access control and audit trails

## 🚀 Quick Start

### Local Development (5 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/shiftwise-workforce-planning.git
cd shiftwise-workforce-planning

# Start with one command
chmod +x start-local.sh
./start-local.sh
```

Access the application at **http://localhost:3001**

### Docker Compose

```bash
# Copy environment configuration
cp config/environments/development.env .env

# Start all services
docker-compose up -d

# Run migrations and load demo data
docker-compose exec api npm run migrate
docker-compose exec api npm run seed
```

### AWS Deployment

```bash
# EC2 deployment (simple)
cd aws/ec2
./deploy-ec2.sh

# ECS Fargate deployment (production)
cd aws/ecs
./deploy-ecs.sh
```

## 🎯 Features

### 🤖 Intelligent Planning
- **Constraint-based optimization** with hard and soft constraints
- **Fairness algorithms** ensuring equitable workload distribution
- **Skill matching** with certification tracking and expiry management
- **Labor law compliance** with automatic violation detection

### 📊 Visual Analytics
- **Coverage heatmaps** showing staffing levels across time and stations
- **Gap analysis** with criticality rankings and risk assessment
- **Trend analysis** for capacity planning and optimization
- **Real-time dashboards** with key performance indicators

### 🔄 Scenario Planning
- **What-if simulations** for absence impact analysis
- **Capacity modeling** for demand forecasting
- **Risk assessment** with mitigation recommendations
- **Change impact analysis** before plan commitment

### 💬 AI Assistant
- **Natural language queries** for planning operations
- **Explanation engine** providing reasoning for assignments
- **Optimization suggestions** based on historical data
- **Interactive planning** with conversational interface

### 🏢 Enterprise Features
- **Role-based access control** with granular permissions
- **Comprehensive audit trails** for compliance and tracking
- **Multi-tenant architecture** supporting multiple facilities
- **Integration APIs** for HR and ERP systems

## 🏗️ Architecture

### Technology Stack

**Backend**
- **Node.js** with TypeScript for type safety
- **Express.js** for REST API with OpenAPI documentation
- **PostgreSQL** for relational data with ACID compliance
- **Redis** for caching and session management

**Frontend**
- **React 18** with modern hooks and context
- **TypeScript** for type-safe component development
- **Vite** for fast development and optimized builds
- **CSS Modules** for component-scoped styling

**AI & Optimization**
- **Constraint satisfaction algorithms** for optimal assignments
- **Greedy optimization** with backtracking for complex scenarios
- **Natural language processing** for AI assistant interactions
- **Machine learning** for pattern recognition and suggestions

**Infrastructure**
- **Docker** containerization for consistent deployments
- **AWS ECS/Fargate** for scalable container orchestration
- **CloudFormation** for infrastructure as code
- **CloudWatch** for monitoring and logging

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Express API   │    │   PostgreSQL    │
│                 │    │                 │    │                 │
│ • Planning UI   │◄──►│ • REST Endpoints│◄──►│ • Employee Data │
│ • Dashboards    │    │ • AI Integration│    │ • Assignments   │
│ • AI Assistant  │    │ • Optimization  │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │      Redis      │
                       │                 │
                       │ • Session Cache │
                       │ • Plan Cache    │
                       │ • Rate Limiting │
                       └─────────────────┘
```

## 📖 Documentation

### Getting Started
- [🚀 Quick Start Guide](README-LOCAL.md) - Get running in 5 minutes
- [🐳 Docker Setup](docs/deployment-guide.md) - Container deployment
- [☁️ AWS Deployment](aws/README.md) - Cloud deployment options

### Development
- [🏗️ Architecture Guide](.kiro/specs/shiftwise-workforce-planning/design.md) - System design and components
- [📋 Requirements](.kiro/specs/shiftwise-workforce-planning/requirements.md) - Functional requirements
- [🧪 Testing Guide](src/test/documentation/test-scenarios-guide.md) - Test scenarios and validation

### Operations
- [📚 Runbook](docs/runbook.md) - Operational procedures
- [📊 Monitoring](scripts/monitoring.sh) - Health checks and metrics
- [🔧 Troubleshooting](docs/deployment-guide.md#troubleshooting) - Common issues and solutions

## 🧪 Testing

### Run Tests Locally

```bash
# Unit tests
npm test

# Integration tests
npm run test:e2e

# Performance tests
npm run test:performance

# Complete test suite
npm run test:scenarios
```

### Test Coverage

- **Unit Tests**: 95%+ coverage for services and models
- **Integration Tests**: Complete API and database testing
- **End-to-End Tests**: Full workflow validation
- **Performance Tests**: Load testing for 200+ employees
- **Security Tests**: Authentication and authorization validation

## 🚀 Deployment Options

### Development
- **Local Docker Compose**: Quick setup for development
- **Hot reload**: Automatic code reloading during development
- **Debug tools**: Integrated debugging and profiling

### Production

| Option | Use Case | Monthly Cost | Complexity |
|--------|----------|--------------|------------|
| **EC2 + Docker** | Small teams, simple setup | $30-50 | Low |
| **ECS Fargate** | Production, auto-scaling | $50-100 | Medium |
| **EKS** | Enterprise, advanced orchestration | $100-200+ | High |

### Cloud Features
- **Auto-scaling** based on demand
- **Load balancing** for high availability
- **Managed databases** with automated backups
- **SSL/TLS termination** with AWS Certificate Manager
- **Monitoring** with CloudWatch and custom dashboards

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/shiftwise-workforce-planning.git
cd shiftwise-workforce-planning

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start development environment
./start-local.sh

# Run tests
npm test
```

### Code Standards
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Conventional Commits** for commit messages
- **Jest** for testing with high coverage requirements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Kiro AI](https://kiro.ai) for intelligent development assistance
- Inspired by modern workforce management challenges
- Designed for production environments with real-world constraints

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/shiftwise-workforce-planning/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/shiftwise-workforce-planning/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/shiftwise-workforce-planning/discussions)

---

<div align="center">

**Made with ❤️ for better workforce planning**

[⭐ Star this repo](https://github.com/yourusername/shiftwise-workforce-planning) if you find it useful!

</div>