# ShiftWise - Lokale Entwicklung und Tests

## 🚀 Schnellstart (5 Minuten)

### 1. Repository klonen und Dependencies installieren
```bash
git clone <your-repo-url>
cd shiftwise-workforce-planning

# Backend Dependencies
npm install

# Frontend Dependencies
cd frontend
npm install
cd ..
```

### 2. Mit Docker Compose starten (Empfohlen)
```bash
# Entwicklungsumgebung kopieren
cp config/environments/development.env .env

# Alle Services starten (API, Frontend, Database, Redis)
docker-compose -f docker-compose.override.yml up -d

# Warten bis alle Services bereit sind (ca. 30 Sekunden)
# Dann die App öffnen: http://localhost:3001
```

### 3. Ohne Docker (Manuell)
```bash
# 1. PostgreSQL und Redis lokal installieren und starten
# 2. Environment konfigurieren
cp config/environments/development.env .env

# 3. Database migrieren
npm run migrate

# 4. Seed-Daten laden (optional)
npm run seed

# 5. Backend starten
npm run dev

# 6. In neuem Terminal: Frontend starten
cd frontend
npm run dev
```

## 📱 Zugriff auf die Anwendung

- **Frontend**: http://localhost:3001 (oder http://localhost:5173 ohne Docker)
- **API**: http://localhost:3000
- **API Dokumentation**: http://localhost:3000/api-docs (Swagger)

## 🧪 Tests ausführen

### Alle Tests
```bash
# Unit Tests
npm test

# Integration Tests
npm run test:e2e

# Performance Tests
npm run test:performance

# Vollständige Test-Suite
npm run test:scenarios
```

### Spezifische Tests
```bash
# Nur API Tests
npm test src/test/api

# Nur Service Tests
npm test src/test/services

# Frontend Tests
cd frontend
npm test
```

## 🔧 Entwicklungstools

### Hot Reload
- Backend: Automatisch mit `npm run dev`
- Frontend: Automatisch mit `npm run dev`

### Debugging
```bash
# Backend mit Debugger
npm run dev:debug

# Logs anzeigen
docker-compose logs -f api
docker-compose logs -f frontend
```

### Database Management
```bash
# Migrations ausführen
npm run migrate

# Migration rückgängig machen
npm run migrate:rollback

# Database Status
npm run migrate:status

# Seed-Daten laden
npm run seed
```

## 📊 Demo-Daten und Szenarien

### Automatische Demo-Daten
```bash
# Umfassende Demo-Daten laden
npm run seed

# Spezifische Szenarien testen
npm run test:scenarios:list
npm run test:scenarios:setup
```

### Manuelle Test-Daten
Die App wird mit folgenden Demo-Daten gestartet:
- **Mitarbeiter**: 50+ Mitarbeiter mit verschiedenen Qualifikationen
- **Stationen**: 10 Produktionsstationen mit unterschiedlichen Anforderungen
- **Schichten**: Tag-, Abend- und Nachtschichten
- **Qualifikationen**: Verschiedene Skill-Level und Zertifikate

## 🎯 Funktionen testen

### 1. Schichtplanung
1. Öffne http://localhost:3001
2. Gehe zu "Planning Board"
3. Wähle ein Datum
4. Klicke "Generate Plan"
5. Teste Drag & Drop für Zuweisungen

### 2. KI-Assistent
1. Öffne das AI Assistant Panel
2. Teste Befehle wie:
   - "Generate a plan for next Monday"
   - "Explain why John was assigned to Station A"
   - "Simulate absence of Sarah tomorrow"

### 3. Coverage Dashboard
1. Gehe zu "Coverage Dashboard"
2. Sieh dir die Heatmap an
3. Prüfe Gap-Analysen und Risiko-Indikatoren

### 4. What-If Szenarien
1. Gehe zu "Planning Board"
2. Klicke auf "Simulate Absence"
3. Wähle einen Mitarbeiter aus
4. Sieh dir die Auswirkungen an

## 🐛 Troubleshooting

### Häufige Probleme

#### Port bereits belegt
```bash
# Prüfe welcher Prozess den Port verwendet
lsof -i :3000
lsof -i :3001

# Stoppe Docker Services
docker-compose down
```

#### Database Connection Error
```bash
# Prüfe ob PostgreSQL läuft
docker-compose ps postgres

# Logs prüfen
docker-compose logs postgres

# Database neu starten
docker-compose restart postgres
```

#### Frontend lädt nicht
```bash
# Prüfe Frontend Logs
docker-compose logs frontend

# Frontend neu builden
cd frontend
npm run build
```

#### Tests schlagen fehl
```bash
# Test Database zurücksetzen
NODE_ENV=test npm run migrate:rollback
NODE_ENV=test npm run migrate

# Cache leeren
rm -rf node_modules/.cache
npm run build
```

## 🔄 Development Workflow

### 1. Feature entwickeln
```bash
# Neuen Branch erstellen
git checkout -b feature/neue-funktion

# Entwickeln mit Hot Reload
npm run dev

# Tests schreiben und ausführen
npm test
```

### 2. Code Quality
```bash
# Linting
npm run lint

# Type Checking
npm run type-check

# Tests
npm run test:watch
```

### 3. Integration testen
```bash
# Vollständige Test-Suite
npm run test:e2e

# Performance Tests
npm run test:performance

# Load Tests
npm run test:load
```

## 📈 Performance Monitoring

### Lokale Metriken
```bash
# Monitoring starten
./scripts/monitoring.sh monitor

# Performance Tests
npm run test:performance
```

### Memory und CPU Usage
```bash
# Docker Stats
docker stats

# Node.js Memory Usage
node --inspect src/index.ts
```

## 🔐 Sicherheit (Development)

Die Entwicklungsumgebung verwendet:
- Schwache Passwörter (nur für Development!)
- Deaktivierte Sicherheits-Features
- Debug-Logging aktiviert
- CORS für localhost konfiguriert

**Wichtig**: Niemals Development-Konfiguration in Produktion verwenden!

## 📚 Weitere Ressourcen

- **API Dokumentation**: http://localhost:3000/api-docs
- **Test Szenarien**: `src/test/documentation/test-scenarios-guide.md`
- **Deployment Guide**: `docs/deployment-guide.md`
- **Runbook**: `docs/runbook.md`

## 🆘 Support

Bei Problemen:
1. Prüfe die Logs: `docker-compose logs`
2. Schaue in die Test-Dokumentation
3. Verwende die Debug-Routen: http://localhost:3000/debug
4. Prüfe die Health-Checks: http://localhost:3000/health