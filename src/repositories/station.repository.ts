// Station repository implementation

import { BaseRepository } from './base';
import { Station, Priority, RequiredSkill } from '../types';

export interface IStationRepository extends BaseRepository<Station> {
  findByLine(line: string): Promise<Station[]>;
  findByPriority(priority: Priority): Promise<Station[]>;
  findByRequiredSkill(skillId: string, minLevel?: number): Promise<Station[]>;
  findByLocation(location: string): Promise<Station[]>;
  getStationRequirements(stationId: string): Promise<RequiredSkill[]>;
}

export class StationRepository extends BaseRepository<Station> implements IStationRepository {
  constructor() {
    super('stations');
  }

  protected mapRowToEntity(row: any): Station {
    return {
      id: row.id,
      name: row.name,
      line: row.line,
      requiredSkills: this.deserializeValue(row.required_skills, 'json') as RequiredSkill[],
      priority: row.priority as Priority,
      location: row.location,
      createdAt: this.deserializeValue(row.created_at, 'date'),
      updatedAt: this.deserializeValue(row.updated_at, 'date')
    };
  }

  protected getColumnMapping(): Record<string, string> {
    return {
      requiredSkills: 'required_skills',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
  }

  async findByLine(line: string): Promise<Station[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE line = ? ORDER BY name`;
    return this.findByQuery(sql, [line]);
  }

  async findByPriority(priority: Priority): Promise<Station[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE priority = ? ORDER BY name`;
    return this.findByQuery(sql, [priority]);
  }

  async findByRequiredSkill(skillId: string, minLevel?: number): Promise<Station[]> {
    const stations = await this.findAll();
    
    return stations.filter(station => {
      return station.requiredSkills.some(req => {
        if (req.skillId !== skillId) return false;
        if (minLevel !== undefined && req.minLevel < minLevel) return false;
        return true;
      });
    });
  }

  async findByLocation(location: string): Promise<Station[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE location = ? ORDER BY name`;
    return this.findByQuery(sql, [location]);
  }

  async getStationRequirements(stationId: string): Promise<RequiredSkill[]> {
    const station = await this.findById(stationId);
    return station?.requiredSkills || [];
  }

  async getLineSummary(): Promise<{ 
    line: string; 
    stationCount: number; 
    totalRequiredPositions: number;
    priorityDistribution: { priority: Priority; count: number }[];
  }[]> {
    const sql = `
      SELECT line, COUNT(*) as station_count
      FROM ${this.tableName}
      GROUP BY line
      ORDER BY line
    `;
    
    const rows = await this.executeQuery(sql);
    const results = [];
    
    for (const row of rows) {
      const stations = await this.findByLine(row.line);
      
      // Calculate total required positions
      const totalRequiredPositions = stations.reduce((total, station) => {
        return total + station.requiredSkills.reduce((stationTotal, skill) => {
          return stationTotal + skill.count;
        }, 0);
      }, 0);

      // Get priority distribution
      const priorityMap = new Map<Priority, number>();
      stations.forEach(station => {
        const current = priorityMap.get(station.priority) || 0;
        priorityMap.set(station.priority, current + 1);
      });

      const priorityDistribution = Array.from(priorityMap.entries()).map(([priority, count]) => ({
        priority,
        count
      }));

      results.push({
        line: row.line,
        stationCount: row.station_count,
        totalRequiredPositions,
        priorityDistribution
      });
    }
    
    return results;
  }

  async getSkillDemand(): Promise<{ 
    skillId: string; 
    skillName: string;
    totalDemand: number;
    stationCount: number;
    avgMinLevel: number;
  }[]> {
    const stations = await this.findAll();
    const skillDemandMap = new Map<string, {
      totalDemand: number;
      stationCount: number;
      totalMinLevel: number;
    }>();

    // Aggregate skill demand across all stations
    stations.forEach(station => {
      station.requiredSkills.forEach(req => {
        const current = skillDemandMap.get(req.skillId) || {
          totalDemand: 0,
          stationCount: 0,
          totalMinLevel: 0
        };

        skillDemandMap.set(req.skillId, {
          totalDemand: current.totalDemand + req.count,
          stationCount: current.stationCount + 1,
          totalMinLevel: current.totalMinLevel + req.minLevel
        });
      });
    });

    // Get skill names
    const skillIds = Array.from(skillDemandMap.keys());
    const skillNames = new Map<string, string>();
    
    if (skillIds.length > 0) {
      const placeholders = skillIds.map(() => '?').join(',');
      const skillRows = await this.executeQuery(
        `SELECT id, name FROM skills WHERE id IN (${placeholders})`,
        skillIds
      );
      
      skillRows.forEach(row => {
        skillNames.set(row.id, row.name);
      });
    }

    // Build result
    return Array.from(skillDemandMap.entries()).map(([skillId, data]) => ({
      skillId,
      skillName: skillNames.get(skillId) || 'Unknown',
      totalDemand: data.totalDemand,
      stationCount: data.stationCount,
      avgMinLevel: Math.round((data.totalMinLevel / data.stationCount) * 100) / 100
    })).sort((a, b) => b.totalDemand - a.totalDemand);
  }

  async findStationsNeedingSkill(skillId: string, employeeSkillLevel: number): Promise<Station[]> {
    const stations = await this.findAll();
    
    return stations.filter(station => {
      return station.requiredSkills.some(req => 
        req.skillId === skillId && req.minLevel <= employeeSkillLevel
      );
    });
  }
}