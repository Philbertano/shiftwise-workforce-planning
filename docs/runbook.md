# ShiftWise Operations Runbook

## Overview

This runbook provides step-by-step procedures for common operational tasks, troubleshooting, and emergency response for the ShiftWise workforce planning system.

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Frontend      │    │      API        │
│  Load Balancer  │────│   (React)       │────│   (Node.js)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │     Redis       │    │   PostgreSQL    │
                       │    (Cache)      │────│   (Database)    │
                       │                 │    │                 │
                       └─────────────────┘    └─────────────────┘
```

## Standard Operating Procedures

### 1. Service Health Checks

#### Daily Health Check Procedure

```bash
# 1. Run comprehensive health check
./scripts/monitoring.sh health

# 2. Check service status
docker-compose ps

# 3. Review error logs from last 24 hours
docker-compose logs --since=24h | grep -i error

# 4. Verify backup completion
./scripts/monitoring.sh backups

# 5. Check disk space
df -h

# 6. Check memory usage
free -h
```

#### Expected Results

- All health checks should return "PASSED"
- All containers should show "Up" status
- Error count should be < 10 in 24 hours
- Latest backup should be < 24 hours old
- Disk usage should be < 80%
- Memory usage should be < 80%

### 2. Deployment Procedures

#### Standard Deployment

```bash
# 1. Notify team of deployment
echo "Starting deployment at $(date)"

# 2. Create backup
./scripts/deploy.sh backup

# 3. Deploy new version
./scripts/deploy.sh deploy

# 4. Verify deployment
./scripts/monitoring.sh health

# 5. Monitor for 15 minutes
./scripts/monitoring.sh monitor &
sleep 900
kill %1

# 6. Confirm deployment success
echo "Deployment completed at $(date)"
```

#### Emergency Rollback

```bash
# 1. Immediate rollback
./scripts/deploy.sh rollback

# 2. Verify services are running
docker-compose ps

# 3. Check health
./scripts/monitoring.sh health

# 4. Notify team
echo "Emergency rollback completed at $(date)"
```

### 3. Database Maintenance

#### Weekly Database Maintenance

```bash
# 1. Create backup before maintenance
docker-compose exec postgres pg_dump -U shiftwise shiftwise > maintenance_backup_$(date +%Y%m%d).sql

# 2. Run VACUUM and ANALYZE
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "VACUUM ANALYZE;"

# 3. Check database statistics
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables 
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC 
LIMIT 10;"

# 4. Check slow queries
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"
```

#### Database Connection Issues

```bash
# 1. Check PostgreSQL status
docker-compose exec postgres pg_isready -U shiftwise

# 2. Check active connections
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT count(*) as active_connections, state 
FROM pg_stat_activity 
GROUP BY state;"

# 3. Kill long-running queries (if needed)
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < now() - interval '5 minutes'
AND query NOT LIKE '%pg_stat_activity%';"

# 4. Restart database if necessary
docker-compose restart postgres
```

## Troubleshooting Guide

### 1. API Service Issues

#### Symptom: API Returns 500 Errors

**Diagnosis Steps:**

```bash
# 1. Check API logs
docker-compose logs api --tail=100

# 2. Check API health endpoint
curl -v http://localhost:3000/health

# 3. Check database connectivity
docker-compose exec api npm run db:test

# 4. Check memory usage
docker stats api --no-stream
```

**Resolution Steps:**

```bash
# If memory issue:
docker-compose restart api

# If database connectivity issue:
docker-compose restart postgres
sleep 30
docker-compose restart api

# If persistent issues:
docker-compose down
docker-compose up -d
```

#### Symptom: Slow API Response Times

**Diagnosis Steps:**

```bash
# 1. Check response times
for i in {1..5}; do
  curl -w "Response time: %{time_total}s\n" -o /dev/null -s http://localhost:3000/
done

# 2. Check database performance
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;"

# 3. Check system resources
docker stats --no-stream
```

**Resolution Steps:**

```bash
# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Restart API service
docker-compose restart api

# If database is slow, run maintenance
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "VACUUM ANALYZE;"
```

### 2. Database Issues

#### Symptom: Database Connection Refused

**Diagnosis Steps:**

```bash
# 1. Check PostgreSQL container status
docker-compose ps postgres

# 2. Check PostgreSQL logs
docker-compose logs postgres --tail=50

# 3. Check disk space
df -h

# 4. Check PostgreSQL process
docker-compose exec postgres ps aux | grep postgres
```

**Resolution Steps:**

```bash
# If container is down:
docker-compose up -d postgres

# If disk space issue:
# Clean up old logs and backups
find ./logs -name "*.log" -mtime +7 -delete
find ./backups -name "*.sql" -mtime +30 -delete

# If corruption suspected:
docker-compose down postgres
docker volume rm shiftwise_postgres_data
docker-compose up -d postgres
# Restore from backup
```

#### Symptom: Database Performance Issues

**Diagnosis Steps:**

```bash
# 1. Check active connections
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# 2. Check slow queries
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < now() - interval '30 seconds';"

# 3. Check database size
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT pg_size_pretty(pg_database_size('shiftwise'));"
```

**Resolution Steps:**

```bash
# Kill long-running queries
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' 
AND query_start < now() - interval '5 minutes';"

# Run database maintenance
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "VACUUM ANALYZE;"

# Restart PostgreSQL
docker-compose restart postgres
```

### 3. Frontend Issues

#### Symptom: Frontend Not Loading

**Diagnosis Steps:**

```bash
# 1. Check frontend container status
docker-compose ps frontend

