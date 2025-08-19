#!/bin/bash

# ShiftWise Local Development Startup Script
# Startet die komplette Anwendung lokal für Development und Tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo_step "Überprüfe Voraussetzungen..."
    
    if ! command -v docker &> /dev/null; then
        echo_error "Docker ist nicht installiert. Bitte installiere Docker Desktop."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo_error "Docker Compose ist nicht installiert."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo_error "Node.js ist nicht installiert. Bitte installiere Node.js 18+."
        exit 1
    fi
    
    echo_info "Alle Voraussetzungen erfüllt!"
}

# Setup environment
setup_environment() {
    echo_step "Richte Entwicklungsumgebung ein..."
    
    # Copy development environment if .env doesn't exist
    if [ ! -f .env ]; then
        echo_info "Kopiere Development-Konfiguration..."
        cp config/environments/development.env .env
    else
        echo_info ".env bereits vorhanden"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    echo_info "Umgebung eingerichtet!"
}

# Install dependencies
install_dependencies() {
    echo_step "Installiere Dependencies..."
    
    # Backend dependencies
    if [ ! -d "node_modules" ]; then
        echo_info "Installiere Backend Dependencies..."
        npm install
    else
        echo_info "Backend Dependencies bereits installiert"
    fi
    
    # Frontend dependencies
    if [ ! -d "frontend/node_modules" ]; then
        echo_info "Installiere Frontend Dependencies..."
        cd frontend
        npm install
        cd ..
    else
        echo_info "Frontend Dependencies bereits installiert"
    fi
    
    echo_info "Dependencies installiert!"
}

# Start services with Docker Compose
start_docker_services() {
    echo_step "Starte Services mit Docker Compose..."
    
    # Stop any existing services
    docker-compose down 2>/dev/null || true
    
    # Start all services
    echo_info "Starte Database, Redis, API und Frontend..."
    docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
    
    echo_info "Services gestartet!"
}

# Wait for services to be ready
wait_for_services() {
    echo_step "Warte auf Services..."
    
    # Wait for database
    echo_info "Warte auf PostgreSQL..."
    timeout=60
    while ! docker-compose exec -T postgres pg_isready -U dev_user -d shiftwise_dev &>/dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            echo_error "PostgreSQL ist nicht bereit geworden"
            exit 1
        fi
    done
    
    # Wait for Redis
    echo_info "Warte auf Redis..."
    timeout=30
    while ! docker-compose exec -T redis redis-cli ping &>/dev/null; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            echo_error "Redis ist nicht bereit geworden"
            exit 1
        fi
    done
    
    # Wait for API
    echo_info "Warte auf API..."
    timeout=60
    while ! curl -f http://localhost:3000/health &>/dev/null; do
        sleep 3
        timeout=$((timeout - 3))
        if [ $timeout -le 0 ]; then
            echo_error "API ist nicht bereit geworden"
            exit 1
        fi
    done
    
    echo_info "Alle Services sind bereit!"
}

# Run database migrations
run_migrations() {
    echo_step "Führe Database Migrations aus..."
    
    # Run migrations inside the API container
    docker-compose exec api npm run migrate
    
    echo_info "Migrations abgeschlossen!"
}

# Load seed data
load_seed_data() {
    echo_step "Lade Demo-Daten..."
    
    # Load seed data
    docker-compose exec api npm run seed
    
    echo_info "Demo-Daten geladen!"
}

# Show status and URLs
show_status() {
    echo_step "Anwendung ist bereit!"
    echo ""
    echo_info "🚀 ShiftWise läuft lokal:"
    echo ""
    echo -e "  ${GREEN}Frontend:${NC}     http://localhost:3001"
    echo -e "  ${GREEN}API:${NC}          http://localhost:3000"
    echo -e "  ${GREEN}API Docs:${NC}     http://localhost:3000/api-docs"
    echo -e "  ${GREEN}Health Check:${NC} http://localhost:3000/health"
    echo ""
    echo_info "📊 Services:"
    echo -e "  ${GREEN}PostgreSQL:${NC}   localhost:5432 (dev_user/dev_password)"
    echo -e "  ${GREEN}Redis:${NC}        localhost:6379"
    echo ""
    echo_info "🧪 Nützliche Befehle:"
    echo -e "  ${YELLOW}Logs anzeigen:${NC}     docker-compose logs -f"
    echo -e "  ${YELLOW}Tests ausführen:${NC}   npm test"
    echo -e "  ${YELLOW}Services stoppen:${NC}  docker-compose down"
    echo -e "  ${YELLOW}Services neustarten:${NC} docker-compose restart"
    echo ""
    echo_info "🎯 Demo-Features testen:"
    echo "  1. Gehe zu http://localhost:3001"
    echo "  2. Öffne das Planning Board"
    echo "  3. Klicke 'Generate Plan'"
    echo "  4. Teste den AI Assistant"
    echo "  5. Schaue dir das Coverage Dashboard an"
    echo ""
}

# Main function
main() {
    echo_info "🚀 Starte ShiftWise lokale Entwicklungsumgebung..."
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    start_docker_services
    wait_for_services
    run_migrations
    load_seed_data
    show_status
    
    echo_info "✅ Setup abgeschlossen! Die Anwendung läuft unter http://localhost:3001"
}

# Handle script arguments
case "${1:-start}" in
    start)
        main
        ;;
    stop)
        echo_info "Stoppe alle Services..."
        docker-compose down
        echo_info "Services gestoppt!"
        ;;
    restart)
        echo_info "Starte Services neu..."
        docker-compose restart
        echo_info "Services neu gestartet!"
        ;;
    logs)
        docker-compose logs -f
        ;;
    status)
        echo_info "Service Status:"
        docker-compose ps
        echo ""
        echo_info "Health Checks:"
        curl -s http://localhost:3000/health | jq . || echo "API nicht erreichbar"
        ;;
    clean)
        echo_warn "Lösche alle Container und Volumes..."
        docker-compose down -v
        docker system prune -f
        echo_info "Cleanup abgeschlossen!"
        ;;
    test)
        echo_info "Führe Tests aus..."
        npm test
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|status|clean|test}"
        echo ""
        echo "  start   - Startet die komplette Anwendung (Standard)"
        echo "  stop    - Stoppt alle Services"
        echo "  restart - Startet Services neu"
        echo "  logs    - Zeigt Live-Logs aller Services"
        echo "  status  - Zeigt Status aller Services"
        echo "  clean   - Löscht alle Container und Volumes"
        echo "  test    - Führt Tests aus"
        exit 1
        ;;
esac