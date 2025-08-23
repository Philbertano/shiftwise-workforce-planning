-- Migration 013: Create shift staffing requirements tables
-- This migration adds tables to define staffing requirements for shifts and stations

-- Shift staffing requirements table
-- Defines how many employees are needed for each shift/station combination
CREATE TABLE IF NOT EXISTS shift_staffing_requirements (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    station_id TEXT NOT NULL,
    shift_template_id TEXT NOT NULL,
    min_employees INTEGER NOT NULL CHECK (min_employees > 0),
    max_employees INTEGER NOT NULL CHECK (max_employees >= min_employees),
    optimal_employees INTEGER NOT NULL CHECK (optimal_employees >= min_employees AND optimal_employees <= max_employees),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    effective_from DATE NOT NULL,
    effective_until DATE,
    active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_template_id) REFERENCES shift_templates(id) ON DELETE CASCADE,
    UNIQUE(station_id, shift_template_id, effective_from)
);

-- Shift skill requirements table
-- Defines specific skill requirements for each shift/station combination
CREATE TABLE IF NOT EXISTS shift_skill_requirements (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    staffing_requirement_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    min_level INTEGER NOT NULL CHECK (min_level > 0),
    required_count INTEGER NOT NULL CHECK (required_count > 0),
    mandatory BOOLEAN DEFAULT TRUE,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staffing_requirement_id) REFERENCES shift_staffing_requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE(staffing_requirement_id, skill_id)
);

-- Working hour constraints table
-- Defines working hour patterns and constraints for different shift types
CREATE TABLE IF NOT EXISTS working_hour_constraints (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    max_consecutive_days INTEGER NOT NULL CHECK (max_consecutive_days > 0),
    min_rest_days INTEGER NOT NULL CHECK (min_rest_days > 0),
    max_hours_per_week INTEGER NOT NULL CHECK (max_hours_per_week > 0),
    max_hours_per_day INTEGER NOT NULL CHECK (max_hours_per_day > 0),
    min_hours_between_shifts INTEGER NOT NULL CHECK (min_hours_between_shifts >= 0),
    allow_back_to_back_shifts BOOLEAN DEFAULT FALSE,
    weekend_work_allowed BOOLEAN DEFAULT TRUE,
    night_shift_restrictions TEXT, -- JSON object for night shift specific rules
    contract_types TEXT NOT NULL, -- JSON array of applicable contract types
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shift patterns table
-- Defines recurring shift patterns (e.g., 4-on-3-off, rotating shifts)
CREATE TABLE IF NOT EXISTS shift_patterns (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    pattern_type TEXT NOT NULL CHECK (pattern_type IN ('fixed', 'rotating', 'flexible')),
    cycle_length_days INTEGER NOT NULL CHECK (cycle_length_days > 0),
    pattern_definition TEXT NOT NULL, -- JSON object defining the pattern
    working_hour_constraint_id TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (working_hour_constraint_id) REFERENCES working_hour_constraints(id)
);

-- Employee shift pattern assignments
-- Links employees to specific shift patterns
CREATE TABLE IF NOT EXISTS employee_shift_patterns (
    id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
    employee_id TEXT NOT NULL,
    shift_pattern_id TEXT NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    cycle_start_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_pattern_id) REFERENCES shift_patterns(id) ON DELETE CASCADE,
    UNIQUE(employee_id, effective_from)
);

-- Indexes for performance optimization

-- Shift staffing requirements indexes
CREATE INDEX IF NOT EXISTS idx_shift_staffing_requirements_station ON shift_staffing_requirements(station_id);
CREATE INDEX IF NOT EXISTS idx_shift_staffing_requirements_shift_template ON shift_staffing_requirements(shift_template_id);
CREATE INDEX IF NOT EXISTS idx_shift_staffing_requirements_effective_dates ON shift_staffing_requirements(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_shift_staffing_requirements_active ON shift_staffing_requirements(active);
CREATE INDEX IF NOT EXISTS idx_shift_staffing_requirements_priority ON shift_staffing_requirements(priority);

-- Shift skill requirements indexes
CREATE INDEX IF NOT EXISTS idx_shift_skill_requirements_staffing ON shift_skill_requirements(staffing_requirement_id);
CREATE INDEX IF NOT EXISTS idx_shift_skill_requirements_skill ON shift_skill_requirements(skill_id);
CREATE INDEX IF NOT EXISTS idx_shift_skill_requirements_mandatory ON shift_skill_requirements(mandatory);
CREATE INDEX IF NOT EXISTS idx_shift_skill_requirements_priority ON shift_skill_requirements(priority);

-- Working hour constraints indexes
CREATE INDEX IF NOT EXISTS idx_working_hour_constraints_active ON working_hour_constraints(active);
CREATE INDEX IF NOT EXISTS idx_working_hour_constraints_name ON working_hour_constraints(name);

-- Shift patterns indexes
CREATE INDEX IF NOT EXISTS idx_shift_patterns_type ON shift_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_shift_patterns_active ON shift_patterns(active);
CREATE INDEX IF NOT EXISTS idx_shift_patterns_constraint ON shift_patterns(working_hour_constraint_id);

-- Employee shift pattern indexes
CREATE INDEX IF NOT EXISTS idx_employee_shift_patterns_employee ON employee_shift_patterns(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_shift_patterns_pattern ON employee_shift_patterns(shift_pattern_id);
CREATE INDEX IF NOT EXISTS idx_employee_shift_patterns_effective_dates ON employee_shift_patterns(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_employee_shift_patterns_active ON employee_shift_patterns(active);