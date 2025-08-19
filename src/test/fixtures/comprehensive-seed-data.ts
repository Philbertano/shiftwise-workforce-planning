import { DatabaseManager } from '../../database/config';

interface ComprehensiveSeedConfig {
  employeeCount: number;
  skillCount: number;
  stationCount: number;
  shiftTemplateCount: number;
  daysToSeed: number;
}

export async function seedComprehensiveData(config: ComprehensiveSeedConfig) {
  console.log('Seeding comprehensive test data...');

  // Create comprehensive skills with realistic distributions
  const skills = await createComprehensiveSkills(config.skillCount);
  
  // Create shift templates for different scenarios
  const shiftTemplates = await createComprehensiveShiftTemplates(config.shiftTemplateCount);
  
  // Create stations with varied requirements
  const stations = await createComprehensiveStations(config.stationCount, skills);
  
  // Create diverse employee base
  const employees = await createComprehensiveEmployees(config.employeeCount);
  
  // Assign skills with realistic distributions
  await assignSkillsToEmployees(employees, skills);
  
  // Create shift demands for multiple days
  await createShiftDemands(stations, shiftTemplates, config.daysToSeed);
  
  // Create demo users with different roles
  await createDemoUsers();
  
  // Create realistic absence scenarios
  await createAbsenceScenarios(employees);

  console.log('Comprehensive seed data creation completed');

  return {
    employees,
    stations,
    skills,
    shiftTemplates
  };
}

async function createComprehensiveSkills(count: number) {
  const skillCategories = [
    { name: 'technical', skills: ['Welding', 'CNC Operation', 'Assembly', 'Electrical Work', 'Maintenance', 'Quality Control', 'Machine Setup', 'Troubleshooting'] },
    { name: 'safety', skills: ['Safety Inspection', 'First Aid', 'Chemical Handling', 'Equipment Safety', 'Emergency Response', 'Risk Assessment'] },
    { name: 'quality', skills: ['Quality Assurance', 'Testing', 'Calibration', 'Documentation', 'Process Validation', 'Inspection'] },
    { name: 'leadership', skills: ['Team Leadership', 'Training', 'Communication', 'Problem Solving', 'Decision Making', 'Mentoring'] },
    { name: 'operational', skills: ['Forklift Operation', 'Crane Operation', 'Press Operation', 'Packaging Equipment', 'Conveyor Systems', 'Automated Systems'] }
  ];

  const skills = [];
  let skillIndex = 0;

  for (const category of skillCategories) {
    for (const skillName of category.skills) {
      if (skillIndex >= count) break;
      
      const skill = {
        id: `skill-${skillIndex + 1}`,
        name: skillName,
        description: `Professional skill in ${skillName.toLowerCase()}`,
        levelScale: 3,
        category: category.name
      };

      await DatabaseManager.query(`
        INSERT OR REPLACE INTO skills (id, name, description, level_scale, category) 
        VALUES (?, ?, ?, ?, ?)
      `, [skill.id, skill.name, skill.description, skill.levelScale, skill.category]);

      skills.push(skill);
      skillIndex++;
    }
    if (skillIndex >= count) break;
  }

  return skills;
}

