import { DatabaseManager } from '../../database/config';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  setup: () => Promise<void>;
  expectedOutcome: string;
  testSteps: string[];
}

export const demoScenarios: DemoScenario[] = [
  {
    id: 'skill-shortage-scenario',
    name: 'Critical Skill Shortage',
    description: 'Tests system behavior when there are insufficient qualified employees for critical stations',
    setup: async () => {
      // Create a scenario where Station 1 requires Level 3 Welding but only has Level 1-2 employees
      await DatabaseManager.query(`
        UPDATE station_required_skills 
        SET min_level = 3 
        WHERE station_id = 'station-1' AND skill_id = 'skill-welding'
      `);
      
      await DatabaseManager.query(`
        UPDATE employee_skills 
        SET level = 2 
        WHERE skill_id = 'skill-welding' AND level = 3
      `);
    },
    expectedOutcome: 'System should identify coverage gaps and suggest training or alternative assignments',
    testSteps: [
      'Generate plan for tomorrow',
      'Verify Station 1 shows as uncovered',
      'Check gap analysis shows skill level mismatch',
      'Verify suggested actions include training recommendations'
    ]
  },
  
  {
    id: 'mass-absence-scenario',
    name: 'Mass Absence Event',
    description: 'Tests system resilience when multiple employees are absent simultaneously',
    setup: async () => {
      // Create absences for 30% of employees on the same day
      const employees = await DatabaseManager.query('SELECT id FROM employees WHERE active = 1 LIMIT 10');
      const absenceDate = new Date();
      absenceDate.setDate(absenceDate.getDate() + 1);
      const dateStr = absenceDate.toISOString().split('T')[0];
      
      for (let i = 0; i < Math.min(3, employees.length); i++) {
        const employee = employees[i];
        await DatabaseManager.query(`
          INSERT OR REPLACE INTO absences (id, employee_id, type, date_start, date_end, approved, reason) 
          VALUES (?, ?, 'sick', ?, ?, 1, 'Flu outbreak')
        `, [`absence-outbreak-${employee.id}`, employee.id, dateStr, dateStr]);
      }
    },
    expectedOutcome: 'System should redistribute workload and identify critical coverage gaps',
    testSteps: [
      'Generate plan for affected date',
      'Verify reduced available workforce is handled',
      'Check overtime recommendations',
      'Verify critical stations are prioritized'
    ]
  },
  
  {
    id: 'certification-expiry-scenario',
    name: 'Certification Expiry Crisis',
    description: 'Tests handling of employees with expiring certifications',
    setup: async () => {
      // Set some certifications to expire soon
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await DatabaseManager.query(`
        UPDATE employee_skills 
        SET valid_until = ? 
        WHERE skill_id IN ('skill-safety', 'skill-quality') 
        LIMIT 3
      `, [tomorrowStr]);
    },
    expectedOutcome: 'System should warn about expiring certifications and suggest alternatives',
    testSteps: [
      'Generate plan for next week',
      'Verify warnings about expiring certifications',
      'Check alternative employee suggestions',
      'Verify training recommendations'
    ]
  },
  
  {
    id: 'overtime-optimization-scenario',
    name: 'Overtime Optimization',
    description: 'Tests fair distribution of overtime hours across employees',
    setup: async () => {
      // Create high demand scenario requiring overtime
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      // Increase demand for all stations
      await DatabaseManager.query(`
        UPDATE shift_demands 
        SET required_count = required_count + 1 
        WHERE date = ?
      `, [dateStr]);
    },
    expectedOutcome: 'System should distribute overtime fairly based on employee preferences and history',
    testSteps: [
      'Generate plan with high demand',
      'Verify overtime is distributed fairly',
      'Check employee preference consideration',
      'Verify labor law compliance for overtime'
    ]
  },
  
  {
    id: 'cross-training-opportunity-scenario',
    name: 'Cross-Training Opportunities',
    description: 'Tests identification of cross-training opportunities to improve flexibility',
    setup: async () => {
      // Create scenario where some employees could be cross-trained
      await DatabaseManager.query(`
        DELETE FROM employee_skills 
        WHERE employee_id IN (
          SELECT id FROM employees WHERE team = 'Alpha Team' LIMIT 2
        ) AND skill_id = 'skill-assembly'
      `);
    },
    expectedOutcome: 'System should identify cross-training opportunities to improve coverage',
    testSteps: [
      'Run coverage analysis',
      'Verify cross-training suggestions',
      'Check impact analysis of proposed training',
      'Verify ROI calculations for training investment'
    ]
  },
  
  {
    id: 'shift-preference-conflict-scenario',
    name: 'Shift Preference Conflicts',
    description: 'Tests resolution of conflicting employee shift preferences',
    setup: async () => {
      // This would require employee preferences to be implemented
      // For now, we'll simulate through absence patterns
      const employees = await DatabaseManager.query('SELECT id FROM employees LIMIT 5');
      const nightShiftDate = new Date();
      nightShiftDate.setDate(nightShiftDate.getDate() + 2);
      const dateStr = nightShiftDate.toISOString().split('T')[0];
      
      // Create pattern showing preference against night shifts
      for (const employee of employees.slice(0, 3)) {
        await DatabaseManager.query(`
          INSERT OR REPLACE INTO absences (id, employee_id, type, date_start, date_end, approved, reason) 
          VALUES (?, ?, 'personal', ?, ?, 0, 'Night shift preference conflict')
        `, [`pref-conflict-${employee.id}`, employee.id, dateStr, dateStr]);
      }
    },
    expectedOutcome: 'System should balance employee preferences with operational needs',
    testSteps: [
      'Generate plan with night shift requirements',
      'Verify preference consideration in assignments',
      'Check fairness scoring',
      'Verify alternative solutions when preferences conflict'
    ]
  },
  
  {
    id: 'equipment-maintenance-scenario',
    name: 'Equipment Maintenance Impact',
    description: 'Tests planning around scheduled equipment maintenance',
    setup: async () => {
      // Simulate maintenance by reducing station capacity
      const maintenanceDate = new Date();
      maintenanceDate.setDate(maintenanceDate.getDate() + 3);
      const dateStr = maintenanceDate.toISOString().split('T')[0];
      
      // Reduce demand for stations under maintenance
      await DatabaseManager.query(`
        UPDATE shift_demands 
        SET required_count = CASE 
          WHEN required_count > 1 THEN required_count - 1 
          ELSE 0 
        END
        WHERE date = ? AND station_id IN ('station-1', 'station-2')
      `, [dateStr]);
    },
    expectedOutcome: 'System should redistribute workforce from maintenance-affected stations',
    testSteps: [
      'Generate plan for maintenance day',
      'Verify reduced capacity handling',
      'Check workforce redistribution',
      'Verify maintenance crew assignments'
    ]
  },
  
  {
    id: 'new-employee-integration-scenario',
    name: 'New Employee Integration',
    description: 'Tests integration of new employees with limited skills',
    setup: async () => {
      // Add new employees with minimal skills
      const newEmployees = [
        {
          id: 'emp-new-001',
          name: 'Alex Newcomer',
          contractType: 'full-time',
          weeklyHours: 40,
          maxHoursPerDay: 8,
          minRestHours: 11,
          team: 'Alpha Team',
          active: true
        },
        {
          id: 'emp-new-002',
          name: 'Jordan Trainee',
          contractType: 'part-time',
          weeklyHours: 20,
          maxHoursPerDay: 6,
          minRestHours: 11,
          team: 'Beta Team',
          active: true
        }
      ];
      
      for (const emp of newEmployees) {
        await DatabaseManager.query(`
          INSERT OR REPLACE INTO employees (id, name, contract_type, weekly_hours, max_hours_per_day, min_rest_hours, team, active) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [emp.id, emp.name, emp.contractType, emp.weeklyHours, emp.maxHoursPerDay, emp.minRestHours, emp.team, emp.active]);
        
        // Give them basic skills only
        await DatabaseManager.query(`
          INSERT OR REPLACE INTO employee_skills (employee_id, skill_id, level, valid_until) 
          VALUES (?, 'skill-safety', 1, '2025-12-31')
        `, [emp.id]);
      }
    },
    expectedOutcome: 'System should assign new employees to appropriate stations with mentoring',
    testSteps: [
      'Generate plan including new employees',
      'Verify new employees get appropriate assignments',
      'Check mentoring pair suggestions',
      'Verify training recommendations'
    ]
  }
];

export async function setupDemoScenario(scenarioId: string): Promise<DemoScenario | null> {
  const scenario = demoScenarios.find(s => s.id === scenarioId);
  if (!scenario) {
    console.error(`Demo scenario '${scenarioId}' not found`);
    return null;
  }
  
  console.log(`Setting up demo scenario: ${scenario.name}`);
  await scenario.setup();
  console.log(`Demo scenario '${scenario.name}' setup completed`);
  
  return scenario;
}

export async function runAllDemoScenarios(): Promise<void> {
  console.log('Setting up all demo scenarios...');
  
  for (const scenario of demoScenarios) {
    try {
      await scenario.setup();
      console.log(`✓ ${scenario.name} setup completed`);
    } catch (error) {
      console.error(`✗ ${scenario.name} setup failed:`, error);
    }
  }
  
  console.log('All demo scenarios setup completed');
}

export function getDemoScenarioDocumentation(): string {
  let doc = '# Demo Scenarios Documentation\n\n';
  doc += 'This document describes the available demo scenarios for testing the ShiftWise workforce planning system.\n\n';
  
  for (const scenario of demoScenarios) {
    doc += `## ${scenario.name}\n\n`;
    doc += `**ID:** \`${scenario.id}\`\n\n`;
    doc += `**Description:** ${scenario.description}\n\n`;
    doc += `**Expected Outcome:** ${scenario.expectedOutcome}\n\n`;
    doc += '**Test Steps:**\n';
    scenario.testSteps.forEach((step, index) => {
      doc += `${index + 1}. ${step}\n`;
    });
    doc += '\n---\n\n';
  }
  
  return doc;
}