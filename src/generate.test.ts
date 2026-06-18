import { describe, it, expect } from "vitest";
import { buildSteps, generate, generateSuite, validateSpec, generateFromYaml } from "./generate";
import { parse } from "./yaml";
import type { AtfSpec } from "./types";

const spec: AtfSpec = {
  name: "Create Incident - happy path",
  table: "incident",
  impersonate: "itil.user",
  set: { short_description: "printer down", priority: 1 },
  assertFields: { priority: 1, state: "New" },
};

describe("buildSteps", () => {
  const steps = buildSteps(spec);
  const types = steps.map((s) => s.type);

  it("produces the canonical ATF step sequence", () => {
    expect(types).toEqual([
      "Impersonate a User", "Open a New Form", "Set Field Values",
      "Submit a Form", "Record Validation", "Field Values Validation",
    ]);
  });

  it("orders steps from 1", () => {
    expect(steps.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("carries field values into Set and Validation steps", () => {
    const set = steps.find((s) => s.type === "Set Field Values")!;
    expect((set.config as any).fieldValues.short_description).toBe("printer down");
    const val = steps.find((s) => s.type === "Field Values Validation")!;
    expect((val.config as any).fieldValues.state).toBe("New");
  });

  it("omits impersonate + set steps when not provided", () => {
    const minimal = buildSteps({ name: "x", table: "task", assertRecordExists: false });
    expect(minimal.map((s) => s.type)).toEqual(["Open a New Form", "Submit a Form"]);
  });
});

describe("generate", () => {
  it("emits an ATF JSON test and a Markdown plan", () => {
    const files = generate(spec);
    const json = JSON.parse(files["tests/create-incident-happy-path.atf.json"]);
    expect(json.table).toBe("incident");
    expect(json.steps).toHaveLength(6);
    const md = files["tests/create-incident-happy-path.md"];
    expect(md).toContain("# Create Incident - happy path");
    expect(md).toContain("Set Field Values");
  });
});

describe("generateSuite", () => {
  const specs: AtfSpec[] = [
    { name: "Create Incident", table: "incident", set: { short_description: "a" } },
    { name: "Close Incident", table: "incident", assertFields: { state: "Closed" } },
  ];

  it("emits per-test files plus a README index", () => {
    const files = generateSuite(specs, "Incident Lifecycle");
    expect(Object.keys(files)).toContain("tests/create-incident.atf.json");
    expect(Object.keys(files)).toContain("tests/close-incident.atf.json");
    const readme = files["tests/README.md"];
    expect(readme).toContain("# Incident Lifecycle");
    expect(readme).toContain("2 tests.");
    expect(readme).toContain("**Create Incident**");
  });

  it("de-dups colliding scenario names", () => {
    const dupes: AtfSpec[] = [
      { name: "Smoke", table: "incident" },
      { name: "Smoke", table: "problem" },
    ];
    const files = generateSuite(dupes);
    expect(Object.keys(files)).toContain("tests/smoke.atf.json");
    expect(Object.keys(files)).toContain("tests/smoke-2.atf.json");
  });
});

describe("yaml", () => {
  it("parses a scenario spec with inline maps", () => {
    const y = `name: t\ntable: incident\nset: {short_description: hi, priority: 2}\n`;
    const parsed = parse(y) as AtfSpec;
    expect(parsed.set!.priority).toBe(2);
    expect(parsed.set!.short_description).toBe("hi");
  });

  it("parses a top-level block sequence of mappings", () => {
    const y = `- name: One\n  table: incident\n- name: Two\n  table: problem\n`;
    const parsed = parse(y) as AtfSpec[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("One");
    expect(parsed[1].table).toBe("problem");
  });

  it("parses a nested block sequence under a `tests:` key", () => {
    const y = `name: Suite\ntests:\n  - name: One\n    table: incident\n    set: {priority: 1}\n  - name: Two\n    table: problem\n`;
    const parsed = parse(y) as { name: string; tests: AtfSpec[] };
    expect(parsed.name).toBe("Suite");
    expect(parsed.tests).toHaveLength(2);
    expect(parsed.tests[0].set!.priority).toBe(1);
    expect(parsed.tests[1].name).toBe("Two");
  });
});

describe("validateSpec", () => {
  it("accepts a spec with name and table", () => {
    expect(validateSpec({ name: "t", table: "incident" })).toEqual([]);
  });

  it("flags a missing name", () => {
    expect(validateSpec({ table: "incident" })).toContain("missing required field: name");
  });

  it("flags a missing table", () => {
    expect(validateSpec({ name: "t" })).toContain("missing required field: table");
  });

  it("reports a non-mapping (e.g. empty or scalar YAML)", () => {
    expect(validateSpec(null)).toEqual(["spec is not a YAML mapping"]);
    expect(validateSpec("nope" as unknown as AtfSpec)).toEqual(["spec is not a YAML mapping"]);
  });
});

describe("generateFromYaml", () => {
  it("generates files from a valid YAML scenario", () => {
    const y = `name: Create Incident\ntable: incident\nset: {short_description: hi}\n`;
    const { files, errors } = generateFromYaml(y);
    expect(errors).toEqual([]);
    expect(Object.keys(files)).toContain("tests/create-incident.atf.json");
    const json = JSON.parse(files["tests/create-incident.atf.json"]);
    expect(json.table).toBe("incident");
  });

  it("returns errors and no files for an invalid scenario", () => {
    const { files, errors } = generateFromYaml(`description: just a note\n`);
    expect(errors).toContain("missing required field: name");
    expect(errors).toContain("missing required field: table");
    expect(files).toEqual({});
  });

  it("generates a suite from a top-level YAML list", () => {
    const y = `- name: Open\n  table: incident\n- name: Close\n  table: incident\n`;
    const { files, errors } = generateFromYaml(y);
    expect(errors).toEqual([]);
    expect(Object.keys(files)).toContain("tests/open.atf.json");
    expect(Object.keys(files)).toContain("tests/close.atf.json");
    expect(Object.keys(files)).toContain("tests/README.md");
  });

  it("generates a suite from a named `tests:` block", () => {
    const y = `name: My Suite\ntests:\n  - name: Open\n    table: incident\n  - name: Close\n    table: incident\n`;
    const { files, errors } = generateFromYaml(y);
    expect(errors).toEqual([]);
    expect(files["tests/README.md"]).toContain("# My Suite");
  });

  it("reports per-test validation errors with a test index prefix", () => {
    const y = `- name: Open\n  table: incident\n- description: oops\n`;
    const { files, errors } = generateFromYaml(y);
    expect(errors).toContain("test 2: missing required field: name");
    expect(errors).toContain("test 2: missing required field: table");
    expect(files).toEqual({});
  });
});
