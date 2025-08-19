// Repository exports for ShiftWise workforce planning system

export { BaseRepository, IBaseRepository, RepositoryOptions } from './base';

export { EmployeeRepository, IEmployeeRepository } from './employee.repository';
export { SkillRepository, ISkillRepository } from './skill.repository';
export { EmployeeSkillRepository, IEmployeeSkillRepository } from './employee-skill.repository';
export { ShiftTemplateRepository, IShiftTemplateRepository } from './shift-template.repository';
export { StationRepository, IStationRepository } from './station.repository';
export { ShiftDemandRepository, IShiftDemandRepository } from './shift-demand.repository';
export { AssignmentRepository, IAssignmentRepository } from './assignment.repository';
export { AbsenceRepository, IAbsenceRepository } from './absence.repository';
export { PlanRepository, IPlanRepository } from './plan.repository';
export { ExecutionStatusRepository, IExecutionStatusRepository } from './execution-status.repository';

import { PlanRepository } from './plan.repository';
import { ExecutionStatusRepository } from './execution-status.repository';

// Repository factory for dependency injection
export class RepositoryFactory {
  private static instance: RepositoryFactory;
  
  private employeeRepo?: EmployeeRepository;
  private skillRepo?: SkillRepository;
  private employeeSkillRepo?: EmployeeSkillRepository;
  private shiftTemplateRepo?: ShiftTemplateRepository;
  private stationRepo?: StationRepository;
  private shiftDemandRepo?: ShiftDemandRepository;
  private assignmentRepo?: AssignmentRepository;
  private absenceRepo?: AbsenceRepository;
  private planRepo?: PlanRepository;
  private executionStatusRepo?: ExecutionStatusRepository;

  private constructor() {}

  public static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  public getEmployeeRepository(): EmployeeRepository {
    if (!this.employeeRepo) {
      this.employeeRepo = new EmployeeRepository();
    }
    return this.employeeRepo;
  }

  public getSkillRepository(): SkillRepository {
    if (!this.skillRepo) {
      this.skillRepo = new SkillRepository();
    }
    return this.skillRepo;
  }

  public getEmployeeSkillRepository(): EmployeeSkillRepository {
    if (!this.employeeSkillRepo) {
      this.employeeSkillRepo = new EmployeeSkillRepository();
    }
    return this.employeeSkillRepo;
  }

  public getShiftTemplateRepository(): ShiftTemplateRepository {
    if (!this.shiftTemplateRepo) {
      this.shiftTemplateRepo = new ShiftTemplateRepository();
    }
    return this.shiftTemplateRepo;
  }

  public getStationRepository(): StationRepository {
    if (!this.stationRepo) {
      this.stationRepo = new StationRepository();
    }
    return this.stationRepo;
  }

  public getShiftDemandRepository(): ShiftDemandRepository {
    if (!this.shiftDemandRepo) {
      this.shiftDemandRepo = new ShiftDemandRepository();
    }
    return this.shiftDemandRepo;
  }

  public getAssignmentRepository(): AssignmentRepository {
    if (!this.assignmentRepo) {
      this.assignmentRepo = new AssignmentRepository();
    }
    return this.assignmentRepo;
  }

  public getAbsenceRepository(): AbsenceRepository {
    if (!this.absenceRepo) {
      this.absenceRepo = new AbsenceRepository();
    }
    return this.absenceRepo;
  }

  public getPlanRepository(): PlanRepository {
    if (!this.planRepo) {
      this.planRepo = new PlanRepository();
    }
    return this.planRepo;
  }

  public getExecutionStatusRepository(): ExecutionStatusRepository {
    if (!this.executionStatusRepo) {
      this.executionStatusRepo = new ExecutionStatusRepository();
    }
    return this.executionStatusRepo;
  }

  // Clear all cached repositories (useful for testing)
  public clearCache(): void {
    this.employeeRepo = undefined;
    this.skillRepo = undefined;
    this.employeeSkillRepo = undefined;
    this.shiftTemplateRepo = undefined;
    this.stationRepo = undefined;
    this.shiftDemandRepo = undefined;
    this.assignmentRepo = undefined;
    this.absenceRepo = undefined;
    this.planRepo = undefined;
    this.executionStatusRepo = undefined;
  }
}