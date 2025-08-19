# Security Policy

## Supported Versions

We actively support the following versions of ShiftWise with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in ShiftWise, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing: **security@shiftwise.dev**

Include the following information in your report:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any suggested fixes (if available)

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.

2. **Initial Assessment**: We will provide an initial assessment of the vulnerability within 5 business days.

3. **Investigation**: We will investigate the vulnerability and determine its impact and severity.

4. **Resolution**: We will work on a fix and coordinate the release timeline with you.

5. **Disclosure**: We will publicly disclose the vulnerability after a fix is available, giving appropriate credit to the reporter (unless anonymity is requested).

### Security Best Practices

When deploying ShiftWise, please follow these security best practices:

#### Environment Configuration
- Change all default passwords and secrets
- Use strong, unique passwords for database and Redis
- Enable SSL/TLS for all production deployments
- Configure proper CORS origins
- Use environment variables for sensitive configuration

#### Network Security
- Restrict database and Redis access to application servers only
- Use security groups or firewalls to limit network access
- Enable VPC isolation for cloud deployments
- Regularly update SSL certificates

#### Application Security
- Keep dependencies up to date
- Enable audit logging for compliance
- Implement proper role-based access control
- Regularly review user permissions
- Monitor for suspicious activities

#### Infrastructure Security
- Use managed services where possible (RDS, ElastiCache)
- Enable automated backups with encryption
- Implement proper monitoring and alerting
- Regular security assessments and penetration testing
- Keep operating systems and containers updated

### Security Features

ShiftWise includes several built-in security features:

- **Authentication**: JWT-based authentication with configurable expiration
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive input validation and sanitization
- **SQL Injection Protection**: Parameterized queries and ORM usage
- **Rate Limiting**: API rate limiting to prevent abuse
- **Audit Logging**: Comprehensive audit trails for compliance
- **Data Encryption**: Encryption at rest and in transit
- **Security Headers**: OWASP-recommended security headers

### Vulnerability Disclosure Timeline

We aim to follow this timeline for vulnerability disclosure:

1. **Day 0**: Vulnerability reported
2. **Day 1-2**: Acknowledgment sent to reporter
3. **Day 3-7**: Initial assessment and severity classification
4. **Day 8-30**: Investigation and fix development
5. **Day 31-60**: Testing and validation of fix
6. **Day 61-90**: Coordinated disclosure and public release

This timeline may vary based on the complexity and severity of the vulnerability.

### Security Contact

For security-related questions or concerns:
- Email: security@shiftwise.dev
- PGP Key: [Available upon request]

### Hall of Fame

We recognize and thank the following security researchers for responsibly disclosing vulnerabilities:

<!-- This section will be updated as vulnerabilities are reported and fixed -->

---

Thank you for helping keep ShiftWise and our users safe!