async function createComprehensiveShiftTemplates(count: number) {
  const templates = [
    { name: 'Early Morning', startTime: '05:00', endTime: '13:00', shiftType: 'regular', breaks: [{ duration: 30, startAfter: 240 }, { duration: 15, startAfter: 120 }] },
    { name: 'Day Shift', startTime: '08:00', endTime: '16:00', shiftType: 'regular', breaks: [{ duration: 30, startAfter: 240 }, { duration: 15, startAfter: 120 }] },
    { name: 'Afternoon', startTime: '14:00', endTime: '22:00', shiftType: 'regular', breaks: [{ duration: 30, startAfter: 240 }, { duration: 15, startAfter: 120 }] },
    { name: 'Night Shift', startTime: '22:00', endTime: '06:00', shiftType: 'night', breaks: [{ duration: 45, startAfter: 240 }, { duration: 15, startAfter: 120 }] },
    { name: 'Weekend Day', startTime: '09:00', endTime: '17:00', shiftType: 'weekend', breaks: [{ duration: 30, startAfter: 240 }] },
    { name: 'Maintenance Window', startTime: '02:00', endTime: '06:00', shiftType: 'maintenance', breaks: [] }
  ];

  const shiftTemplates = [];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const template = templates[i];
    const shiftTemplate = {
      id: `shift-template-${i + 1}`,
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      shiftType: template.shiftType,
      breakRules: JSON.stringify(template.breaks)
    };

    await DatabaseManager.query(`
      INSERT OR REPLACE INTO shift_templates (id, name, start_time, end_time, shift_type, break_rules) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [shiftTemplate.id, shiftTemplate.name, shiftTemplate.startTime, shiftTemplate.endTime, shiftTemplate.shiftType, shiftTemplate.breakRules]);

    shiftTemplates.push(shiftTemplate);
  }

  return shiftTemplates;
}

async function createComprehensiveStations(count: number, skills: any[]) {
  const stationTypes = [
    { type: 'Assembly', line: 'Production Line A', priority: 'high', requiredSkillCount: 3 },
    { type: 'Welding', line: 'Production Line A', priority: 'high', requiredSkillCount: 2 },
    { type: 'Quality Control', line: 'Production Line B', priority: 'medium', requiredSkillCount: 2 },
    { type: 'Packaging', line: 'Production Line B', priority: 'low', requiredSkillCount: 1 },
    { type: 'Maintenance', line: 'Maintenance Bay', priority: 'critical', requiredSkillCount: 4 },
    { type: 'Material Handling', line: 'Warehouse', priority: 'medium', requiredSkillCount: 2 },
    { type: 'Machine Operation', line: 'Production Line C', priority: 'high', requiredSkillCount: 3 },
    { type: 'Inspection', line: 'Quality Lab', priority: 'medium', requiredSkillCount: 2 }
  ];

  const lines = ['Line A', 'Line B', 'Line C', 'Line D', 'Maintenance', 'Warehouse', 'Quality Lab'];
  const stations = [];

  for (let i = 0; i < count; i++) {
    const stationType = stationTypes[i % stationTypes.length];
    const station = {
      id: `station-${i + 1}`,
      name: `${stationType.type} Station ${Math.floor(i / stationTypes.length) + 1}`,
      line: lines[i % lines.length],
      priority: stationType.priority,
      location: `Floor ${Math.floor(i / 4) + 1}, Section ${String.fromCharCode(65 + (i % 4))}`
    };

    await DatabaseManager.query(`
      INSERT OR REPLACE INTO stations (id, name, line, priority, location) 
      VALUES (?, ?, ?, ?, ?)
    `, [station.id, station.name, station.line, station.priority, station.location]);

    // Add required skills for each station
    const requiredSkillCount = stationType.requiredSkillCount;
    const stationSkills = skills.slice(i * 2, i * 2 + requiredSkillCount);
    
    for (let j = 0; j < stationSkills.length; j++) {
      const skill = stationSkills[j];
      const minLevel = Math.min(3, Math.max(1, j + 1));
      const mandatory = j < 2; // First 2 skills are mandatory
      
      await DatabaseManager.query(`
        INSERT OR REPLACE INTO station_required_skills (station_id, skill_id, min_level, count, mandatory) 
        VALUES (?, ?, ?, ?, ?)
      `, [station.id, skill.id, minLevel, 1, mandatory]);
    }

    stations.push(station);
  }

  return stations;
}

async function createComprehensiveEmployees(count: number) {
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily',
    'James', 'Jessica', 'William', 'Ashley', 'Richard', 'Amanda', 'Thomas',
    'Jennifer', 'Charles', 'Michelle', 'Christopher', 'Melissa', 'Daniel',
    'Kimberly', 'Matthew', 'Donna', 'Anthony', 'Carol', 'Mark', 'Ruth',
    'Donald', 'Sharon', 'Steven', 'Laura', 'Paul', 'Sandra', 'Andrew',
    'Nancy', 'Kenneth', 'Betty', 'Joshua', 'Helen', 'Kevin', 'Deborah',
    'Brian', 'Dorothy', 'George', 'Lisa', 'Edward', 'Nancy', 'Ronald',
    'Karen', 'Timothy', 'Susan', 'Jason', 'Angela', 'Jeffrey', 'Brenda'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell'
  ];

  const contractTypes = [
    { type: 'full-time', weight: 70, weeklyHours: 40, maxHoursPerDay: 8 },
    { type: 'part-time', weight: 20, weeklyHours: 20, maxHoursPerDay: 6 },
    { type: 'contract', weight: 10, weeklyHours: 32, maxHoursPerDay: 8 }
  ];

  const teams = ['Alpha Team', 'Beta Team', 'Gamma Team', 'Delta Team', 'Maintenance Crew', 'Quality Assurance', 'Night Shift Team'];

  const employees = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    
    // Weighted random selection for contract type
    const rand = Math.random() * 100;
    let contractType = contractTypes[0];
    let cumulative = 0;
    for (const ct of contractTypes) {
      cumulative += ct.weight;
      if (rand <= cumulative) {
        contractType = ct;
        break;
      }
    }
    
    const employee = {
      id: `emp-${String(i + 1).padStart(3, '0')}`,
      name: `${firstName} ${lastName}`,
      contractType: contractType.type,
      weeklyHours: contractType.weeklyHours,
      maxHoursPerDay: contractType.maxHoursPerDay,
      minRestHours: 11,
      team: teams[i % teams.length],
      active: i < count - Math.floor(count * 0.05) // 5% inactive employees
    };

    await DatabaseManager.query(`
      INSERT OR REPLACE INTO employees (id, name, contract_type, weekly_hours, max_hours_per_day, min_rest_hours, team, active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [employee.id, employee.name, employee.contractType, employee.weeklyHours, employee.maxHoursPerDay, employee.minRestHours, employee.team, employee.active]);

    employees.push(employee);
  }

  return employees;
}

