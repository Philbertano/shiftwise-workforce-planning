import { DatabaseManager } from '../../database/config';

export interface FactoryOptions {
  count?: number;
  overrides?: Record<string, any>;
  relationships?: Record<string, any>;
}

export class TestDataFactory {
  private static idCounters: Record<string, number> = {};

  private static getNextId(prefix: string): string {
    if (!this.idCounters[prefix]) {
      this.idCounters[prefix] = 0;
    }
    this.idCounters[prefix]++;
    return `${prefix}-${String(this.idCounters[prefix]).padStart(3, '0')}`;
  }

  static async createEmployee(options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      id: this.getNextId('emp'),
      name: `Test Employee ${this.idCounters['emp'] || 1}`,
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Test Team',
      active: true,
      preferences: JSON.stringify({
        preferredShifts: ['day'],
        preferredStations: [],
        maxConsecutiveDays: 5,
        preferredDaysOff: [0, 6]
      })
    };

    const employee = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO employees (id, name, contract_type, weekly_hours, max_hours_per_day, min_rest_hours, team, active, preferences) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [employee.id, employee.name, employee.contractType, employee.weeklyHours, employee.maxHoursPerDay, employee.minRestHours, employee.team, employee.active, employee.preferences]);

    return employee;
  }

  static async createEmployees(count: number, options: FactoryOptions = {}): Promise<any[]> {
    const employees = [];
    for (let i = 0; i < count; i++) {
      const employee = await this.createEmployee({
        ...options,
        overrides: {
          ...options.overrides,
          name: `Test Employee ${i + 1}`,
          team: `Team ${String.fromCharCode(65 + (i % 4))}` // Team A, B, C, D
        }
      });
      employees.push(employee);
    }
    return employees;
  }

  static async createSkill(options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      id: this.getNextId('skill'),
      name: `Test Skill ${this.idCounters['skill'] || 1}`,
      description: `Test skill description ${this.idCounters['skill'] || 1}`,
      levelScale: 3,
      category: 'Technical'
    };

    const skill = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO skills (id, name, description, level_scale, category) 
      VALUES (?, ?, ?, ?, ?)
    `, [skill.id, skill.name, skill.description, skill.levelScale, skill.category]);

    return skill;
  }

  static async createSkills(count: number, options: FactoryOptions = {}): Promise<any[]> {
    const categories = ['Technical', 'Safety', 'Quality', 'Leadership', 'Machine Operation'];
    const skills = [];
    
    for (let i = 0; i < count; i++) {
      const skill = await this.createSkill({
        ...options,
        overrides: {
          ...options.overrides,
          name: `Test Skill ${i + 1}`,
          category: categories[i % categories.length]
        }
      });
      skills.push(skill);
    }
    return skills;
  }

  static async createStation(options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      id: this.getNextId('station'),
      name: `Test Station ${this.idCounters['station'] || 1}`,
      line: 'Test Line A',
      priority: 'medium',
      location: `Floor 1, Section A`
    };

    const station = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO stations (id, name, line, priority, location) 
      VALUES (?, ?, ?, ?, ?)
    `, [station.id, station.name, station.line, station.priority, station.location]);

    return station;
  }

  static async createStations(count: number, options: FactoryOptions = {}): Promise<any[]> {
    const lines = ['Line A', 'Line B', 'Line C', 'Maintenance'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    const stations = [];
    
    for (let i = 0; i < count; i++) {
      const station = await this.createStation({
        ...options,
        overrides: {
          ...options.overrides,
          name: `Test Station ${i + 1}`,
          line: lines[i % lines.length],
          priority: priorities[i % priorities.length]
        }
      });
      stations.push(station);
    }
    return stations;
  }

  static async createShiftTemplate(options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      id: this.getNextId('shift'),
      name: `Test Shift ${this.idCounters['shift'] || 1}`,
      startTime: '08:00',
      endTime: '16:00',
      shiftType: 'regular',
      breakRules: JSON.stringify([{ duration: 30, startAfter: 240 }])
    };

    const shiftTemplate = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO shift_templates (id, name, start_time, end_time, shift_type, break_rules) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [shiftTemplate.id, shiftTemplate.name, shiftTemplate.startTime, shiftTemplate.endTime, shiftTemplate.shiftType, shiftTemplate.breakRules]);

    return shiftTemplate;
  }

  static async createShiftTemplates(count: number, options: FactoryOptions = {}): Promise<any[]> {
    const templates = [
      { name: 'Morning Shift', startTime: '06:00', endTime: '14:00', shiftType: 'regular' },
      { name: 'Day Shift', startTime: '08:00', endTime: '16:00', shiftType: 'regular' },
      { name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', shiftType: 'regular' },
      { name: 'Night Shift', startTime: '22:00', endTime: '06:00', shiftType: 'night' }
    ];
    
    const shiftTemplates = [];
    for (let i = 0; i < count; i++) {
      const template = templates[i % templates.length];
      const shiftTemplate = await this.createShiftTemplate({
        ...options,
        overrides: {
          ...options.overrides,
          ...template,
          name: `${template.name} ${Math.floor(i / templates.length) + 1}`
        }
      });
      shiftTemplates.push(shiftTemplate);
    }
    return shiftTemplates;
  }

  static async createEmployeeSkill(employeeId: string, skillId: string, options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      employeeId,
      skillId,
      level: 2,
      validUntil: '2025-12-31'
    };

    const employeeSkill = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO employee_skills (employee_id, skill_id, level, valid_until) 
      VALUES (?, ?, ?, ?)
    `, [employeeSkill.employeeId, employeeSkill.skillId, employeeSkill.level, employeeSkill.validUntil]);

    return employeeSkill;
  }

  static async createStationRequiredSkill(stationId: string, skillId: string, options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      stationId,
      skillId,
      minLevel: 2,
      count: 1,
      mandatory: true
    };

    const requiredSkill = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO station_required_skills (station_id, skill_id, min_level, count, mandatory) 
      VALUES (?, ?, ?, ?, ?)
    `, [requiredSkill.stationId, requiredSkill.skillId, requiredSkill.minLevel, requiredSkill.count, requiredSkill.mandatory]);

    return requiredSkill;
  }

  static async createShiftDemand(options: FactoryOptions = {}): Promise<any> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const defaults = {
      id: this.getNextId('demand'),
      date: tomorrow.toISOString().split('T')[0],
      stationId: 'station-001',
      shiftTemplateId: 'shift-001',
      requiredCount: 1,
      priority: 'medium'
    };

    const demand = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO shift_demands (id, date, station_id, shift_template_id, required_count, priority) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [demand.id, demand.date, demand.stationId, demand.shiftTemplateId, demand.requiredCount, demand.priority]);

    return demand;
  }

  static async createAbsence(employeeId: string, options: FactoryOptions = {}): Promise<any> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const defaults = {
      id: this.getNextId('absence'),
      employeeId,
      type: 'vacation',
      dateStart: tomorrow.toISOString().split('T')[0],
      dateEnd: tomorrow.toISOString().split('T')[0],
      approved: true,
      approvedBy: 'user-admin',
      reason: 'Test absence'
    };

    const absence = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO absences (id, employee_id, type, date_start, date_end, approved, approved_by, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [absence.id, absence.employeeId, absence.type, absence.dateStart, absence.dateEnd, absence.approved, absence.approvedBy, absence.reason]);

    return absence;
  }

  static async createUser(options: FactoryOptions = {}): Promise<any> {
    const defaults = {
      id: this.getNextId('user'),
      username: `testuser${this.idCounters['user'] || 1}`,
      email: `testuser${this.idCounters['user'] || 1}@test.com`,
      passwordHash: '$2b$10$test.hash.for.test.user',
      role: 'planner',
      active: true
    };

    const user = { ...defaults, ...options.overrides };

    await DatabaseManager.query(`
      INSERT INTO users (id, username, email, password_hash, role, active) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id, user.username, user.email, user.passwordHash, user.role, user.active]);

    return user;
  }

  // Complex factory methods for creating related data

  static async createCompleteWorkforce(options: {
    employeeCount?: number;
    skillCount?: number;
    stationCount?: number;
    shiftTemplateCount?: number;
  } = {}): Promise<{
    employees: any[];
    skills: any[];
    stations: any[];
    shiftTemplates: any[];
  }> {
    const {
      employeeCount = 10,
      skillCount = 6,
      stationCount = 4,
      shiftTemplateCount = 3
    } = options;

    // Create base data
    const skills = await this.createSkills(skillCount);
    const employees = await this.createEmployees(employeeCount);
    const stations = await this.createStations(stationCount);
    const shiftTemplates = await this.createShiftTemplates(shiftTemplateCount);

    // Create relationships
    // Assign skills to employees (each employee gets 2-4 skills)
    for (const employee of employees) {
      const employeeSkillCount = 2 + Math.floor(Math.random() * 3);
      const shuffledSkills = [...skills].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < employeeSkillCount && i < skills.length; i++) {
        const skill = shuffledSkills[i];
        const level = 1 + Math.floor(Math.random() * 3);
        await this.createEmployeeSkill(employee.id, skill.id, { overrides: { level } });
      }
    }

    // Assign required skills to stations (each station requires 1-3 skills)
    for (const station of stations) {
      const stationSkillCount = 1 + Math.floor(Math.random() * 3);
      const shuffledSkills = [...skills].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < stationSkillCount && i < skills.length; i++) {
        const skill = shuffledSkills[i];
        const minLevel = 1 + Math.floor(Math.random() * 3);
        const mandatory = i < 2; // First 2 skills are mandatory
        await this.createStationRequiredSkill(station.id, skill.id, { 
          overrides: { minLevel, mandatory } 
        });
      }
    }

    return { employees, skills, stations, shiftTemplates };
  }

  static async createPlanningScenario(options: {
    date?: string;
    stationIds?: string[];
    shiftTemplateIds?: string[];
    demandMultiplier?: number;
  } = {}): Promise<any[]> {
    const {
      date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
      stationIds = [],
      shiftTemplateIds = [],
      demandMultiplier = 1
    } = options;

    const demands = [];

    for (const stationId of stationIds) {
      for (const shiftTemplateId of shiftTemplateIds) {
        const requiredCount = Math.max(1, Math.floor(demandMultiplier * (1 + Math.random())));
        const demand = await this.createShiftDemand({
          overrides: {
            date,
            stationId,
            shiftTemplateId,
            requiredCount
          }
        });
        demands.push(demand);
      }
    }

    return demands;
  }

  static async createConflictScenario(employeeIds: string[], date: string): Promise<any[]> {
    const absences = [];
    
    // Create overlapping absences for multiple employees
    for (let i = 0; i < Math.min(3, employeeIds.length); i++) {
      const employeeId = employeeIds[i];
      const absence = await this.createAbsence(employeeId, {
        overrides: {
          dateStart: date,
          dateEnd: date,
          type: 'sick',
          reason: 'Conflict scenario test'
        }
      });
      absences.push(absence);
    }

    return absences;
  }

  // Cleanup methods

  static async cleanup(): Promise<void> {
    const tables = [
      'assignments',
      'shift_demands',
      'station_required_skills',
      'employee_skills',
      'absences',
      'users',
      'employees',
      'stations',
      'shift_templates',
      'skills'
    ];

    for (const table of tables) {
      await DatabaseManager.query(`DELETE FROM ${table}`);
    }

    // Reset ID counters
    this.idCounters = {};
  }

  static resetCounters(): void {
    this.idCounters = {};
  }
}