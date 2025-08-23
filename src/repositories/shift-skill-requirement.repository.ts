import { BaseRepository } from './base.js';
import { ShiftSkillRequirement } from '../models/ShiftSkillRequirement.js';
import { Priority } from '../types/index.js';

export class ShiftSkillRequirementRepository extends BaseRepository<ShiftSkillRequirement> {
  constructor() {
    super('shift_skill_requirements');
  }

  protected mapRowToEntity(row: any): ShiftSkillRequirement {
    return new ShiftSkillRequirement({
      id: row.id,
      staffingRequirementId: row.staffing_requirement_id,
      skillId: row.skill_id,
      minLevel: row.min_level,
      requiredCount: row.required_count,
      mandatory: Boolean(row.mandatory),
      priority: row.priority as Priority,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  }

  protected mapEntityToRow(entity: ShiftSkillRequirement): Record<string, any> {
    return {
      id: entity.id,
      staffing_requirement_id: entity.staffingRequirementId,
      skill_id: entity.skillId,
      min_level: entity.minLevel,
      required_count: entity.requiredCount,
      mandatory: entity.mandatory,
      priority: entity.priority,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString()
    };
  }

  /**
   * Find skill requirements for a specific staffing requirement
   */
  async findByStaffingRequirement(staffingRequirementId: string): Promise<ShiftSkillRequirement[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE staffing_requirement_id = ?
      ORDER BY mandatory DESC, priority DESC, skill_id
    `;
    
    const rows = await this.db.query(query, [staffingRequirementId]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find skill requirements for multiple staffing requirements
   */
  async findByStaffingRequirements(staffingRequirementIds: string[]): Promise<Map<string, ShiftSkillRequirement[]>> {
    if (staffingRequirementIds.length === 0) {
      return new Map();
    }

    const placeholders = staffingRequirementIds.map(() => '?').join(',');
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE staffing_requirement_id IN (${placeholders})
      ORDER BY staffing_requirement_id, mandatory DESC, priority DESC, skill_id
    `;
    
    const rows = await this.db.query(query, staffingRequirementIds);
    const requirementMap = new Map<string, ShiftSkillRequirement[]>();
    
    rows.forEach(row => {
      const requirement = this.mapRowToEntity(row);
      const staffingId = requirement.staffingRequirementId;
      
      if (!requirementMap.has(staffingId)) {
        requirementMap.set(staffingId, []);
      }
      
      requirementMap.get(staffingId)!.push(requirement);
    });
    
    return requirementMap;
  }

  /**
   * Find skill requirements by skill ID
   */
  async findBySkill(skillId: string): Promise<ShiftSkillRequirement[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE skill_id = ?
      ORDER BY mandatory DESC, priority DESC, staffing_requirement_id
    `;
    
    const rows = await this.db.query(query, [skillId]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find mandatory skill requirements for a staffing requirement
   */
  async findMandatoryByStaffingRequirement(staffingRequirementId: string): Promise<ShiftSkillRequirement[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE staffing_requirement_id = ? AND mandatory = 1
      ORDER BY priority DESC, skill_id
    `;
    
    const rows = await this.db.query(query, [staffingRequirementId]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Find skill requirements by priority level
   */
  async findByPriority(priority: Priority): Promise<ShiftSkillRequirement[]> {
    const query = `
      SELECT * FROM ${this.tableName} 
      WHERE priority = ?
      ORDER BY mandatory DESC, staffing_requirement_id, skill_id
    `;
    
    const rows = await this.db.query(query, [priority]);
    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Get skill requirements with station and shift information
   */
  async findWithStationAndShiftInfo(): Promise<Array<{
    skillRequirement: ShiftSkillRequirement;
    stationName: string;
    shiftTemplateName: string;
    skillName: string;
  }>> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ssr.*,
          s.name as station_name,
          st.name as shift_template_name,
          sk.name as skill_name
        FROM ${this.tableName} ssr
        JOIN shift_staffing_requirements ssreq ON ssr.staffing_requirement_id = ssreq.id
        JOIN stations s ON ssreq.station_id = s.id
        JOIN shift_templates st ON ssreq.shift_template_id = st.id
        JOIN skills sk ON ssr.skill_id = sk.id
        ORDER BY s.name, st.name, ssr.mandatory DESC, ssr.priority DESC, sk.name
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const results = rows.map(row => ({
          skillRequirement: this.mapRowToEntity(row),
          stationName: row.station_name,
          shiftTemplateName: row.shift_template_name,
          skillName: row.skill_name
        }));
        
        resolve(results);
      });
    });
  }

  /**
   * Delete all skill requirements for a staffing requirement
   */
  async deleteByStaffingRequirement(staffingRequirementId: string): Promise<number> {
    const query = `DELETE FROM ${this.tableName} WHERE staffing_requirement_id = ?`;
    await this.db.run(query, [staffingRequirementId]);
    return 1; // DatabaseManager doesn't return changes count
  }

  /**
   * Get skill requirement statistics
   */
  async getSkillStatistics(): Promise<Array<{
    skillId: string;
    skillName: string;
    totalRequirements: number;
    mandatoryRequirements: number;
    criticalRequirements: number;
    averageMinLevel: number;
    totalRequiredCount: number;
  }>> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ssr.skill_id,
          sk.name as skill_name,
          COUNT(*) as total_requirements,
          SUM(CASE WHEN ssr.mandatory = 1 THEN 1 ELSE 0 END) as mandatory_requirements,
          SUM(CASE WHEN ssr.priority = 'critical' THEN 1 ELSE 0 END) as critical_requirements,
          AVG(ssr.min_level) as average_min_level,
          SUM(ssr.required_count) as total_required_count
        FROM ${this.tableName} ssr
        JOIN skills sk ON ssr.skill_id = sk.id
        GROUP BY ssr.skill_id, sk.name
        ORDER BY total_requirements DESC, sk.name
      `;
      
      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const statistics = rows.map(row => ({
          skillId: row.skill_id,
          skillName: row.skill_name,
          totalRequirements: row.total_requirements,
          mandatoryRequirements: row.mandatory_requirements,
          criticalRequirements: row.critical_requirements,
          averageMinLevel: Math.round(row.average_min_level * 10) / 10,
          totalRequiredCount: row.total_required_count
        }));
        
        resolve(statistics);
      });
    });
  }

  /**
   * Find skill requirements that might conflict (same skill, different levels)
   */
  async findPotentialConflicts(): Promise<Array<{
    skillId: string;
    skillName: string;
    requirements: ShiftSkillRequirement[];
    levelVariance: number;
  }>> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          ssr.skill_id,
          sk.name as skill_name,
          MIN(ssr.min_level) as min_level,
          MAX(ssr.min_level) as max_level,
          COUNT(*) as requirement_count
        FROM ${this.tableName} ssr
        JOIN skills sk ON ssr.skill_id = sk.id
        GROUP BY ssr.skill_id, sk.name
        HAVING max_level > min_level
        ORDER BY (max_level - min_level) DESC, requirement_count DESC
      `;
      
      this.db.all(query, [], async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          const conflicts = [];
          
          for (const row of rows) {
            const requirements = await this.findBySkill(row.skill_id);
            conflicts.push({
              skillId: row.skill_id,
              skillName: row.skill_name,
              requirements,
              levelVariance: row.max_level - row.min_level
            });
          }
          
          resolve(conflicts);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}