async function assignSkillsToEmployees(employees: any[], skills: any[]) {
  console.log('Assigning skills to employees...');
  
  for (const employee of employees) {
    // Determine skill count based on employee type and experience level
    let skillCount: number;
    const experienceLevel = Math.random();
    
    if (experienceLevel > 0.8) {
      // Senior employees (20%) - 6-10 skills
      skillCount = 6 + Math.floor(Math.random() * 5);
    } else if (experienceLevel > 0.5) {
      // Mid-level employees (30%) - 4-7 skills
      skillCount = 4 + Math.floor(Math.random() * 4);
    } else {
      // Junior employees (50%) - 2-5 skills
      skillCount = 2 + Math.floor(Math.random() * 4);
    }

    // Randomly select skills for this employee
    const shuffledSkills = [...skills].sort(() => Math.random() - 0.5);
    const selectedSkills = shuffledSkills.slice(0, Math.min(skillCount, skills.length));
    
    for (const skill of selectedSkills) {
      // Assign skill level based on experience
      let level: number;
      if (experienceLevel > 0.8) {
        // Senior: mostly level 2-3
        level = Math.random() > 0.3 ? 3 : 2;
      } else if (experienceLevel > 0.5) {
        // Mid-level: mostly level 2, some 1 and 3
        level = Math.random() > 0.6 ? (Math.random() > 0.7 ? 3 : 1) : 2;
      } else {
        // Junior: mostly level 1-2
        level = Math.random() > 0.7 ? 2 : 1;
      }
      
      // Set expiry date - some skills expire sooner than others
      const validUntil = new Date();
      const monthsToAdd = Math.random() > 0.1 ? 12 + Math.floor(Math.random() * 24) : 1 + Math.floor(Math.random() * 6); // 10% expire within 6 months
      validUntil.setMonth(validUntil.getMonth() + monthsToAdd);
      
      await DatabaseManager.query(`
        INSERT OR REPLACE INTO employee_skills (employee_id, skill_id, level, valid_until) 
        VALUES (?, ?, ?, ?)
      `, [employee.id, skill.id, level, validUntil.toISOString().split('T')[0]]);
    }
  }
}

