#!/bin/bash

# ShiftWise Production Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        warn "Environment file $ENV_FILE not found, copying from .env.production"
        cp .env.production "$ENV_FILE"
    fi
    
    log "Prerequisites check completed"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    mkdir -p logs
    mkdir -p "$BACKUP_DIR"
    mkdir -p ssl
    log "Directories created"
}

# Backup database
backup_database() {
    if [ "$1" = "--skip-backup" ]; then
        log "Skipping database backup"
        return
    fi
    
    log "Creating database backup..."
    
    # Check if postgres container is running
    if docker-compose ps postgres | grep -q "Up"; then
        BACKUP_FILE="$BACKUP_DIR/shiftwise_backup_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec -T postgres pg_dump -U "${POSTGRES_USER:-shiftwise}" "${POSTGRES_DB:-shiftwise}" > "$BACKUP_FILE"
        log "Database backup created: $BACKUP_FILE"
    else
        warn "PostgreSQL container not running, skipping backup"
    fi
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    docker-compose exec api npm run migrate
    log "Database migrations completed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check API health
    if curl -f http://localhost:${API_PORT:-3000}/health > /dev/null 2>&1; then
        log "API health check passed"
    else
        error "API health check failed"
    fi
    
    # Check frontend health
    if curl -f http://localhost:${FRONTEND_PORT:-3001}/health > /dev/null 2>&1; then
        log "Frontend health check passed"
    else
        error "Frontend health check failed"
    fi
    
    log "All health checks passed"
}

# Deploy function
deploy() {
    local SKIP_BACKUP=""
    local FORCE_REBUILD=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP="--skip-backup"
                shift
                ;;
            --force-rebuild)
                FORCE_REBUILD="--build"
                shift
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    log "Starting ShiftWise deployment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create directories
    create_directories
    
    # Backup database
    backup_database "$SKIP_BACKUP"
    
    # Pull latest images
    log "Pulling latest images..."
    docker-compose pull
    
    # Build and start services
    log "Building and starting services..."
    docker-compose up -d $FORCE_REBUILD
    
    # Run migrations
    run_migrations
    
    # Health check
    health_check
    
    log "Deployment completed successfully!"
    log "Services are available at:"
    log "  - API: http://localhost:${API_PORT:-3000}"
    log "  - Frontend: http://localhost:${FRONTEND_PORT:-3001}"
    log "  - Nginx (if enabled): http://localhost:${NGINX_PORT:-80}"
}

# Rollback function
rollback() {
    log "Starting rollback..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -n1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to backup: $LATEST_BACKUP"
    
    # Stop services
    docker-compose down
    
    # Restore database
    docker-compose up -d postgres
    sleep 10
    docker-compose exec -T postgres psql -U "${POSTGRES_USER:-shiftwise}" -d "${POSTGRES_DB:-shiftwise}" < "$LATEST_BACKUP"
    
    # Start services
    docker-compose up -d
    
    log "Rollback completed"
}

# Stop function
stop() {
    log "Stopping ShiftWise services..."
    docker-compose down
    log "Services stopped"
}

# Status function
status() {
    log "ShiftWise service status:"
    docker-compose ps
}

# Logs function
logs() {
    local SERVICE="$1"
    if [ -n "$SERVICE" ]; then
        docker-compose logs -f "$SERVICE"
    else
        docker-compose logs -f
    fi
}

# Main script logic
case "$1" in
    deploy)
        shift
        deploy "$@"
        ;;
    rollback)
        rollback
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    logs)
        shift
        logs "$@"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|stop|status|logs} [options]"
        echo ""
        echo "Commands:"
        echo "  deploy [--skip-backup] [--force-rebuild]  Deploy the application"
        echo "  rollback                                  Rollback to previous version"
        echo "  stop                                      Stop all services"
        echo "  status                                    Show service status"
        echo "  logs [service]                           Show logs for all or specific service"
        echo ""
        echo "Examples:"
        echo "  $0 deploy                                 Deploy with backup"
        echo "  $0 deploy --skip-backup                   Deploy without backup"
        echo "  $0 deploy --force-rebuild                 Deploy with forced rebuild"
        echo "  $0 logs api                               Show API logs"
        exit 1
        ;;
esac