import { describe, it, expect } from "vitest";
import { buildSteps, generate } from "./generate";
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

describe("yaml", () => {
  it("parses a scenario spec with inline maps", () => {
    const y = `name: t\ntable: incident\nset: {short_description: hi, priority: 2}\n`;
    const parsed = parse(y) as AtfSpec;
    expect(parsed.set!.priority).toBe(2);
    expect(parsed.set!.short_description).toBe("hi");
  });
});
