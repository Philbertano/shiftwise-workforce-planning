# ShiftWise Test Scenarios Guide

This document provides comprehensive documentation for all test scenarios, expected outcomes, and testing procedures for the ShiftWise workforce planning system.

## Overview

The ShiftWise testing suite includes multiple types of tests designed to validate different aspects of the system:

1. **End-to-End Tests** - Complete workflow validation
2. **Performance Tests** - System performance under load
3. **Security Tests** - Authentication and authorization validation
4. **Load Tests** - Constraint solver performance requirements
5. **Demo Scenarios** - Realistic business scenarios for testing

## Test Data Structure

### Employee Data Distribution

The test data includes realistic employee distributions:

- **70% Full-time employees** (40 hours/week, 8 hours/day max)
- **20% Part-time employees** (20 hours/week, 6 hours/day max)
- **10% Contract employees** (32 hours/week, 8 hours/day max)

### Skill Level Distribution

Employee skills are distributed to simulate realistic workforce capabilities:

- **Senior employees (20%)**: 6-10 skills, mostly level 2-3
- **Mid-level employees (30%)**: 4-7 skills, mostly level 2
- **Junior employees (50%)**: 2-5 skills, mostly level 1-2

### Certification Expiry Patterns

- **90% of certifications**: Valid for 12-36 months
- **10% of certifications**: Expire within 6 months (for testing expiry scenarios)

## End-to-End Test Scenarios

### 1. Complete Planning Workflow

**Objective**: Validate the entire planning process from generation to execution monitoring.

**Test Steps**:
1. Generate initial plan with realistic constraints
2. Review coverage status and gap analysis
3. Get assignment explanations from AI system
4. Simulate what-if scenarios (employee absence)
5. Commit approved assignments
6. Monitor execution status

**Expected Outcomes**:
- Plan generation completes within 3 seconds
- Coverage analysis shows realistic percentages
- AI explanations include skill match reasoning
- What-if scenarios show impact analysis
- Committed assignments are tracked properly

**Success Criteria**:
- All API endpoints respond within expected timeframes
- Data consistency maintained throughout workflow
- Constraint violations properly detected and reported

### 2. Constraint Violation Handling

**Objective**: Test system behavior when constraints cannot be satisfied.

**Test Steps**:
1. Create scenario with insufficient qualified employees
2. Generate plan with artificially low hour limits
3. Verify violation detection and reporting
4. Check suggested remediation actions

**Expected Outcomes**:
- System identifies and reports all constraint violations
- Violation messages are clear and actionable
- Suggested actions include training and alternative assignments
- Hard constraints prevent invalid assignments

### 3. Absence Management Workflow

**Objective**: Validate absence request processing and conflict detection.

**Test Steps**:
1. Submit absence request for employee
2. Check for conflicts with existing assignments
3. Generate plan considering approved absences
4. Verify absent employees are not assigned

**Expected Outcomes**:
- Absence conflicts are detected accurately
- Impact analysis shows affected assignments
- Planning system respects approved absences
- Alternative employees are suggested when available

## Performance Test Scenarios

### 1. Large Dataset Performance

**Test Configuration**:
- 200 employees across 10 stations
- 25 different skills with varying levels
- 4 shift templates (morning, afternoon, night, weekend)
- 30 days of shift demands

**Performance Requirements**:
- Plan generation: < 3 seconds
- Coverage analysis: < 1 second
- Complex queries: < 1 second
- Bulk operations: < 2 seconds

**Success Criteria**:
- 95% of requests complete within time limits
- Memory usage remains under 100MB increase
- Database connections are properly managed

### 2. Concurrent User Load

**Test Configuration**:
- 10 concurrent users
- 5 requests per user
- Mixed operation types (read/write)

**Expected Behavior**:
- System maintains responsiveness
- Data consistency preserved
- No deadlocks or race conditions
- Proper error handling for conflicts

## Security Test Scenarios

### 1. Authentication Testing

**Test Cases**:
- Valid login credentials
- Invalid credentials rejection
- Token expiration handling
- Inactive user account handling

**Expected Outcomes**:
- Only valid users can authenticate
- Expired tokens are rejected
- Inactive accounts cannot log in
- Security events are logged

### 2. Authorization Testing

**Role-Based Access Control**:

**Admin Role**:
- Full access to all endpoints
- Can manage system configuration
- Can access audit logs
- Can delete employees

**Planner Role**:
- Can generate and commit plans
- Can manage absences
- Can view employee data
- Cannot access system configuration

**Viewer Role**:
- Read-only access to plans and employees
- Cannot generate or modify plans
- Cannot manage absences
- Cannot access sensitive data

