# ShiftWise Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying ShiftWise in a production environment using Docker containers, including database setup, monitoring, and maintenance procedures.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended) or macOS
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Memory**: Minimum 4GB RAM (8GB+ recommended)
- **Storage**: Minimum 20GB free space (50GB+ recommended for production)
- **Network**: Ports 80, 443, 3000, 3001, 5432, 6379 available

### Software Dependencies

```bash
# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd shiftwise-workforce-planning

# Copy environment configuration
cp .env.production .env

# Edit environment variables
nano .env
```

### 2. Configure Environment

Update the `.env` file with your production values:

```bash
# Database
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key

# OIDC (if using external authentication)
OIDC_ISSUER_URL=https://your-oidc-provider.com
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret

# Domain configuration
CORS_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
```

### 3. Deploy

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy the application
./scripts/deploy.sh deploy
```

## Detailed Configuration

### Environment Variables

#### Core Application Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment | `production` | Yes |
| `PORT` | API server port | `3000` | No |
| `LOG_LEVEL` | Logging level | `info` | No |

#### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `POSTGRES_DB` | Database name | `shiftwise` | Yes |
| `POSTGRES_USER` | Database user | `shiftwise` | Yes |
| `POSTGRES_PASSWORD` | Database password | - | Yes |

#### Authentication & Security

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | `24h` | No |
| `OIDC_ISSUER_URL` | OIDC provider URL | - | No |
| `OIDC_CLIENT_ID` | OIDC client ID | - | No |
| `OIDC_CLIENT_SECRET` | OIDC client secret | - | No |

### SSL/TLS Configuration

#### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem

# Enable nginx SSL profile
docker-compose --profile nginx up -d
```

#### Using Custom Certificates

```bash
# Place your certificates in the ssl directory
cp your-cert.pem ./ssl/cert.pem
cp your-key.pem ./ssl/key.pem

# Update nginx.conf to enable SSL server block
# Uncomment the SSL server configuration
```

### Database Setup

#### Initial Setup

The deployment script automatically runs database migrations. For manual setup:

```bash
# Run migrations
docker-compose exec api npm run migrate

# Seed initial data (optional)
docker-compose exec api npm run seed
```

#### Database Backup and Restore

```bash
# Create backup
./scripts/deploy.sh backup

# Manual backup
docker-compose exec postgres pg_dump -U shiftwise shiftwise > backup.sql

# Restore from backup
docker-compose exec -T postgres psql -U shiftwise -d shiftwise < backup.sql
```

## Monitoring and Maintenance

### Health Monitoring

```bash
# Run health checks
./scripts/monitoring.sh health

# View system metrics
./scripts/monitoring.sh metrics

# Start continuous monitoring
./scripts/monitoring.sh monitor
```

### Log Management

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f frontend

# View logs with timestamps
docker-compose logs -f -t api
```

### Performance Monitoring

#### Key Metrics to Monitor

1. **API Response Times**: Should be < 3 seconds for plan generation
2. **Database Connections**: Monitor active connections
3. **Memory Usage**: Should stay below 80%
4. **Disk Usage**: Monitor for log growth and database size
5. **Error Rates**: Monitor application and system errors

#### Monitoring Tools Integration

```bash
# Prometheus metrics (if enabled)
curl http://localhost:9090/metrics

# Health check endpoints
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Backup Strategy

#### Automated Backups

```bash
# Add to crontab for daily backups
0 2 * * * /path/to/shiftwise/scripts/deploy.sh backup

# Weekly backup cleanup (keep last 4 weeks)
0 3 * * 0 find /path/to/shiftwise/backups -name "*.sql" -mtime +28 -delete
```

#### Backup Verification

```bash
# Check backup status
./scripts/monitoring.sh backups

# Test backup restore (on staging)
./scripts/deploy.sh rollback
```

## Scaling and Performance

### Horizontal Scaling

#### API Service Scaling

```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
    # ... other configuration
```

#### Load Balancer Configuration

```nginx
# nginx.conf
upstream api_backend {
    server api_1:3000;
    server api_2:3000;
    server api_3:3000;
    keepalive 32;
}
```

### Database Optimization

#### Connection Pooling

```bash
# Environment variables
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_IDLE_TIMEOUT=30000
```

#### Performance Tuning

```sql
-- PostgreSQL configuration
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
```

### Caching Strategy

#### Redis Configuration

```bash
# Redis memory optimization
REDIS_MAXMEMORY=512mb
REDIS_MAXMEMORY_POLICY=allkeys-lru
```

## Security Considerations

### Network Security

```bash
# Firewall configuration (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Container Security

```dockerfile
# Use non-root user in containers
USER shiftwise

# Read-only root filesystem
--read-only --tmpfs /tmp
```

### Database Security

```sql
-- Create read-only user for monitoring
CREATE USER monitoring WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE shiftwise TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
```

## Troubleshooting

### Common Issues

#### Service Won't Start

```bash
# Check container logs
docker-compose logs api

# Check system resources
df -h
free -h

# Restart services
docker-compose restart api
```

#### Database Connection Issues

```bash
# Check database status
docker-compose exec postgres pg_isready

# Check connection from API
docker-compose exec api npm run db:test

# Reset database connection
docker-compose restart postgres
```

#### Performance Issues

```bash
# Check resource usage
docker stats

# Analyze slow queries
docker-compose exec postgres psql -U shiftwise -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Clear cache
docker-compose exec redis redis-cli FLUSHALL
```

### Emergency Procedures

#### Service Recovery

```bash
# Quick restart
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d --build

# Rollback to previous version
./scripts/deploy.sh rollback
```

#### Data Recovery

```bash
# Restore from latest backup
./scripts/deploy.sh rollback

# Point-in-time recovery (if WAL archiving enabled)
# Contact database administrator
```

## Maintenance Schedule

### Daily Tasks

- Monitor system health
- Check error logs
- Verify backup completion

### Weekly Tasks

- Review performance metrics
- Update security patches
- Clean up old logs and backups

### Monthly Tasks

- Review and update SSL certificates
- Database maintenance (VACUUM, ANALYZE)
- Security audit
- Capacity planning review

## Support and Documentation

### Log Locations

- Application logs: `./logs/shiftwise.log`
- Container logs: `docker-compose logs`
- System logs: `/var/log/syslog`

### Configuration Files

- Main configuration: `.env`
- Docker Compose: `docker-compose.yml`
- Nginx configuration: `nginx.conf`
- Database schema: `src/database/schema.sql`

### Useful Commands

```bash
# Service management
./scripts/deploy.sh {deploy|rollback|stop|status|logs}

# Monitoring
./scripts/monitoring.sh {health|metrics|backups|monitor}

# Docker operations
docker-compose {up|down|restart|logs|ps|exec}

# Database operations
docker-compose exec postgres psql -U shiftwise
```

For additional support, refer to the project documentation or contact the development team.