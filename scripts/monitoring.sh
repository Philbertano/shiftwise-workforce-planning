#!/bin/bash

# ShiftWise Monitoring and Health Check Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3001}"
LOG_FILE="./logs/monitoring.log"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Health check functions
check_api_health() {
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" || echo "000")
    
    if [ "$status_code" = "200" ]; then
        log "API health check: PASSED"
        return 0
    else
        error "API health check: FAILED (HTTP $status_code)"
        return 1
    fi
}

check_frontend_health() {
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/health" || echo "000")
    
    if [ "$status_code" = "200" ]; then
        log "Frontend health check: PASSED"
        return 0
    else
        error "Frontend health check: FAILED (HTTP $status_code)"
        return 1
    fi
}

check_database_health() {
    local db_status
    db_status=$(docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-shiftwise}" 2>/dev/null || echo "failed")
    
    if echo "$db_status" | grep -q "accepting connections"; then
        log "Database health check: PASSED"
        return 0
    else
        error "Database health check: FAILED"
        return 1
    fi
}

check_redis_health() {
    local redis_status
    redis_status=$(docker-compose exec -T redis redis-cli ping 2>/dev/null || echo "failed")
    
    if [ "$redis_status" = "PONG" ]; then
        log "Redis health check: PASSED"
        return 0
    else
        error "Redis health check: FAILED"
        return 1
    fi
}

# Performance monitoring
check_api_performance() {
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/" || echo "0")
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log "API performance check: PASSED (${response_time}s)"
        return 0
    else
        warn "API performance check: SLOW (${response_time}s)"
        return 1
    fi
}

# Resource monitoring
check_disk_usage() {
    local disk_usage
    disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -lt 80 ]; then
        log "Disk usage check: PASSED (${disk_usage}%)"
        return 0
    elif [ "$disk_usage" -lt 90 ]; then
        warn "Disk usage check: WARNING (${disk_usage}%)"
        return 1
    else
        error "Disk usage check: CRITICAL (${disk_usage}%)"
        return 2
    fi
}

check_memory_usage() {
    local memory_usage
    memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$memory_usage" -lt 80 ]; then
        log "Memory usage check: PASSED (${memory_usage}%)"
        return 0
    elif [ "$memory_usage" -lt 90 ]; then
        warn "Memory usage check: WARNING (${memory_usage}%)"
        return 1
    else
        error "Memory usage check: CRITICAL (${memory_usage}%)"
        return 2
    fi
}

# Container monitoring
check_container_status() {
    local container_name="$1"
    local status
    status=$(docker-compose ps -q "$container_name" | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "not_found")
    
    if [ "$status" = "running" ]; then
        log "Container $container_name: RUNNING"
        return 0
    else
        error "Container $container_name: $status"
        return 1
    fi
}

# Log monitoring
check_error_logs() {
    local error_count
    error_count=$(docker-compose logs --since=1h | grep -i error | wc -l)
    
    if [ "$error_count" -eq 0 ]; then
        log "Error log check: PASSED (0 errors in last hour)"
        return 0
    elif [ "$error_count" -lt 10 ]; then
        warn "Error log check: WARNING ($error_count errors in last hour)"
        return 1
    else
        error "Error log check: CRITICAL ($error_count errors in last hour)"
        return 2
    fi
}

# Alert function
send_alert() {
    local message="$1"
    local severity="$2"
    
    # Log the alert
    case "$severity" in
        "critical")
            error "ALERT: $message"
            ;;
        "warning")
            warn "ALERT: $message"
            ;;
        *)
            info "ALERT: $message"
            ;;
    esac
    
    # Send email alert (if configured)
    if command -v mail &> /dev/null && [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "ShiftWise Alert - $severity" "$ALERT_EMAIL"
    fi
    
    # Send to webhook (if configured)
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"ShiftWise Alert: $message\", \"severity\":\"$severity\"}" \
             2>/dev/null || true
    fi
}

