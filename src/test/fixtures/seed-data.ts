import { DatabaseManager } from '../../database/config';

export async function seedTestData() {
  console.log('Seeding test data...');

  // Create test skills
  const skills = await createTestSkills();
  
  // Create test shift templates
  const shifts = await createTestShiftTemplates();
  
  // Create test stations
  const stations = await createTestStations(skills);
  
  // Create test employees
  const employees = await createTestEmployees();
  
  // Create employee skills
  await createTestEmployeeSkills(employees, skills);
  
  // Create test users for authentication
  await createTestUsers();
  
  // Create some test absences
  await createTestAbsences(employees);

  console.log('Test data seeding completed');

  return {
    employees,
    stations,
    skills,
    shifts
  };
}

async function createTestSkills() {
  const skills = [
    {
      id: 'skill-welding',
      name: 'Welding',
      description: 'Metal welding and fabrication',
      levelScale: 3,
      category: 'Technical'
    },
    {
      id: 'skill-assembly',
      name: 'Assembly',
      description: 'Product assembly and construction',
      levelScale: 3,
      category: 'Technical'
    },
    {
      id: 'skill-quality',
      name: 'Quality Control',
      description: 'Quality inspection and testing',
      levelScale: 3,
      category: 'Quality'
    },
    {
      id: 'skill-forklift',
      name: 'Forklift Operation',
      description: 'Forklift driving and material handling',
      levelScale: 3,
      category: 'Machine Operation'
    },
    {
      id: 'skill-safety',
      name: 'Safety Inspection',
      description: 'Safety protocols and inspection',
      levelScale: 3,
      category: 'Safety'
    },
    {
      id: 'skill-leadership',
      name: 'Team Leadership',
      description: 'Team management and leadership',
      levelScale: 3,
      category: 'Leadership'
    }
  ];

  for (const skill of skills) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO skills (id, name, description, level_scale, category) 
      VALUES (?, ?, ?, ?, ?)
    `, [skill.id, skill.name, skill.description, skill.levelScale, skill.category]);
  }

  return skills;
}

async function createTestShiftTemplates() {
  const shifts = [
    {
      id: 'shift-morning',
      name: 'Morning Shift',
      startTime: '06:00',
      endTime: '14:00',
      shiftType: 'regular',
      breakRules: JSON.stringify([
        { duration: 30, startAfter: 240 },
        { duration: 15, startAfter: 120 }
      ])
    },
    {
      id: 'shift-afternoon',
      name: 'Afternoon Shift',
      startTime: '14:00',
      endTime: '22:00',
      shiftType: 'regular',
      breakRules: JSON.stringify([
        { duration: 30, startAfter: 240 },
        { duration: 15, startAfter: 120 }
      ])
    },
    {
      id: 'shift-night',
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      shiftType: 'night',
      breakRules: JSON.stringify([
        { duration: 45, startAfter: 240 },
        { duration: 15, startAfter: 120 }
      ])
    }
  ];

  for (const shift of shifts) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO shift_templates (id, name, start_time, end_time, shift_type, break_rules) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [shift.id, shift.name, shift.startTime, shift.endTime, shift.shiftType, shift.breakRules]);
  }

  return shifts;
}

async function createTestStations(skills: any[]) {
  const stations = [
    {
      id: 'station-assembly-1',
      name: 'Assembly Station 1',
      line: 'Line A',
      priority: 'high',
      location: 'Floor 1, Section A',
      requiredSkills: [
        { skillId: 'skill-assembly', minLevel: 2, count: 1, mandatory: true },
        { skillId: 'skill-quality', minLevel: 1, count: 1, mandatory: false }
      ]
    },
    {
      id: 'station-welding-1',
      name: 'Welding Station 1',
      line: 'Line A',
      priority: 'high',
      location: 'Floor 1, Section B',
      requiredSkills: [
        { skillId: 'skill-welding', minLevel: 3, count: 1, mandatory: true },
        { skillId: 'skill-safety', minLevel: 2, count: 1, mandatory: true }
      ]
    },
    {
      id: 'station-quality-1',
      name: 'Quality Control 1',
      line: 'Line B',
      priority: 'medium',
      location: 'Floor 1, Section C',
      requiredSkills: [
        { skillId: 'skill-quality', minLevel: 3, count: 1, mandatory: true }
      ]
    },
    {
      id: 'station-packaging-1',
      name: 'Packaging Station 1',
      line: 'Line B',
      priority: 'low',
      location: 'Floor 2, Section A',
      requiredSkills: [
        { skillId: 'skill-assembly', minLevel: 1, count: 1, mandatory: true },
        { skillId: 'skill-forklift', minLevel: 1, count: 1, mandatory: false }
      ]
    },
    {
      id: 'station-maintenance-1',
      name: 'Maintenance Station 1',
      line: 'Maintenance',
      priority: 'high',
      location: 'Floor 1, Maintenance Bay',
      requiredSkills: [
        { skillId: 'skill-welding', minLevel: 2, count: 1, mandatory: true },
        { skillId: 'skill-safety', minLevel: 3, count: 1, mandatory: true },
        { skillId: 'skill-leadership', minLevel: 1, count: 1, mandatory: false }
      ]
    }
  ];

  for (const station of stations) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO stations (id, name, line, priority, location) 
      VALUES (?, ?, ?, ?, ?)
    `, [station.id, station.name, station.line, station.priority, station.location]);

    // Add required skills
    for (const reqSkill of station.requiredSkills) {
      await DatabaseManager.query(`
        INSERT OR REPLACE INTO station_required_skills (station_id, skill_id, min_level, count, mandatory) 
        VALUES (?, ?, ?, ?, ?)
      `, [station.id, reqSkill.skillId, reqSkill.minLevel, reqSkill.count, reqSkill.mandatory]);
    }
  }

  return stations;
}