# 2. Check frontend logs
docker-compose logs frontend --tail=50

# 3. Check nginx logs (if using nginx)
docker-compose logs nginx --tail=50

# 4. Test direct access
curl -v http://localhost:3001/
```

**Resolution Steps:**

```bash
# Restart frontend
docker-compose restart frontend

# If nginx issues:
docker-compose restart nginx

# Rebuild frontend if needed
docker-compose up -d --build frontend
```

### 4. Redis Cache Issues

#### Symptom: Cache Not Working

**Diagnosis Steps:**

```bash
# 1. Check Redis status
docker-compose exec redis redis-cli ping

# 2. Check Redis memory usage
docker-compose exec redis redis-cli info memory

# 3. Check Redis logs
docker-compose logs redis --tail=50
```

**Resolution Steps:**

```bash
# Clear cache
docker-compose exec redis redis-cli FLUSHALL

# Restart Redis
docker-compose restart redis

# Check Redis configuration
docker-compose exec redis redis-cli config get maxmemory
```

## Emergency Response Procedures

### 1. Complete System Outage

**Immediate Actions (0-5 minutes):**

```bash
# 1. Check all services
docker-compose ps

# 2. Restart all services
docker-compose restart

# 3. Check health
./scripts/monitoring.sh health

# 4. If still down, full restart
docker-compose down
docker-compose up -d
```

**Follow-up Actions (5-15 minutes):**

```bash
# 1. Monitor logs for errors
docker-compose logs -f

# 2. Check system resources
df -h && free -h

# 3. Verify functionality
curl http://localhost:3000/health
curl http://localhost:3001/health

# 4. If issues persist, rollback
./scripts/deploy.sh rollback
```

### 2. Database Corruption

**Immediate Actions:**

```bash
# 1. Stop all services
docker-compose down

# 2. Backup current state (even if corrupted)
cp -r ./data/postgres ./data/postgres_corrupted_$(date +%Y%m%d_%H%M%S)

# 3. Find latest good backup
ls -la ./backups/

# 4. Restore from backup
docker-compose up -d postgres
sleep 30
docker-compose exec -T postgres psql -U shiftwise -d shiftwise < ./backups/latest_backup.sql

# 5. Start all services
docker-compose up -d
```

### 3. Security Incident

**Immediate Actions:**

```bash
# 1. Stop all services
docker-compose down

# 2. Backup logs for analysis
cp -r ./logs ./logs_incident_$(date +%Y%m%d_%H%M%S)

# 3. Check for unauthorized access
docker-compose logs | grep -i "unauthorized\|failed\|error" > security_analysis.log

# 4. Change all passwords
# Update .env file with new passwords
# Regenerate JWT secrets

# 5. Restart with new credentials
docker-compose up -d
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_assignments_employee_date 
ON assignments(employee_id, created_at);

CREATE INDEX CONCURRENTLY idx_shift_demands_date_station 
ON shift_demands(date, station_id);

-- Update table statistics
ANALYZE assignments;
ANALYZE shift_demands;
ANALYZE employees;
```

### 2. API Performance Tuning

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable API caching
export ENABLE_CACHE=true
export CACHE_TTL=3600

# Restart API with new settings
docker-compose restart api
```

### 3. System Resource Optimization

```bash
# Clean up Docker resources
docker system prune -f

# Clean up old logs
find ./logs -name "*.log" -mtime +7 -delete

# Optimize PostgreSQL settings
docker-compose exec postgres psql -U shiftwise -d shiftwise -c "
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
SELECT pg_reload_conf();"
```

## Monitoring and Alerting

### 1. Key Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time | > 3 seconds | Investigate performance |
| Database Connections | > 80% of max | Scale or optimize |
| Memory Usage | > 85% | Restart services |
| Disk Usage | > 90% | Clean up or expand |
| Error Rate | > 5% | Check logs and fix |

### 2. Alert Configuration

```bash
# Set up monitoring alerts
export ALERT_EMAIL="admin@company.com"
export WEBHOOK_URL="https://hooks.slack.com/your-webhook"

# Test alerts
./scripts/monitoring.sh alert-test
```

### 3. Log Analysis

```bash
# Find most common errors
docker-compose logs | grep ERROR | sort | uniq -c | sort -nr | head -10

# Monitor real-time errors
docker-compose logs -f | grep -i error

# Analyze API performance
docker-compose logs api | grep "Response time" | tail -100
```

## Backup and Recovery

### 1. Backup Verification

```bash
# Test backup integrity
pg_restore --list ./backups/latest_backup.sql | head -20

# Test restore on staging
docker-compose -f docker-compose.staging.yml exec postgres psql -U shiftwise -d shiftwise_staging < ./backups/latest_backup.sql
```

### 2. Point-in-Time Recovery

```bash
# If WAL archiving is enabled
# Stop PostgreSQL
docker-compose stop postgres

# Restore base backup
# Apply WAL files up to specific time
# Start PostgreSQL
docker-compose start postgres
```

## Contact Information

### Escalation Procedures

1. **Level 1**: Operations Team
2. **Level 2**: Development Team
3. **Level 3**: System Architects

### Emergency Contacts

- **Operations**: ops@company.com
- **Development**: dev@company.com
- **Management**: management@company.com

### External Vendors

- **Cloud Provider**: support@cloudprovider.com
- **Database Support**: dba@company.com
- **Security Team**: security@company.com