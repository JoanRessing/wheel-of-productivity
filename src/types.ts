export type Location = 'any' | 'indoor' | 'outdoor';

export interface Task {
  id: string; // uuid-like
  name: string;
  time?: number; // minutes
  location: Location;
  deadline?: string; // ISO date (yyyy-mm-dd)
  prerequisiteIds?: string[];
  // reserved for future weights
  weight?: number;
}

export interface TaskFilters {
  maxTime?: number;
  includeIndoor: boolean;
  includeOutdoor: boolean;
}

export interface AppState {
  tasks: Task[];
}

export interface WheelState {
  angle: number; // radians current angle
  spinning: boolean;
}

export interface CookieBundleMeta {
  version: number; // schema version
  parts: number; // number of chunks
}

export interface CookieDataV1 {
  v: 1;
  t: Array<{
    i: string; // id
    n: string; // name
    tm?: number; // time
    l: Location; // location
    d?: string; // deadline
    p?: string[]; // prerequisites
    w?: number; // weight
  }>;
}
