# sn-atf-gen

[![CI](https://github.com/JCreatesGH/sn-atf-gen/actions/workflows/ci.yml/badge.svg)](https://github.com/JCreatesGH/sn-atf-gen/actions)
[![TypeScript](https://img.shields.io/badge/types-included-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Generate ServiceNow **Automated Test Framework** (ATF) tests from a short YAML scenario — no more hand-clicking the same Open Form → Set Fields → Submit → Validate steps for every table.

![screenshot](assets/screenshot.png)

## Use it

```ts
import { generate, buildSteps } from "sn-atf-gen";

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

Output is a JSON test definition plus a Markdown test plan for review. `generate(spec)` is a **pure function**, so every branch is unit-tested, and a tiny built-in YAML parser keeps it dependency-free.

## Development

```bash
npm install && npm test    # 12 tests
npm run build              # tsc, clean
```

## License

MIT
