import { Employee } from '../../models/Employee.js';
import { Assignment } from '../../models/Assignment.js';
import { ShiftDemand, Absence, Station, ShiftTemplate, EmployeeSkill } from '../../types/index.js';

/**
 * Context object containing all data needed for constraint validation
 */
export class ValidationContext {
  public readonly employees: Employee[];
  public readonly assignments: Assignment[];
  public readonly demands: ShiftDemand[];
  public readonly absences: Absence[];
  public readonly stations: Station[];
  public readonly shiftTemplates: ShiftTemplate[];
  public readonly employeeSkills: EmployeeSkill[];
  public readonly date: Date;
  public readonly metadata: Record<string, any>;

  constructor(data: {
    employees: Employee[];
    assignments: Assignment[];
    demands: ShiftDemand[];
    absences: Absence[];
    stations: Station[];
    shiftTemplates: ShiftTemplate[];
    employeeSkills: EmployeeSkill[];
    date: Date;
    metadata?: Record<string, any>;
  }) {
    this.employees = data.employees;
    this.assignments = data.assignments;
    this.demands = data.demands;
    this.absences = data.absences;
    this.stations = data.stations;
    this.shiftTemplates = data.shiftTemplates;
    this.employeeSkills = data.employeeSkills;
    this.date = data.date;
    this.metadata = data.metadata || {};
  }

  /**
   * Get employee by ID
   */
  public getEmployee(employeeId: string): Employee | undefined {
    return this.employees.find(emp => emp.id === employeeId);
  }

  /**
   * Get demand by ID
   */
  public getDemand(demandId: string): ShiftDemand | undefined {
    return this.demands.find(demand => demand.id === demandId);
  }

  /**
   * Get station by ID
   */
  public getStation(stationId: string): Station | undefined {
    return this.stations.find(station => station.id === stationId);
  }

  /**
   * Get shift template by ID
   */
  public getShiftTemplate(shiftTemplateId: string): ShiftTemplate | undefined {
    return this.shiftTemplates.find(template => template.id === shiftTemplateId);
  }

  /**
   * Get all skills for an employee
   */
  public getEmployeeSkills(employeeId: string): EmployeeSkill[] {
    return this.employeeSkills.filter(skill => skill.employeeId === employeeId);
  }

  /**
   * Get all active assignments for an employee
   */
  public getEmployeeAssignments(employeeId: string): Assignment[] {
    return this.assignments.filter(assignment => 
      assignment.employeeId === employeeId && assignment.isActive()
    );
  }

  /**
   * Get all assignments for a specific demand
   */
  public getDemandAssignments(demandId: string): Assignment[] {
    return this.assignments.filter(assignment => 
      assignment.demandId === demandId && assignment.isActive()
    );
  }

  /**
   * Get all approved absences for an employee
   */
  public getEmployeeAbsences(employeeId: string): Absence[] {
    return this.absences.filter(absence => 
      absence.employeeId === employeeId && absence.approved
    );
  }

  /**
   * Get absences for an employee on a specific date
   */
  public getEmployeeAbsencesOnDate(employeeId: string, date: Date): Absence[] {
    return this.absences.filter(absence => 
      absence.employeeId === employeeId &&
      absence.approved &&
      date >= absence.dateStart &&
      date <= absence.dateEnd
    );
  }

  /**
   * Check if employee is available on a specific date
   */
  public isEmployeeAvailable(employeeId: string, date: Date): boolean {
    const employee = this.getEmployee(employeeId);
    if (!employee || !employee.active) {
      return false;
    }

    const absences = this.getEmployeeAbsencesOnDate(employeeId, date);
    return absences.length === 0;
  }

  /**
   * Get all assignments for an employee on a specific date
   */
  public getEmployeeAssignmentsOnDate(employeeId: string, date: Date): Assignment[] {
    return this.assignments.filter(assignment => {
      if (assignment.employeeId !== employeeId || !assignment.isActive()) {
        return false;
      }
      
      const demand = this.getDemand(assignment.demandId);
      return demand && demand.date.toDateString() === date.toDateString();
    });
  }

  /**
   * Get total hours assigned to an employee on a specific date
   */
  public getEmployeeHoursOnDate(employeeId: string, date: Date): number {
    const assignments = this.getEmployeeAssignmentsOnDate(employeeId, date);
    let totalHours = 0;

    for (const assignment of assignments) {
      const demand = this.getDemand(assignment.demandId);
      if (demand) {
        const shiftTemplate = this.getShiftTemplate(demand.shiftTemplateId);
        if (shiftTemplate) {
          totalHours += this.calculateShiftHours(shiftTemplate.startTime, shiftTemplate.endTime);
        }
      }
    }

    return totalHours;
  }

  /**
   * Calculate hours for a shift
   */
  private calculateShiftHours(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }
    
    return (endMinutes - startMinutes) / 60;
  }

  /**
   * Get weekly hours for an employee (considering the current date as part of the week)
   */
  public getEmployeeWeeklyHours(employeeId: string, weekStartDate: Date): number {
    // This is a simplified implementation - in practice you'd need proper week calculation
    let totalHours = 0;
    const weekDays = 7;
    
    for (let i = 0; i < weekDays; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(weekStartDate.getDate() + i);
      totalHours += this.getEmployeeHoursOnDate(employeeId, currentDate);
    }
    
    return totalHours;
  }

  /**
   * Create a copy with additional assignments
   */
  public withAdditionalAssignments(newAssignments: Assignment[]): ValidationContext {
    return new ValidationContext({
      employees: this.employees,
      assignments: [...this.assignments, ...newAssignments],
      demands: this.demands,
      absences: this.absences,
      stations: this.stations,
      shiftTemplates: this.shiftTemplates,
      employeeSkills: this.employeeSkills,
      date: this.date,
      metadata: this.metadata
    });
  }

  /**
   * Create a copy with updated metadata
   */
  public withMetadata(additionalMetadata: Record<string, any>): ValidationContext {
    return new ValidationContext({
      employees: this.employees,
      assignments: this.assignments,
      demands: this.demands,
      absences: this.absences,
      stations: this.stations,
      shiftTemplates: this.shiftTemplates,
      employeeSkills: this.employeeSkills,
      date: this.date,
      metadata: { ...this.metadata, ...additionalMetadata }
    });
  }
}