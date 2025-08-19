// Employee repository unit tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmployeeRepository } from '../../repositories/employee.repository';
import { DatabaseManager } from '../../database/config';
import { ContractType } from '../../types';

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    // Use in-memory SQLite for testing
    process.env.DATABASE_URL = 'sqlite::memory:';
    
    dbManager = DatabaseManager.getInstance();
    await dbManager.connect();
    
    // Create test tables
    await dbManager.run(`
      CREATE TABLE employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contract_type TEXT NOT NULL,
        weekly_hours INTEGER NOT NULL,
        max_hours_per_day INTEGER NOT NULL,
        min_rest_hours INTEGER NOT NULL,
        team TEXT NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        preferences TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbManager.run(`
      CREATE TABLE absences (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        type TEXT NOT NULL,
        date_start DATE NOT NULL,
        date_end DATE NOT NULL,
        approved BOOLEAN DEFAULT FALSE,
        approved_by TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);

    await dbManager.run(`
      CREATE TABLE shift_demands (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        station_id TEXT NOT NULL,
        shift_template_id TEXT NOT NULL,
        required_count INTEGER NOT NULL,
        priority TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbManager.run(`
      CREATE TABLE assignments (
        id TEXT PRIMARY KEY,
        demand_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        status TEXT NOT NULL,
        score REAL NOT NULL,
        explanation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (demand_id) REFERENCES shift_demands(id),
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);

    await dbManager.run(`
      CREATE TABLE shift_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        break_rules TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    repository = new EmployeeRepository();
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('create and findById', () => {
    it('should create and retrieve employee', async () => {
      const employeeData = {
        name: 'John Doe',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true,
        preferences: {
          preferredShifts: ['day'],
          preferredStations: ['station-1'],
          maxConsecutiveDays: 5,
          preferredDaysOff: [0, 6] // Sunday, Saturday
        }
      };

      const created = await repository.create(employeeData);
      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe(employeeData.name);
      expect(found!.contractType).toBe(employeeData.contractType);
      expect(found!.weeklyHours).toBe(employeeData.weeklyHours);
      expect(found!.team).toBe(employeeData.team);
      expect(found!.preferences).toEqual(employeeData.preferences);
    });
  });

  describe('findByTeam', () => {
    beforeEach(async () => {
      await repository.create({
        name: 'Alice Smith',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });

      await repository.create({
        name: 'Bob Johnson',
        contractType: ContractType.PART_TIME,
        weeklyHours: 20,
        maxHoursPerDay: 6,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });

      await repository.create({
        name: 'Carol Wilson',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production B',
        active: true
      });

      await repository.create({
        name: 'Dave Brown',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: false // Inactive
      });
    });

    it('should find active employees by team', async () => {
      const teamA = await repository.findByTeam('Production A');
      
      expect(teamA).toHaveLength(2);
      expect(teamA.map(e => e.name).sort()).toEqual(['Alice Smith', 'Bob Johnson']);
      expect(teamA.every(e => e.team === 'Production A')).toBe(true);
      expect(teamA.every(e => e.active)).toBe(true);
    });

    it('should return empty array for non-existent team', async () => {
      const result = await repository.findByTeam('Non-existent Team');
      expect(result).toHaveLength(0);
    });
  });

  describe('findActive', () => {
    beforeEach(async () => {
      await repository.create({
        name: 'Active Employee 1',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });

      await repository.create({
        name: 'Active Employee 2',
        contractType: ContractType.PART_TIME,
        weeklyHours: 20,
        maxHoursPerDay: 6,
        minRestHours: 12,
        team: 'Production B',
        active: true
      });

      await repository.create({
        name: 'Inactive Employee',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: false
      });
    });

    it('should find only active employees', async () => {
      const active = await repository.findActive();
      
      expect(active).toHaveLength(2);
      expect(active.every(e => e.active)).toBe(true);
      expect(active.map(e => e.name).sort()).toEqual(['Active Employee 1', 'Active Employee 2']);
    });
  });

  describe('findByContractType', () => {
    beforeEach(async () => {
      await repository.create({
        name: 'Full Time 1',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });

      await repository.create({
        name: 'Part Time 1',
        contractType: ContractType.PART_TIME,
        weeklyHours: 20,
        maxHoursPerDay: 6,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });

      await repository.create({
        name: 'Full Time 2',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production B',
        active: true
      });

      await repository.create({
        name: 'Inactive Full Time',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: false
      });
    });

    it('should find active employees by contract type', async () => {
      const fullTime = await repository.findByContractType(ContractType.FULL_TIME);
      
      expect(fullTime).toHaveLength(2);
      expect(fullTime.every(e => e.contractType === ContractType.FULL_TIME)).toBe(true);
      expect(fullTime.every(e => e.active)).toBe(true);
      expect(fullTime.map(e => e.name).sort()).toEqual(['Full Time 1', 'Full Time 2']);
    });
  });

  describe('findAvailable', () => {
    let employee1Id: string;
    let employee2Id: string;
    let employee3Id: string;

    beforeEach(async () => {
      // Create employees
      const emp1 = await repository.create({
        name: 'Available Employee',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });
      employee1Id = emp1.id;

      const emp2 = await repository.create({
        name: 'On Absence Employee',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });
      employee2Id = emp2.id;

      const emp3 = await repository.create({
        name: 'Already Assigned Employee',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });
      employee3Id = emp3.id;

      // Create absence for employee2
      await dbManager.run(`
        INSERT INTO absences (id, employee_id, type, date_start, date_end, approved)
        VALUES ('absence-1', ?, 'vacation', '2024-01-15', '2024-01-15', 1)
      `, [employee2Id]);

      // Create shift template and demand
      await dbManager.run(`
        INSERT INTO shift_templates (id, name, start_time, end_time, break_rules, shift_type)
        VALUES ('template-1', 'Day Shift', '08:00', '16:00', '[]', 'day')
      `);

      await dbManager.run(`
        INSERT INTO shift_demands (id, date, station_id, shift_template_id, required_count, priority)
        VALUES ('demand-1', '2024-01-15', 'station-1', 'template-1', 2, 'medium')
      `);

      // Create assignment for employee3
      await dbManager.run(`
        INSERT INTO assignments (id, demand_id, employee_id, status, score, created_by)
        VALUES ('assignment-1', 'demand-1', ?, 'confirmed', 0.8, 'user-1')
      `, [employee3Id]);
    });

    it('should find available employees', async () => {
      const date = new Date('2024-01-15');
      const available = await repository.findAvailable(date, '09:00', '17:00');
      
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe(employee1Id);
      expect(available[0].name).toBe('Available Employee');
    });

    it('should exclude employees on absence', async () => {
      const date = new Date('2024-01-15');
      const available = await repository.findAvailable(date, '08:00', '16:00');
      
      const employeeIds = available.map(e => e.id);
      expect(employeeIds).not.toContain(employee2Id);
    });

    it('should exclude employees with conflicting assignments', async () => {
      const date = new Date('2024-01-15');
      const available = await repository.findAvailable(date, '08:00', '16:00');
      
      const employeeIds = available.map(e => e.id);
      expect(employeeIds).not.toContain(employee3Id);
    });
  });

  describe('getEmployeeWorkload', () => {
    let employeeId: string;

    beforeEach(async () => {
      const employee = await repository.create({
        name: 'Test Employee',
        contractType: ContractType.FULL_TIME,
        weeklyHours: 40,
        maxHoursPerDay: 8,
        minRestHours: 12,
        team: 'Production A',
        active: true
      });
      employeeId = employee.id;

      // Create shift templates
      await dbManager.run(`
        INSERT INTO shift_templates (id, name, start_time, end_time, break_rules, shift_type)
        VALUES 
          ('template-1', 'Day Shift', '08:00', '16:00', '[]', 'day'),
          ('template-2', 'Evening Shift', '16:00', '00:00', '[]', 'night')
      `);

      // Create demands for the week
      await dbManager.run(`
        INSERT INTO shift_demands (id, date, station_id, shift_template_id, required_count, priority)
        VALUES 
          ('demand-1', '2024-01-15', 'station-1', 'template-1', 2, 'medium'),
          ('demand-2', '2024-01-16', 'station-1', 'template-1', 2, 'medium'),
          ('demand-3', '2024-01-17', 'station-1', 'template-2', 2, 'medium')
      `);

      // Create assignments
      await dbManager.run(`
        INSERT INTO assignments (id, demand_id, employee_id, status, score, created_by)
        VALUES 
          ('assignment-1', 'demand-1', ?, 'confirmed', 0.8, 'user-1'),
          ('assignment-2', 'demand-2', ?, 'confirmed', 0.8, 'user-1'),
          ('assignment-3', 'demand-3', ?, 'proposed', 0.7, 'user-1')
      `, [employeeId, employeeId, employeeId]);
    });

    it('should calculate employee workload', async () => {
      const weekStart = new Date('2024-01-15'); // Monday
      const workload = await repository.getEmployeeWorkload(employeeId, weekStart);
      
      expect(workload.weeklyHours).toBeGreaterThan(0);
      expect(workload.consecutiveDays).toBeGreaterThanOrEqual(0);
    });
  });
});