async function createShiftDemands(stations: any[], shiftTemplates: any[], days: number) {
  console.log(`Creating shift demands for ${days} days...`);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7); // Start from a week ago
  
  for (let day = 0; day < days; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfWeek = currentDate.getDay();
    
    for (const station of stations) {
      for (const shiftTemplate of shiftTemplates) {
        // Skip some shifts based on business rules
        if (shiftTemplate.shiftType === 'maintenance' && dayOfWeek !== 0) continue; // Maintenance only on Sundays
        if (shiftTemplate.shiftType === 'night' && (dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.3) continue; // Reduced night shifts on weekends
        
        // Vary demand based on station priority and day
        let requiredCount = 1;
        if (station.priority === 'critical') requiredCount = 2;
        else if (station.priority === 'high') requiredCount = Math.random() > 0.3 ? 2 : 1;
        
        // Reduce demand on weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          requiredCount = Math.max(1, Math.floor(requiredCount * 0.7));
        }
        
        const demand = {
          id: `demand-${station.id}-${shiftTemplate.id}-${dateStr}`,
          date: dateStr,
          stationId: station.id,
          shiftTemplateId: shiftTemplate.id,
          requiredCount,
          priority: station.priority
        };
        
        await DatabaseManager.query(`
          INSERT OR REPLACE INTO shift_demands (id, date, station_id, shift_template_id, required_count, priority) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [demand.id, demand.date, demand.stationId, demand.shiftTemplateId, demand.requiredCount, demand.priority]);
      }
    }
  }
}

async function createAbsenceScenarios(employees: any[]) {
  console.log('Creating realistic absence scenarios...');
  
  const absenceTypes = [
    { type: 'vacation', weight: 40, avgDuration: 3 },
    { type: 'sick', weight: 35, avgDuration: 1 },
    { type: 'training', weight: 15, avgDuration: 2 },
    { type: 'personal', weight: 10, avgDuration: 1 }
  ];
  
  // Create absences for about 15% of employees
  const employeesWithAbsences = employees.slice(0, Math.floor(employees.length * 0.15));
  
  for (const employee of employeesWithAbsences) {
    // Weighted random selection for absence type
    const rand = Math.random() * 100;
    let absenceType = absenceTypes[0];
    let cumulative = 0;
    for (const at of absenceTypes) {
      cumulative += at.weight;
      if (rand <= cumulative) {
        absenceType = at;
        break;
      }
    }
    
    // Random date in the next 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30));
    
    // Duration based on type with some variation
    const duration = Math.max(1, absenceType.avgDuration + Math.floor(Math.random() * 3) - 1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);
    
    const absence = {
      id: `absence-${employee.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: employee.id,
      type: absenceType.type,
      dateStart: startDate.toISOString().split('T')[0],
      dateEnd: endDate.toISOString().split('T')[0],
      approved: Math.random() > 0.2, // 80% approved
      approvedBy: Math.random() > 0.5 ? 'demo-admin' : 'demo-planner',
      reason: generateAbsenceReason(absenceType.type)
    };
    
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO absences (id, employee_id, type, date_start, date_end, approved, approved_by, reason) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [absence.id, absence.employeeId, absence.type, absence.dateStart, absence.dateEnd, absence.approved, absence.approvedBy, absence.reason]);
  }
}

function generateAbsenceReason(type: string): string {
  const reasons = {
    vacation: ['Annual leave', 'Family vacation', 'Personal time off', 'Extended weekend'],
    sick: ['Flu symptoms', 'Medical appointment', 'Recovery time', 'Family illness'],
    training: ['Safety certification', 'Skills development', 'Equipment training', 'Leadership workshop'],
    personal: ['Family emergency', 'Personal matters', 'Appointment', 'Moving day']
  };
  
  const typeReasons = reasons[type as keyof typeof reasons] || ['Personal reasons'];
  return typeReasons[Math.floor(Math.random() * typeReasons.length)];
}

async function createDemoUsers() {
  const users = [
    {
      id: 'demo-admin',
      username: 'admin',
      email: 'admin@shiftwise.demo',
      passwordHash: '$2b$10$demo.hash.for.admin.user',
      role: 'admin',
      active: true
    },
    {
      id: 'demo-planner',
      username: 'planner',
      email: 'planner@shiftwise.demo',
      passwordHash: '$2b$10$demo.hash.for.planner.user',
      role: 'planner',
      active: true
    },
    {
      id: 'demo-shift-leader',
      username: 'shift-leader',
      email: 'shift-leader@shiftwise.demo',
      passwordHash: '$2b$10$demo.hash.for.shift.leader.user',
      role: 'shift-leader',
      active: true
    },
    {
      id: 'demo-viewer',
      username: 'viewer',
      email: 'viewer@shiftwise.demo',
      passwordHash: '$2b$10$demo.hash.for.viewer.user',
      role: 'viewer',
      active: true
    }
  ];

  for (const user of users) {
    await DatabaseManager.query(`
      INSERT OR REPLACE INTO users (id, username, email, password_hash, role, active) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id, user.username, user.email, user.passwordHash, user.role, user.active]);
  }
}

export async function cleanupComprehensiveData() {
  console.log('Cleaning up comprehensive test data...');
  
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
    try {
      await DatabaseManager.query(`DELETE FROM ${table}`);
    } catch (error) {
      // Ignore errors for tables that don't exist
      console.log(`Note: Table ${table} not found during cleanup`);
    }
  }

  console.log('Comprehensive test data cleanup completed');
}