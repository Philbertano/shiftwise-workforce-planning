import { DatabaseManager } from '../../database/config';

interface DatasetConfig {
  employeeCount: number;
  stationCount: number;
  skillCount: number;
  shiftTemplateCount: number;
}

export async function generateLargeDataset(config: DatasetConfig) {
  console.log(`Generating dataset: ${config.employeeCount} employees, ${config.stationCount} stations, ${config.skillCount} skills`);

  // Generate skills
  const skills = await generateSkills(config.skillCount);
  
  // Generate shift templates
  const shiftTemplates = await generateShiftTemplates(config.shiftTemplateCount);
  
  // Generate stations
  const stations = await generateStations(config.stationCount, skills);
  
  // Generate employees
  const employees = await generateEmployees(config.employeeCount);
  
  // Generate employee skills (qualifications)
  await generateEmployeeSkills(employees, skills);
  
  // Generate shift demands
  await generateShiftDemands(stations, shiftTemplates);

  console.log('Large dataset generation completed');

  return {
    employees,
    stations,
    skills,
    shiftTemplates
  };
}

async function generateSkills(count: number) {
  const skillCategories = ['Technical', 'Safety', 'Quality', 'Leadership', 'Machine Operation'];
  const skillNames = [
    'Welding', 'Assembly', 'Quality Control', 'Machine Setup', 'Safety Inspection',
    'Forklift Operation', 'Crane Operation', 'Electrical Work', 'Maintenance',
    'Team Leadership', 'Training', 'Documentation', 'Problem Solving',
    'CNC Operation', 'Packaging', 'Inventory Management', 'First Aid',
    'Chemical Handling', 'Precision Measurement', 'Process Optimization',
    'Equipment Calibration', 'Data Analysis', 'Project Management',
    'Communication', 'Continuous Improvement'
  ];

  const skills = [];
  
  for (let i = 0; i < count; i++) {
    const skill = {
      id: `skill-${i + 1}`,
      name: skillNames[i % skillNames.length] + (i >= skillNames.length ? ` Level ${Math.floor(i / skillNames.length) + 1}` : ''),
      description: `Professional skill in ${skillNames[i % skillNames.length].toLowerCase()}`,
      levelScale: 3,
      category: skillCategories[i % skillCategories.length]
    };

    await DatabaseManager.query(`
      INSERT INTO skills (id, name, description, level_scale, category) 
      VALUES (?, ?, ?, ?, ?)
    `, [skill.id, skill.name, skill.description, skill.levelScale, skill.category]);

    skills.push(skill);
  }

  return skills;
}

