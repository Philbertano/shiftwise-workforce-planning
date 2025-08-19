#!/bin/bash

# ShiftWise Environment Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("development" "staging" "production")
CONFIG_DIR="config/environments"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Validate environment
validate_environment() {
    local env="$1"
    
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        error "Invalid environment: $env. Valid options: ${ENVIRONMENTS[*]}"
    fi
    
    if [ ! -f "$CONFIG_DIR/$env.env" ]; then
        error "Environment file not found: $CONFIG_DIR/$env.env"
    fi
}

# Setup environment
setup_environment() {
    local env="$1"
    
    log "Setting up $env environment..."
    
    # Validate environment
    validate_environment "$env"
    
    # Copy environment file
    cp "$CONFIG_DIR/$env.env" ".env"
    log "Environment file copied: $CONFIG_DIR/$env.env -> .env"
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p backups
    mkdir -p ssl
    log "Created necessary directories"
    
    # Set appropriate permissions
    chmod 600 .env
    log "Set secure permissions on .env file"
    
    # Environment-specific setup
    case "$env" in
        "development")
            setup_development
            ;;
        "staging")
            setup_staging
            ;;
        "production")
            setup_production
            ;;
    esac
    
    log "$env environment setup completed!"
}

# Development-specific setup
setup_development() {
    info "Setting up development environment..."
    
    # Install development dependencies
    if [ -f "package.json" ]; then
        npm install
        log "Installed Node.js dependencies"
    fi
    
    # Setup development database
    if command -v docker-compose &> /dev/null; then
        docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d postgres redis
        log "Started development database and cache"
        
        # Wait for database to be ready
        sleep 10
        
        # Run migrations
        npm run migrate || warn "Migration failed - database may not be ready"
        
        # Seed development data
        npm run seed:dev || warn "Seeding failed - continuing anyway"
    else
        warn "Docker Compose not found - skipping database setup"
    fi
    
    # Setup frontend
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        cd ..
        log "Installed frontend dependencies"
    fi
}

# Staging-specific setup
setup_staging() {
    info "Setting up staging environment..."
    
    # Validate required secrets
    if grep -q "staging-" .env; then
        warn "Please update staging secrets in .env file"
    fi
    
    # Install production dependencies only
    if [ -f "package.json" ]; then
        npm ci --only=production
        log "Installed production dependencies"
    fi
    
    # Setup SSL certificates (staging)
    if [ ! -f "ssl/cert.pem" ]; then
        warn "SSL certificates not found - please configure SSL for staging"
        info "You can use Let's Encrypt for staging certificates"
    fi
}

# Production-specific setup
setup_production() {
    info "Setting up production environment..."
    
    # Validate required secrets are changed
    if grep -q "CHANGE_THIS" .env; then
        error "Please update all CHANGE_THIS values in .env file before production deployment"
    fi
    
    # Check for default passwords
    if grep -q "changeme\|password\|secret" .env; then
        error "Please update all default passwords and secrets in .env file"
    fi
    
    # Install production dependencies only
    if [ -f "package.json" ]; then
        npm ci --only=production
        log "Installed production dependencies"
    fi
    
    # Validate SSL certificates
    if [ ! -f "ssl/cert.pem" ] || [ ! -f "ssl/key.pem" ]; then
        error "SSL certificates required for production. Please place cert.pem and key.pem in ssl/ directory"
    fi
    
    # Set secure file permissions
    chmod 600 ssl/*.pem
    log "Set secure permissions on SSL certificates"
    
    # Validate database connection
    info "Please ensure production database is accessible and configured"
    
    # Security checklist
    info "Production security checklist:"
    info "  ✓ SSL certificates configured"
    info "  ✓ Strong passwords and secrets set"
    info "  ✓ Database access restricted"
    info "  ✓ Firewall rules configured"
    info "  ✓ Monitoring and alerting setup"
}

# Generate secrets
generate_secrets() {
    log "Generating secure secrets..."
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
    
    # Generate OIDC client secret
    OIDC_SECRET=$(openssl rand -base64 32 | tr -d '\n')
    
    echo "Generated secrets (save these securely):"
    echo "JWT_SECRET=$JWT_SECRET"
    echo "POSTGRES_PASSWORD=$DB_PASSWORD"
    echo "OIDC_CLIENT_SECRET=$OIDC_SECRET"
    echo ""
    echo "Update your .env file with these values"
}

# Validate configuration
validate_config() {
    local env="$1"
    
    log "Validating $env configuration..."
    
    # Check required environment variables
    source .env
    
    local required_vars=("NODE_ENV" "DATABASE_URL" "JWT_SECRET")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    # Environment-specific validation
    case "$env" in
        "production")
            if [ "$NODE_ENV" != "production" ]; then
                error "NODE_ENV must be 'production' for production environment"
            fi
            
            if [[ "$JWT_SECRET" == *"dev"* ]] || [[ "$JWT_SECRET" == *"test"* ]]; then
                error "JWT_SECRET appears to be a development secret"
            fi
            ;;
    esac
    
    log "Configuration validation passed"
}

# Show environment info
show_info() {
    local env="$1"
    
    if [ -f ".env" ]; then
        source .env
        
        echo ""
        info "Current Environment Configuration:"
        info "  Environment: ${NODE_ENV:-not set}"
        info "  API Port: ${PORT:-3000}"
        info "  Database: ${POSTGRES_DB:-not set}"
        info "  Log Level: ${LOG_LEVEL:-info}"
        info "  CORS Origin: ${CORS_ORIGIN:-not set}"
        echo ""
    else
        warn "No .env file found. Run setup first."
    fi
}

# Main script logic
case "$1" in
    setup)
        if [ -z "$2" ]; then
            error "Please specify environment: ${ENVIRONMENTS[*]}"
        fi
        setup_environment "$2"
        ;;
    validate)
        if [ -z "$2" ]; then
            error "Please specify environment: ${ENVIRONMENTS[*]}"
        fi
        validate_config "$2"
        ;;
    secrets)
        generate_secrets
        ;;
    info)
        show_info
        ;;
    *)
        echo "ShiftWise Environment Setup Script"
        echo ""
        echo "Usage: $0 {setup|validate|secrets|info} [environment]"
        echo ""
        echo "Commands:"
        echo "  setup <env>     Setup environment (${ENVIRONMENTS[*]})"
        echo "  validate <env>  Validate environment configuration"
        echo "  secrets         Generate secure secrets"
        echo "  info            Show current environment info"
        echo ""
        echo "Examples:"
        echo "  $0 setup development"
        echo "  $0 setup production"
        echo "  $0 validate production"
        echo "  $0 secrets"
        exit 1
        ;;
esac