**Expected Outcomes**:
- Each role has appropriate access levels
- Unauthorized access attempts are blocked
- Security violations are logged
- Sensitive data is protected

## Demo Scenarios

### 1. Critical Skill Shortage

**Setup**: Station requires Level 3 Welding, but only Level 1-2 employees available.

**Expected System Behavior**:
- Identifies coverage gap
- Suggests training programs
- Recommends alternative assignments
- Calculates impact on production

**Test Validation**:
- Gap analysis shows skill level mismatch
- Training recommendations are provided
- Alternative solutions are suggested
- Business impact is quantified

### 2. Mass Absence Event

**Setup**: 30% of workforce absent on same day (flu outbreak simulation).

**Expected System Behavior**:
- Redistributes available workforce
- Prioritizes critical stations
- Suggests overtime assignments
- Identifies uncoverable gaps

**Test Validation**:
- Workload redistribution is fair
- Critical operations maintain coverage
- Overtime recommendations follow labor laws
- Clear communication of gaps

### 3. Certification Expiry Crisis

**Setup**: Multiple employees have certifications expiring soon.

**Expected System Behavior**:
- Warns about expiring certifications
- Suggests renewal schedules
- Identifies alternative qualified employees
- Plans for training needs

**Test Validation**:
- Expiry warnings are timely and accurate
- Alternative assignments maintain coverage
- Training schedules are realistic
- Compliance is maintained

### 4. Overtime Optimization

**Setup**: High demand requiring overtime distribution.

**Expected System Behavior**:
- Distributes overtime fairly
- Considers employee preferences
- Respects maximum hour limits
- Optimizes cost and satisfaction

**Test Validation**:
- Overtime distribution is equitable
- Employee preferences are considered
- Labor law compliance is maintained
- Cost optimization is achieved

## Test Data Factories

### Usage Examples

```typescript
// Create a complete workforce for testing
const workforce = await TestDataFactory.createCompleteWorkforce({
  employeeCount: 50,
  skillCount: 15,
  stationCount: 8,
  shiftTemplateCount: 4
});

// Create a specific planning scenario
const demands = await TestDataFactory.createPlanningScenario({
  date: '2024-01-15',
  stationIds: ['station-1', 'station-2'],
  shiftTemplateIds: ['shift-morning', 'shift-afternoon'],
  demandMultiplier: 1.5 // 50% higher demand
});

// Create a conflict scenario
const absences = await TestDataFactory.createConflictScenario(
  ['emp-001', 'emp-002', 'emp-003'],
  '2024-01-15'
);
```

### Factory Benefits

1. **Consistency**: All tests use the same data generation patterns
2. **Flexibility**: Easy to customize data for specific test scenarios
3. **Maintainability**: Centralized data creation logic
4. **Reusability**: Factories can be used across different test suites

## Running Tests

### Individual Test Suites

```bash
# Run complete workflow tests
npm run test:workflow

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security

# Run load tests
npm run test:load

# Run all e2e tests
npm run test:e2e
```

### Test Environment Setup

1. **Database**: Tests use in-memory SQLite for speed and isolation
2. **Authentication**: Mock JWT tokens for different user roles
3. **Data**: Fresh test data generated for each test suite
4. **Cleanup**: Automatic cleanup after each test run

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is properly initialized
   - Check migration scripts are running
   - Verify test environment variables

2. **Authentication Failures**
   - Confirm JWT secret is set for tests
   - Check user roles are properly configured
   - Verify token generation logic

3. **Performance Test Failures**
   - Monitor system resources during tests
   - Check for memory leaks
   - Verify database query optimization

4. **Data Consistency Issues**
   - Ensure proper test isolation
   - Check factory data relationships
   - Verify cleanup procedures

### Debug Mode

Enable debug logging for detailed test execution information:

```bash
LOG_LEVEL=debug npm run test:e2e
```

## Continuous Integration

### Test Pipeline

1. **Unit Tests**: Fast, isolated component tests
2. **Integration Tests**: Service interaction validation
3. **E2E Tests**: Complete workflow validation
4. **Performance Tests**: Load and stress testing
5. **Security Tests**: Authentication and authorization

### Quality Gates

- **Code Coverage**: Minimum 80% coverage required
- **Performance**: All tests must meet timing requirements
- **Security**: No security vulnerabilities allowed
- **Reliability**: 95% test pass rate required

## Conclusion

This comprehensive test suite ensures the ShiftWise system meets all functional, performance, and security requirements. The combination of automated tests, realistic demo scenarios, and thorough documentation provides confidence in system reliability and helps identify issues early in the development process.

For questions or issues with the test suite, please refer to the troubleshooting section or contact the development team.