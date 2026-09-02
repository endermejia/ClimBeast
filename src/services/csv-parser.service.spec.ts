import { describe, expect, it } from 'vitest';

import { AscentTypes, ClimbingKinds } from '../models';

import { CsvParserService } from './csv-parser.service';

describe('CsvParserService', () => {
  const service = new CsvParserService();

  const createCsv = (rows: string[]) => {
    const header =
      '"route_boulder","name","location_name","sector_name","area_name","country_code","date","type","sub_type","rating","project","tries","repeats","difficulty","perceived_hardness","comment","height","recommended","sits"';
    return [header, ...rows].join('\n');
  };

  it('parses flash ascent without tries as 1 attempt', () => {
    const csv = createCsv([
      '"ROUTE","Flash Route","Siurana","El Pati","Catalunya","ES","2024-01-01","flash","","4","0","","0","7a","","nice","15","1","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Flash Route');
    expect(result[0].type).toBe(AscentTypes.F);
    expect(result[0].tries).toBe(1);
  });

  it('parses onsight ascent without tries as 1 attempt', () => {
    const csv = createCsv([
      '"ROUTE","Onsight Route","Siurana","El Pati","Catalunya","ES","2024-01-01","onsight","","5","0","","0","7a+","","epic","20","1","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Onsight Route');
    expect(result[0].type).toBe(AscentTypes.OS);
    expect(result[0].tries).toBe(1);
  });

  it('parses second go in type column without tries as 2 attempts and rp type', () => {
    const csv = createCsv([
      '"ROUTE","Second Go Route","Siurana","El Pati","Catalunya","ES","2024-01-01","second go","","3","0","","0","7b","","almost flashed","25","0","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Second Go Route');
    expect(result[0].type).toBe(AscentTypes.RP);
    expect(result[0].tries).toBe(2);
  });

  it('parses second go in sub_type column without tries as 2 attempts', () => {
    const csv = createCsv([
      '"ROUTE","Second Go Subtype","Siurana","El Pati","Catalunya","ES","2024-01-01","redpoint","second_go","3","0","","0","7b","","great","25","0","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Second Go Subtype');
    expect(result[0].type).toBe(AscentTypes.RP);
    expect(result[0].tries).toBe(2);
  });

  it('parses 2nd go in sub_type as 2 attempts', () => {
    const csv = createCsv([
      '"ROUTE","2nd Go Route","Siurana","El Pati","Catalunya","ES","2024-01-01","redpoint","2nd go","3","0","","0","7b","","great","25","0","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].tries).toBe(2);
  });

  it('respects explicit tries when provided', () => {
    const csv = createCsv([
      '"ROUTE","Project Sent","Siurana","El Pati","Catalunya","ES","2024-01-01","redpoint","","5","0","8","0","8a","","hard work","30","1","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Project Sent');
    expect(result[0].type).toBe(AscentTypes.RP);
    expect(result[0].tries).toBe(8);
  });

  it('leaves tries as null for redpoint with no tries and no second go', () => {
    const csv = createCsv([
      '"ROUTE","RP Route","Siurana","El Pati","Catalunya","ES","2024-01-01","redpoint","","3","0","","0","6c","","","15","0","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('RP Route');
    expect(result[0].type).toBe(AscentTypes.RP);
    expect(result[0].tries).toBeNull();
  });

  it('correctly sets climbing_kind for BOULDER', () => {
    const csv = createCsv([
      '"BOULDER","Boulder Problem","Albarracin","Arrastradero","Aragon","ES","2024-01-01","flash","","4","0","","0","7A","","clean","4","1","0"',
    ]);

    const result = service.parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].climbing_kind).toBe(ClimbingKinds.BOULDER);
    expect(result[0].tries).toBe(1);
  });
});