# Comprehensive health check
health_check() {
    log "Starting comprehensive health check..."
    
    local failed_checks=0
    
    # Service health checks
    check_api_health || ((failed_checks++))
    check_frontend_health || ((failed_checks++))
    check_database_health || ((failed_checks++))
    check_redis_health || ((failed_checks++))
    
    # Container status checks
    check_container_status "api" || ((failed_checks++))
    check_container_status "frontend" || ((failed_checks++))
    check_container_status "postgres" || ((failed_checks++))
    check_container_status "redis" || ((failed_checks++))
    
    # Performance checks
    check_api_performance || ((failed_checks++))
    
    # Resource checks
    check_disk_usage || ((failed_checks++))
    check_memory_usage || ((failed_checks++))
    
    # Log checks
    check_error_logs || ((failed_checks++))
    
    if [ "$failed_checks" -eq 0 ]; then
        log "All health checks passed!"
        return 0
    else
        error "$failed_checks health check(s) failed"
        send_alert "$failed_checks health check(s) failed" "warning"
        return 1
    fi
}

# System metrics
show_metrics() {
    info "=== ShiftWise System Metrics ==="
    
    # Container stats
    info "Container Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    # Database stats
    info "Database Connections:"
    docker-compose exec -T postgres psql -U "${POSTGRES_USER:-shiftwise}" -d "${POSTGRES_DB:-shiftwise}" -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "Unable to get DB stats"
    
    # API response times
    info "API Response Times (last 5 requests):"
    for i in {1..5}; do
        response_time=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/" || echo "0")
        echo "Request $i: ${response_time}s"
    done
    
    # Disk usage
    info "Disk Usage:"
    df -h /
    
    # Memory usage
    info "Memory Usage:"
    free -h
    
    # Recent logs
    info "Recent Error Logs (last 10):"
    docker-compose logs --tail=10 | grep -i error || echo "No recent errors"
}

# Backup monitoring
check_backups() {
    local backup_dir="./backups"
    local latest_backup
    
    if [ ! -d "$backup_dir" ]; then
        error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    latest_backup=$(ls -t "$backup_dir"/*.sql 2>/dev/null | head -n1)
    
    if [ -z "$latest_backup" ]; then
        error "No backups found in $backup_dir"
        return 1
    fi
    
    local backup_age
    backup_age=$(( ($(date +%s) - $(stat -c %Y "$latest_backup")) / 86400 ))
    
    if [ "$backup_age" -le 1 ]; then
        log "Backup check: PASSED (latest backup: $(basename "$latest_backup"), age: ${backup_age} days)"
        return 0
    elif [ "$backup_age" -le 7 ]; then
        warn "Backup check: WARNING (latest backup age: ${backup_age} days)"
        return 1
    else
        error "Backup check: CRITICAL (latest backup age: ${backup_age} days)"
        send_alert "Backup is ${backup_age} days old" "critical"
        return 2
    fi
}

# Main script logic
case "$1" in
    health)
        health_check
        ;;
    metrics)
        show_metrics
        ;;
    backups)
        check_backups
        ;;
    monitor)
        # Continuous monitoring mode
        log "Starting continuous monitoring (press Ctrl+C to stop)..."
        while true; do
            health_check
            sleep 300  # Check every 5 minutes
        done
        ;;
    alert-test)
        send_alert "This is a test alert from ShiftWise monitoring" "info"
        ;;
    *)
        echo "Usage: $0 {health|metrics|backups|monitor|alert-test}"
        echo ""
        echo "Commands:"
        echo "  health      Run comprehensive health checks"
        echo "  metrics     Show system metrics and statistics"
        echo "  backups     Check backup status"
        echo "  monitor     Start continuous monitoring"
        echo "  alert-test  Send a test alert"
        echo ""
        echo "Environment variables:"
        echo "  API_URL         API base URL (default: http://localhost:3000)"
        echo "  FRONTEND_URL    Frontend base URL (default: http://localhost:3001)"
        echo "  ALERT_EMAIL     Email for alerts"
        echo "  WEBHOOK_URL     Webhook URL for alerts"
        exit 1
        ;;
esac