async function createTestEmployees() {
  const employees = [
    {
      id: 'emp-john-doe',
      name: 'John Doe',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Alpha',
      active: true
    },
    {
      id: 'emp-jane-smith',
      name: 'Jane Smith',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Alpha',
      active: true
    },
    {
      id: 'emp-mike-wilson',
      name: 'Mike Wilson',
      contractType: 'part-time',
      weeklyHours: 20,
      maxHoursPerDay: 6,
      minRestHours: 11,
      team: 'Team Beta',
      active: true
    },
    {
      id: 'emp-sarah-johnson',
      name: 'Sarah Johnson',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Beta',
      active: true
    },
    {
      id: 'emp-david-brown',
      name: 'David Brown',
      contractType: 'contract',
      weeklyHours: 32,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Gamma',
      active: true
    },
    {
      id: 'emp-lisa-davis',
      name: 'Lisa Davis',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Gamma',
      active: true
    },
    {
      id: 'emp-robert-miller',
      name: 'Robert Miller',
      contractType: 'full-time',
      weeklyHours: 40,
      maxHoursPerDay: 8,
      minRestHours: 11,
      team: 'Team Delta',
      active: false // Inactive for testing
    }
  ];

  for (const employee of employees) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO employees (id, name, contract_type, weekly_hours, max_hours_per_day, min_rest_hours, team, active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [employee.id, employee.name, employee.contractType, employee.weeklyHours, employee.maxHoursPerDay, employee.minRestHours, employee.team, employee.active]);
  }

  return employees;
}

