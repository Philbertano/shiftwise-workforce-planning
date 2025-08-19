-- Migration 012: Create plan approval and execution tracking tables

-- Plans table for storing plan metadata
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    coverage_status TEXT NOT NULL DEFAULT '{}', -- JSON
    violations TEXT NOT NULL DEFAULT '[]', -- JSON
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    committed_at DATETIME,
    committed_by TEXT,
    metadata TEXT DEFAULT '{}' -- JSON
);

-- Plan assignments junction table
CREATE TABLE IF NOT EXISTS plan_assignments (
    plan_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (plan_id, assignment_id),
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Execution status tracking table
CREATE TABLE IF NOT EXISTS execution_status (
    plan_id TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    actual_start_time DATETIME,
    actual_end_time DATETIME,
    notes TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT NOT NULL,
    PRIMARY KEY (assignment_id), -- One status per assignment
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_date_range ON plans(date_start, date_end);
CREATE INDEX IF NOT EXISTS idx_plans_created_by ON plans(created_by);
CREATE INDEX IF NOT EXISTS idx_plans_committed_at ON plans(committed_at);

CREATE INDEX IF NOT EXISTS idx_plan_assignments_plan_id ON plan_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_assignments_assignment_id ON plan_assignments(assignment_id);

CREATE INDEX IF NOT EXISTS idx_execution_status_plan_id ON execution_status(plan_id);
CREATE INDEX IF NOT EXISTS idx_execution_status_status ON execution_status(status);
CREATE INDEX IF NOT EXISTS idx_execution_status_updated_at ON execution_status(updated_at);

