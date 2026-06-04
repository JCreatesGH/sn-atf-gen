import { AtfSpec, AtfStep, FileMap } from "./types";

const STEP_TYPES = {
  impersonate: "Impersonate a User",
  openNew: "Open a New Form",
  setFields: "Set Field Values",
  submit: "Submit a Form",
  recordValidation: "Record Validation",
  fieldValidation: "Field Values Validation",
} as const;

export function buildSteps(spec: AtfSpec): AtfStep[] {
  const steps: AtfStep[] = [];
  let order = 1;
  const push = (type: string, config: Record<string, unknown>) =>
    steps.push({ order: order++, type, config });

  if (spec.impersonate) push(STEP_TYPES.impersonate, { user: spec.impersonate });
  push(STEP_TYPES.openNew, { table: spec.table });

  if (spec.set && Object.keys(spec.set).length) {
    push(STEP_TYPES.setFields, { table: spec.table, fieldValues: spec.set });
  }
  push(STEP_TYPES.submit, { table: spec.table });

  const wantRecord = spec.assertRecordExists ?? !!spec.set;
  if (wantRecord) {
    push(STEP_TYPES.recordValidation, {
      table: spec.table,
      conditions: spec.set ?? {},
      expected: "record found",
    });
  }
  if (spec.assertFields && Object.keys(spec.assertFields).length) {
    push(STEP_TYPES.fieldValidation, { table: spec.table, fieldValues: spec.assertFields });
  }
  return steps;
}

export function generate(spec: AtfSpec): FileMap {
  const steps = buildSteps(spec);
  const test = {
    name: spec.name,
    description: spec.description ?? `Generated ATF test for ${spec.table}`,
    table: spec.table,
    steps: steps.map((s) => ({ order: s.order, type: s.type, ...s.config })),
  };

  const files: FileMap = {};
  files[`tests/${slug(spec.name)}.atf.json`] = JSON.stringify(test, null, 2) + "\n";

  // a Markdown test plan for human review / docs
  const md = [`# ${spec.name}`, "", `**Table:** \`${spec.table}\``, "", "## Steps", ""];
  for (const s of steps) md.push(`${s.order}. **${s.type}** — ${describe(s)}`);
  files[`tests/${slug(spec.name)}.md`] = md.join("\n") + "\n";

  return files;
}

function describe(step: AtfStep): string {
  const c = step.config as any;
  if (c.fieldValues) return Object.entries(c.fieldValues).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join(", ");
  if (c.user) return `as ${c.user}`;
  if (c.conditions) return `a ${c.table} record matching the entered values exists`;
  return c.table ?? "";
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "test";