async function createTestEmployeeSkills(employees: any[], skills: any[]) {
  const employeeSkills = [
    // John Doe - Senior welder with leadership
    { employeeId: 'emp-john-doe', skillId: 'skill-welding', level: 3, validUntil: '2025-12-31' },
    { employeeId: 'emp-john-doe', skillId: 'skill-safety', level: 3, validUntil: '2025-06-30' },
    { employeeId: 'emp-john-doe', skillId: 'skill-leadership', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-john-doe', skillId: 'skill-assembly', level: 2, validUntil: '2025-12-31' },

    // Jane Smith - Quality specialist
    { employeeId: 'emp-jane-smith', skillId: 'skill-quality', level: 3, validUntil: '2025-12-31' },
    { employeeId: 'emp-jane-smith', skillId: 'skill-assembly', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-jane-smith', skillId: 'skill-safety', level: 2, validUntil: '2025-12-31' },

    // Mike Wilson - Assembly worker
    { employeeId: 'emp-mike-wilson', skillId: 'skill-assembly', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-mike-wilson', skillId: 'skill-forklift', level: 1, validUntil: '2025-03-31' }, // Expiring soon

    // Sarah Johnson - Multi-skilled
    { employeeId: 'emp-sarah-johnson', skillId: 'skill-assembly', level: 3, validUntil: '2025-12-31' },
    { employeeId: 'emp-sarah-johnson', skillId: 'skill-quality', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-sarah-johnson', skillId: 'skill-forklift', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-sarah-johnson', skillId: 'skill-leadership', level: 1, validUntil: '2025-12-31' },

    // David Brown - Welder
    { employeeId: 'emp-david-brown', skillId: 'skill-welding', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-david-brown', skillId: 'skill-safety', level: 2, validUntil: '2025-12-31' },

    // Lisa Davis - Team leader
    { employeeId: 'emp-lisa-davis', skillId: 'skill-leadership', level: 3, validUntil: '2025-12-31' },
    { employeeId: 'emp-lisa-davis', skillId: 'skill-assembly', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-lisa-davis', skillId: 'skill-quality', level: 2, validUntil: '2025-12-31' },
    { employeeId: 'emp-lisa-davis', skillId: 'skill-safety', level: 3, validUntil: '2025-12-31' },

    // Robert Miller - Inactive employee
    { employeeId: 'emp-robert-miller', skillId: 'skill-welding', level: 1, validUntil: '2025-12-31' },
    { employeeId: 'emp-robert-miller', skillId: 'skill-assembly', level: 1, validUntil: '2025-12-31' }
  ];

  for (const empSkill of employeeSkills) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO employee_skills (employee_id, skill_id, level, valid_until) 
      VALUES (?, ?, ?, ?)
    `, [empSkill.employeeId, empSkill.skillId, empSkill.level, empSkill.validUntil]);
  }
}

async function createTestUsers() {
  const users = [
    {
      id: 'user-admin',
      username: 'test-admin',
      email: 'admin@test.com',
      passwordHash: '$2b$10$test.hash.for.admin.user', // In real app, properly hash passwords
      role: 'admin',
      active: true
    },
    {
      id: 'user-planner',
      username: 'test-planner',
      email: 'planner@test.com',
      passwordHash: '$2b$10$test.hash.for.planner.user',
      role: 'planner',
      active: true
    },
    {
      id: 'user-viewer',
      username: 'test-viewer',
      email: 'viewer@test.com',
      passwordHash: '$2b$10$test.hash.for.viewer.user',
      role: 'viewer',
      active: true
    },
    {
      id: 'user-inactive',
      username: 'test-inactive',
      email: 'inactive@test.com',
      passwordHash: '$2b$10$test.hash.for.inactive.user',
      role: 'planner',
      active: false
    }
  ];

  for (const user of users) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO users (id, username, email, password_hash, role, active) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id, user.username, user.email, user.passwordHash, user.role, user.active]);
  }
}

async function createTestAbsences(employees: any[]) {
  const absences = [
    {
      id: 'absence-1',
      employeeId: 'emp-john-doe',
      type: 'vacation',
      dateStart: '2024-01-20',
      dateEnd: '2024-01-22',
      approved: true,
      approvedBy: 'user-admin',
      reason: 'Family vacation'
    },
    {
      id: 'absence-2',
      employeeId: 'emp-jane-smith',
      type: 'sick',
      dateStart: '2024-01-18',
      dateEnd: '2024-01-18',
      approved: true,
      approvedBy: 'user-planner',
      reason: 'Flu symptoms'
    },
    {
      id: 'absence-3',
      employeeId: 'emp-mike-wilson',
      type: 'training',
      dateStart: '2024-01-25',
      dateEnd: '2024-01-26',
      approved: false,
      reason: 'Safety certification training'
    }
  ];

  for (const absence of absences) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO absences (id, employee_id, type, date_start, date_end, approved, approved_by, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [absence.id, absence.employeeId, absence.type, absence.dateStart, absence.dateEnd, absence.approved, absence.approvedBy, absence.reason]);
  }
}

export async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
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

  console.log('Test data cleanup completed');
}