async function generateShiftTemplates(count: number) {
  const templates = [
    { name: 'Morning Shift', startTime: '06:00', endTime: '14:00', shiftType: 'regular' },
    { name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', shiftType: 'regular' },
    { name: 'Night Shift', startTime: '22:00', endTime: '06:00', shiftType: 'night' },
    { name: 'Weekend Day', startTime: '08:00', endTime: '16:00', shiftType: 'weekend' }
  ];

  const shiftTemplates = [];

  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const shiftTemplate = {
      id: `shift-template-${i + 1}`,
      name: template.name + (i >= templates.length ? ` ${Math.floor(i / templates.length) + 1}` : ''),
      startTime: template.startTime,
      endTime: template.endTime,
      shiftType: template.shiftType,
      breakRules: JSON.stringify([
        { duration: 30, startAfter: 240 }, // 30min break after 4 hours
        { duration: 15, startAfter: 120 }  // 15min break after 2 hours
      ])
    };

    await DatabaseManager.query(`
      INSERT INTO shift_templates (id, name, start_time, end_time, shift_type, break_rules) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [shiftTemplate.id, shiftTemplate.name, shiftTemplate.startTime, shiftTemplate.endTime, shiftTemplate.shiftType, shiftTemplate.breakRules]);

    shiftTemplates.push(shiftTemplate);
  }

  return shiftTemplates;
}

async function generateStations(count: number, skills: any[]) {
  const stationTypes = ['Assembly', 'Quality', 'Packaging', 'Maintenance', 'Inspection'];
  const lines = ['Line A', 'Line B', 'Line C', 'Line D'];
  
  const stations = [];

  for (let i = 0; i < count; i++) {
    const station = {
      id: `station-${i + 1}`,
      name: `${stationTypes[i % stationTypes.length]} ${i + 1}`,
      line: lines[i % lines.length],
      priority: ['high', 'medium', 'low'][i % 3],
      location: `Floor ${Math.floor(i / 3) + 1}, Section ${String.fromCharCode(65 + (i % 3))}`
    };

    await DatabaseManager.query(`
      INSERT INTO stations (id, name, line, priority, location) 
      VALUES (?, ?, ?, ?, ?)
    `, [station.id, station.name, station.line, station.priority, station.location]);

    // Add required skills for each station (2-4 skills per station)
    const requiredSkillCount = 2 + (i % 3);
    const stationSkills = skills.slice(i * 2, i * 2 + requiredSkillCount);
    
    for (const skill of stationSkills) {
      await DatabaseManager.query(`
        INSERT INTO station_required_skills (station_id, skill_id, min_level, count, mandatory) 
        VALUES (?, ?, ?, ?, ?)
      `, [station.id, skill.id, 1 + (i % 3), 1, true]);
    }

    stations.push(station);
  }

  return stations;
}

async function generateEmployees(count: number) {
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily',
    'James', 'Jessica', 'William', 'Ashley', 'Richard', 'Amanda', 'Thomas',
    'Jennifer', 'Charles', 'Michelle', 'Christopher', 'Melissa', 'Daniel',
    'Kimberly', 'Matthew', 'Donna', 'Anthony', 'Carol', 'Mark', 'Ruth',
    'Donald', 'Sharon', 'Steven', 'Laura', 'Paul', 'Sandra', 'Andrew'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King'
  ];

  const contractTypes = ['full-time', 'part-time', 'contract'];
  const teams = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'];

  const employees = [];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const contractType = contractTypes[i % contractTypes.length];
    
    const employee = {
      id: `employee-${i + 1}`,
      name: `${firstName} ${lastName}`,
      contractType,
      weeklyHours: contractType === 'full-time' ? 40 : contractType === 'part-time' ? 20 : 32,
      maxHoursPerDay: contractType === 'full-time' ? 8 : 6,
      minRestHours: 11,
      team: teams[i % teams.length],
      active: i < count - 5 // Make last 5 employees inactive for testing
    };

    await DatabaseManager.query(`
      INSERT INTO employees (id, name, contract_type, weekly_hours, max_hours_per_day, min_rest_hours, team, active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [employee.id, employee.name, employee.contractType, employee.weeklyHours, employee.maxHoursPerDay, employee.minRestHours, employee.team, employee.active]);

    employees.push(employee);
  }

  return employees;
}

async function generateEmployeeSkills(employees: any[], skills: any[]) {
  console.log('Generating employee skills...');
  
  for (const employee of employees) {
    // Each employee gets 3-8 skills with varying levels
    const skillCount = 3 + Math.floor(Math.random() * 6);
    const employeeSkills = [];
    
    // Randomly select skills for this employee
    const shuffledSkills = [...skills].sort(() => Math.random() - 0.5);
    const selectedSkills = shuffledSkills.slice(0, skillCount);
    
    for (const skill of selectedSkills) {
      const level = 1 + Math.floor(Math.random() * 3); // Level 1-3
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1 + Math.floor(Math.random() * 2)); // Valid for 1-3 years
      
      await DatabaseManager.query(`
        INSERT INTO employee_skills (employee_id, skill_id, level, valid_until) 
        VALUES (?, ?, ?, ?)
      `, [employee.id, skill.id, level, validUntil.toISOString().split('T')[0]]);
      
      employeeSkills.push({
        employeeId: employee.id,
        skillId: skill.id,
        level,
        validUntil
      });
    }
  }
}

async function generateShiftDemands(stations: any[], shiftTemplates: any[]) {
  console.log('Generating shift demands...');
  
  // Generate demands for the next 30 days
  const startDate = new Date('2024-01-15');
  
  for (let day = 0; day < 30; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    for (const station of stations) {
      for (const shiftTemplate of shiftTemplates) {
        // Skip night shifts on weekends for some stations
        if (shiftTemplate.shiftType === 'night' && 
            (currentDate.getDay() === 0 || currentDate.getDay() === 6) && 
            Math.random() > 0.3) {
          continue;
        }
        
        const demand = {
          id: `demand-${station.id}-${shiftTemplate.id}-${dateStr}`,
          date: dateStr,
          stationId: station.id,
          shiftTemplateId: shiftTemplate.id,
          requiredCount: 1 + Math.floor(Math.random() * 2), // 1-2 people per station per shift
          priority: station.priority
        };
        
        await DatabaseManager.query(`
          INSERT INTO shift_demands (id, date, station_id, shift_template_id, required_count, priority) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [demand.id, demand.date, demand.stationId, demand.shiftTemplateId, demand.requiredCount, demand.priority]);
      }
    }
  }
}