import { AtfSpec, AtfStep, AtfSuite, FileMap } from "./types";
import { parse } from "./yaml.js";

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

export function generate(spec: AtfSpec, slugName: string = slug(spec.name)): FileMap {
  const steps = buildSteps(spec);
  const test = {
    name: spec.name,
    description: spec.description ?? `Generated ATF test for ${spec.table}`,
    table: spec.table,
    steps: steps.map((s) => ({ order: s.order, type: s.type, ...s.config })),
  };

  const files: FileMap = {};
  files[`tests/${slugName}.atf.json`] = JSON.stringify(test, null, 2) + "\n";

  // a Markdown test plan for human review / docs
  const md = [`# ${spec.name}`, "", `**Table:** \`${spec.table}\``, "", "## Steps", ""];
  for (const s of steps) md.push(`${s.order}. **${s.type}** — ${describe(s)}`);
  files[`tests/${slugName}.md`] = md.join("\n") + "\n";

  return files;
}

/** Generate a whole suite of scenarios at once, with collision-safe filenames
 * and a `tests/README.md` index. */
export function generateSuite(specs: AtfSpec[], suiteName = "ATF Suite"): FileMap {
  const files: FileMap = {};
  const used = new Map<string, number>();
  const index: string[] = [`# ${suiteName}`, "", `${specs.length} test${specs.length === 1 ? "" : "s"}.`, "", "## Tests", ""];
  for (const spec of specs) {
    const base = slug(spec.name);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const name = n > 1 ? `${base}-${n}` : base;          // de-dup repeated names
    Object.assign(files, generate(spec, name));
    index.push(`- **${spec.name}** (\`${spec.table}\`) — ${buildSteps(spec).length} steps → \`tests/${name}.atf.json\``);
  }
  files["tests/README.md"] = index.join("\n") + "\n";
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

/** Hard-error checks on a spec (used before generating). */
export function validateSpec(spec: Partial<AtfSpec> | null | undefined): string[] {
  if (!spec || typeof spec !== "object") return ["spec is not a YAML mapping"];
  const errors: string[] = [];
  if (!spec.name) errors.push("missing required field: name");
  if (!spec.table) errors.push("missing required field: table");
  return errors;
}

/** Parse a YAML scenario (a single spec, a list of specs, or `{name?, tests:[...]}`),
 * validate it, and generate the files (or return errors). */
export function generateFromYaml(yamlText: string): { files: FileMap; errors: string[] } {
  const parsed = parse(yamlText) as AtfSpec | AtfSpec[] | AtfSuite;
  const list: AtfSpec[] | null = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as AtfSuite).tests)
      ? (parsed as AtfSuite).tests
      : null;

  if (list) {
    const errors: string[] = [];
    list.forEach((s, i) => validateSpec(s).forEach((e) => errors.push(`test ${i + 1}: ${e}`)));
    if (errors.length) return { files: {}, errors };
    const suiteName = !Array.isArray(parsed) && (parsed as AtfSuite).name ? (parsed as AtfSuite).name! : "ATF Suite";
    return { files: generateSuite(list, suiteName), errors: [] };
  }

  const spec = parsed as AtfSpec;
  const errors = validateSpec(spec);
  return errors.length ? { files: {}, errors } : { files: generate(spec), errors: [] };
}
