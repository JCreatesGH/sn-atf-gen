// Spec that describes an ATF scenario at a high level.
export interface AtfSpec {
  name: string;
  table: string;
  description?: string;
  set?: Record<string, string | number | boolean>;     // field values to enter
  assertFields?: Record<string, string | number | boolean>; // field values to validate
  assertRecordExists?: boolean;                         // default true when `set` present
  impersonate?: string;                                 // run as a given user
}

// A normalized ATF step (maps to the sys_atf_step config we emit).
export interface AtfStep {
  order: number;
  type: string;          // ATF step type name
  config: Record<string, unknown>;
}

export type FileMap = Record<string, string>;
