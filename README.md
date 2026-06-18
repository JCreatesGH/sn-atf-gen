# sn-atf-gen

[![CI](https://github.com/JCreatesGH/sn-atf-gen/actions/workflows/ci.yml/badge.svg)](https://github.com/JCreatesGH/sn-atf-gen/actions)
[![TypeScript](https://img.shields.io/badge/types-included-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Generate ServiceNow **Automated Test Framework** (ATF) tests from a short YAML scenario — no more hand-clicking the same Open Form → Set Fields → Submit → Validate steps for every table.

![screenshot](assets/screenshot.png)

## Use it

```ts
import { generate, generateSuite, buildSteps } from "sn-atf-gen";

const files = generate({
  name: "Create Incident - happy path",
  table: "incident",
  impersonate: "itil.user",
  set: { short_description: "printer down", priority: 1 },
  assertFields: { priority: 1, state: "New" },
});
// files["tests/create-incident-happy-path.atf.json"]  -> ATF test definition
// files["tests/create-incident-happy-path.md"]         -> human-readable plan
```

### Whole suites at once

Real test coverage is many scenarios, not one. `generateSuite` takes a list of specs and
emits collision-safe filenames plus a `tests/README.md` index tying them together:

```ts
const files = generateSuite([
  { name: "Create Incident", table: "incident", set: { short_description: "printer down" } },
  { name: "Resolve Incident", table: "incident", set: { state: "Resolved" } },
], "Incident Lifecycle");
// tests/create-incident.atf.json, tests/resolve-incident.atf.json, tests/README.md
```

## CLI

Installing the package adds an `sn-atf-gen` command — point it at a YAML scenario:

```yaml
# create-incident.yaml
name: Create Incident - happy path
table: incident
impersonate: itil.user
set:
  short_description: printer down
  priority: 1
assertFields:
  priority: 1
  state: New
```

```bash
$ sn-atf-gen create-incident.yaml                 # write tests/*.atf.json + *.md (use --out <dir>)
$ sn-atf-gen create-incident.yaml --print         # print every generated file to stdout
$ sn-atf-gen create-incident.yaml --json          # print only the ATF test JSON
```

A single YAML file can hold a whole suite — either a top-level list, or a named `tests:` block:

```yaml
# incident-suite.yaml
name: Incident Lifecycle
tests:
  - name: Create Incident
    table: incident
    set: {short_description: printer down, priority: 1}
  - name: Resolve Incident
    table: incident
    set: {state: Resolved}
```

```bash
$ sn-atf-gen incident-suite.yaml --out atf/   # one .atf.json + .md per test, plus tests/README.md
```

Per-test failures are reported with the offending test's index, so a bad scenario can't
slip through silently:

```bash
$ sn-atf-gen incident-suite.yaml
invalid scenario:
  - test 2: missing required field: table
```

Invalid scenarios fail loudly (exit `1`) with the missing fields listed, so you can wire it
straight into a pipeline:

```bash
$ sn-atf-gen broken.yaml
invalid scenario:
  - missing required field: name
  - missing required field: table
```

## What it generates

The canonical ATF step sequence, in order, only emitting the steps your scenario needs:

1. **Impersonate a User** (if `impersonate` set)
2. **Open a New Form** (`table`)
3. **Set Field Values** (from `set`)
4. **Submit a Form**
5. **Record Validation** — a record matching the entered values exists
6. **Field Values Validation** (from `assertFields`)

Output is a JSON test definition plus a Markdown test plan for review. `generate(spec)` and `generateSuite(specs)` are **pure functions**, so every branch is unit-tested, and a tiny built-in YAML parser — now with block-sequence support so suites can be authored naturally — keeps it dependency-free.

## Development

```bash
npm install && npm test    # 19 tests
npm run build              # tsc, clean
```

## License

MIT
