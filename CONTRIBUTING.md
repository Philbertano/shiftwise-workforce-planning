# Contributing to ShiftWise

Thank you for your interest in contributing to ShiftWise! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Use issue templates** when available
3. **Provide detailed information**:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Screenshots or logs if applicable

### Suggesting Features

1. **Check the roadmap** and existing feature requests
2. **Open a discussion** before creating a feature request
3. **Describe the use case** and business value
4. **Consider implementation complexity** and maintenance burden

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** from `main`
3. **Make your changes** following our coding standards
4. **Write tests** for new functionality
5. **Update documentation** as needed
6. **Submit a pull request**

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Local Development

```bash
# Clone your fork
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

### Project Structure

```
shiftwise-workforce-planning/
├── src/                    # Backend source code
│   ├── api/               # REST API routes and middleware
│   ├── services/          # Business logic services
│   ├── models/            # Data models and validation
│   ├── repositories/      # Data access layer
│   ├── constraints/       # Constraint system
│   └── test/             # Backend tests
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── types/        # TypeScript type definitions
│   │   └── __tests__/    # Frontend tests
├── docs/                  # Documentation
├── aws/                   # AWS deployment configurations
├── scripts/               # Utility scripts
└── config/               # Configuration files
```

## 📝 Coding Standards

### TypeScript

- Use **strict TypeScript** configuration
- Define **explicit types** for function parameters and returns
- Use **interfaces** for object shapes
- Prefer **type unions** over enums where appropriate

```typescript
// Good
interface Employee {
  id: string;
  name: string;
  skills: EmployeeSkill[];
}

function assignEmployee(employee: Employee, station: Station): Assignment {
  // Implementation
}

// Avoid
function assignEmployee(employee: any, station: any) {
  // Implementation
}
```

### Code Style

- Use **Prettier** for code formatting
- Follow **ESLint** rules
- Use **meaningful variable names**
- Write **self-documenting code**

```typescript
// Good
const unassignedEmployees = employees.filter(emp => !emp.currentAssignment);
const criticalStations = stations.filter(station => station.priority === 'critical');

// Avoid
const emp = employees.filter(e => !e.ca);
const cs = stations.filter(s => s.p === 'critical');
```

### Testing

- Write **unit tests** for all services and utilities
- Create **integration tests** for API endpoints
- Add **component tests** for React components
- Maintain **95%+ test coverage**

```typescript
// Example test structure
describe('PlanningService', () => {
  describe('generatePlan', () => {
    it('should generate valid assignments for all stations', async () => {
      // Arrange
      const employees = createTestEmployees();
      const stations = createTestStations();
      
      // Act
      const plan = await planningService.generatePlan(employees, stations);
      
      // Assert
      expect(plan.assignments).toHaveLength(stations.length);
      expect(plan.violations).toHaveLength(0);
    });
  });
});
```

### Documentation

- Use **JSDoc** for function documentation
- Write **clear commit messages** following Conventional Commits
- Update **README** and relevant docs for new features
- Include **examples** in API documentation

```typescript
/**
 * Generates an optimal shift plan for the given employees and stations.
 * 
 * @param employees - List of available employees with their skills
 * @param stations - List of stations requiring coverage
 * @param constraints - Additional constraints to apply
 * @returns Promise resolving to the generated plan with assignments
 * 
 * @example
 * ```typescript
 * const plan = await generatePlan(employees, stations, {
 *   maxOvertimeHours: 8,
 *   preferredShiftLength: 8
 * });
 * ```
 */
async function generatePlan(
  employees: Employee[],
  stations: Station[],
  constraints?: PlanningConstraints
): Promise<ShiftPlan> {
  // Implementation
}
```

## 🧪 Testing Guidelines

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test service interactions and API endpoints
3. **Component Tests**: Test React components in isolation
4. **End-to-End Tests**: Test complete user workflows

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Integration tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Test Data

- Use **factories** for creating test data
- Create **realistic scenarios** that match production use cases
- Use **deterministic data** to ensure consistent test results

```typescript
// Test data factory example
export function createTestEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: `emp-${Math.random().toString(36).substr(2, 9)}`,
    name: 'John Doe',
    contractType: 'full-time',
    weeklyHours: 40,
    skills: [],
    ...overrides
  };
}
```

## 🚀 Pull Request Process

### Before Submitting

1. **Ensure all tests pass**: `npm test`
2. **Check code quality**: `npm run lint`
3. **Verify type safety**: `npm run type-check`
4. **Update documentation** if needed
5. **Test locally** with `./start-local.sh`

### PR Requirements

- **Clear description** of changes and motivation
- **Link to related issues** or discussions
- **Screenshots** for UI changes
- **Breaking changes** clearly documented
- **Tests** for new functionality

### PR Template

```markdown
## Description
Brief description of changes and why they're needed.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

## 🏷️ Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(planning): add constraint-based optimization algorithm

fix(api): resolve memory leak in plan generation

docs(readme): update installation instructions

test(services): add unit tests for PlanningService
```

## 🎯 Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Release Process

1. **Feature development** on feature branches
2. **Code review** via pull requests
3. **Integration testing** on staging
4. **Release preparation** with version bump
5. **Production deployment** with monitoring

## 🤔 Questions?

- **General questions**: [GitHub Discussions](https://github.com/yourusername/shiftwise-workforce-planning/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/yourusername/shiftwise-workforce-planning/issues)
- **Feature requests**: [GitHub Issues](https://github.com/yourusername/shiftwise-workforce-planning/issues)

## 📄 License

By contributing to ShiftWise, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ShiftWise! 🙏