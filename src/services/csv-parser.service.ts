import { Injectable } from '@angular/core';

import {
  AscentType,
  AscentTypes,
  ClimbingKinds,
  EightAnuAscent,
  GradeLabel,
  LABEL_TO_VERTICAL_LIFE,
} from '../models';

export class EmptyCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyCsvError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class CsvParserService {
  parseCSV(text: string): EightAnuAscent[] {
    // Split lines respecting quoted fields that may contain newlines
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentLine += '""';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          currentLine += char;
        }
      } else if (char === '\n' && !inQuotes) {
        // Line break outside quotes = new line
        if (currentLine.trim().length > 0) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else if (char !== '\r') {
        currentLine += char;
      }
    }

    // Push the last line if not empty
    if (currentLine.trim().length > 0) {
      lines.push(currentLine);
    }

    if (lines.length < 2) {
      console.warn('[8a Import] CSV has less than 2 lines');
      return [];
    }

    // Header looks like: "route_boulder","name","location_name","sector_name","area_name","country_code","date","type","sub_type","rating","project","tries","repeats","difficulty","perceived_hardness","comment","height","recommended","sits"
    const headerLine = lines[0].replace(/"/g, '').trim();
    const headers = headerLine.split(',');

    return lines
      .slice(1)
      .filter((line) => line.trim().length > 0)
      .map((line, lineIndex) => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current);

        const cleanValues = values.map((v) => v.trim());

        if (cleanValues.length < headers.length) {
          console.warn(
            `[8a Import] Line ${lineIndex + 2} has ${cleanValues.length} fields but expected ${headers.length}. Skipping.`,
            line.substring(0, 100),
          );
          return null;
        }

        const getVal = (name: string, warnIfMissing = true) => {
          const idx = headers.indexOf(name);
          if (idx === -1) {
            if (warnIfMissing) {
              console.warn(`[8a Import] Header "${name}" not found in CSV`);
            }
            return '';
          }
          const value = cleanValues[idx];
          return value === 'null' || value === '' ? '' : value;
        };

        const ratingValue = parseInt(getVal('rating'), 10) || 0;
        const routeBoulder = getVal('route_boulder');
        const name = getVal('name');
        const difficultyRaw = getVal('difficulty');
        const difficulty = difficultyRaw.toLowerCase() as GradeLabel;

        if (!routeBoulder || !name || !difficulty) {
          console.warn(
            `[8a Import] Line ${lineIndex + 2} missing essential fields:`,
            { routeBoulder, name, difficulty },
          );
          return null;
        }

        const gradeValue = LABEL_TO_VERTICAL_LIFE[difficulty];
        if (gradeValue === undefined) {
          console.warn(
            `[8a Import] Line ${lineIndex + 2}: Unknown difficulty grade "${difficulty}" (original: "${difficultyRaw}") for route "${name}". Skipping.`,
          );
          return null;
        }

        const locationName = getVal('location_name');
        let sectorName = getVal('sector_name')?.trim();

        if (!sectorName) {
          sectorName = 'General';
        } else if (sectorName === 'Unknown Sector') {
          sectorName = `Unknown Sector ${locationName}`;
        }

        const rawType = getVal('type');
        const rawSubType = getVal('sub_type', false);
        const triesStr = getVal('tries', false) || getVal('attempts', false);

        return {
          route_boulder: routeBoulder as 'ROUTE' | 'BOULDER',
          name: name,
          location_name: locationName,
          sector_name: sectorName,
          country_code: getVal('country_code'),
          date: getVal('date'),
          type: this.mapType(rawType, rawSubType),
          rating: Math.max(0, Math.min(5, ratingValue)),
          tries: this.parseTries(triesStr, rawType, rawSubType),
          difficulty: difficulty,
          comment: getVal('comment'),
          recommended: getVal('recommended') === '1',
          climbing_kind:
            routeBoulder === 'BOULDER'
              ? ClimbingKinds.BOULDER
              : ClimbingKinds.SPORT,
        } as EightAnuAscent;
      })
      .filter((a): a is EightAnuAscent => !!a && !!a.name);
  }

  private parseTries(
    triesStr: string,
    type: string,
    subType: string,
  ): number | null {
    const parsed = parseInt(triesStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }

    const t = type.toLowerCase().trim();
    const st = subType.toLowerCase().trim();

    if (
      t.includes('os') ||
      t.includes('onsight') ||
      st.includes('os') ||
      st.includes('onsight') ||
      t.includes('flash') ||
      t === 'f' ||
      st.includes('flash') ||
      st === 'f'
    ) {
      return 1;
    }

    if (
      t.includes('second') ||
      t.includes('2nd') ||
      st.includes('second') ||
      st.includes('2nd')
    ) {
      return 2;
    }

    return null;
  }

  private mapType(type: string, subType = ''): AscentType {
    const t = type.toLowerCase().trim();
    const st = subType.toLowerCase().trim();

    if (
      t.includes('os') ||
      t.includes('onsight') ||
      st.includes('os') ||
      st.includes('onsight')
    ) {
      return AscentTypes.OS;
    }

    if (
      t.includes('flash') ||
      t === 'f' ||
      st.includes('flash') ||
      st === 'f'
    ) {
      return AscentTypes.F;
    }

    return AscentTypes.RP;
  }
}
