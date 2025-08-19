-- ShiftWise Database Schema
-- Supports both SQLite (development) and PostgreSQL (production)

-- Users table for authentication and authorization
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contract_type TEXT NOT NULL CHECK (contract_type IN ('full-time', 'part-time', 'temporary', 'contract')),
    weekly_hours INTEGER NOT NULL,
    max_hours_per_day INTEGER NOT NULL,
    min_rest_hours INTEGER NOT NULL,
    team TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    preferences TEXT, -- JSON object for employee preferences
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    level_scale INTEGER DEFAULT 3 CHECK (level_scale > 0),
    category TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employee skills junction table
CREATE TABLE IF NOT EXISTS employee_skills (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level > 0),
    valid_until DATE,
    certification_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE(employee_id, skill_id)
);

-- Shift templates table
CREATE TABLE IF NOT EXISTS shift_templates (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    start_time TEXT NOT NULL, -- HH:MM format
    end_time TEXT NOT NULL,   -- HH:MM format
    break_rules TEXT NOT NULL, -- JSON array of break rules
    shift_type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stations table
CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    line TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Station required skills junction table
CREATE TABLE IF NOT EXISTS station_required_skills (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    station_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    min_level INTEGER NOT NULL CHECK (min_level > 0),
    count INTEGER NOT NULL DEFAULT 1 CHECK (count > 0),
    mandatory BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE(station_id, skill_id)
);

-- Shift demands table
CREATE TABLE IF NOT EXISTS shift_demands (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    station_id TEXT NOT NULL,
    shift_template_id TEXT NOT NULL,
    required_count INTEGER NOT NULL CHECK (required_count > 0),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id) ON DELETE CASCADE
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    demand_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('proposed', 'confirmed', 'rejected')),
    score REAL NOT NULL,
    explanation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (demand_id) REFERENCES shift_demands(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Absences table
CREATE TABLE IF NOT EXISTS absences (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'training', 'personal')),
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    approved_by TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    CHECK (date_end >= date_start)
);

-- Audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject', 'commit')),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    changes TEXT NOT NULL, -- JSON object of changes
    metadata TEXT, -- JSON object for additional context
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance optimization

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team);
CREATE INDEX IF NOT EXISTS idx_employees_contract_type ON employees(contract_type);

-- Employee skills indexes
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON employee_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_level ON employee_skills(level);
CREATE INDEX IF NOT EXISTS idx_employee_skills_valid_until ON employee_skills(valid_until);

-- Skills indexes
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);

-- Stations indexes
CREATE INDEX IF NOT EXISTS idx_stations_line ON stations(line);
CREATE INDEX IF NOT EXISTS idx_stations_priority ON stations(priority);

-- Shift demands indexes
CREATE INDEX IF NOT EXISTS idx_shift_demands_date ON shift_demands(date);
CREATE INDEX IF NOT EXISTS idx_shift_demands_station ON shift_demands(station_id);
CREATE INDEX IF NOT EXISTS idx_shift_demands_template ON shift_demands(shift_template_id);
CREATE INDEX IF NOT EXISTS idx_shift_demands_priority ON shift_demands(priority);
CREATE INDEX IF NOT EXISTS idx_shift_demands_date_station ON shift_demands(date, station_id);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_demand ON assignments(demand_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at);
CREATE INDEX IF NOT EXISTS idx_assignments_employee_status ON assignments(employee_id, status);

-- Absences indexes
CREATE INDEX IF NOT EXISTS idx_absences_employee ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_dates ON absences(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_absences_type ON absences(type);
CREATE INDEX IF NOT EXISTS idx_absences_approved ON absences(approved);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);