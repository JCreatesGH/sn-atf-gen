# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.2.0]

### Added
- **Suite generation.** `generateSuite(specs, name?)` turns a list of scenarios into one
  `.atf.json` + `.md` per test plus a `tests/README.md` index, with collision-safe
  filenames (`smoke`, `smoke-2`, …) when scenario names repeat.
- **Suites in YAML.** A single scenario file can now hold many tests — either a top-level
  list (`- name: …`) or a named block (`name: …` + `tests:`). The CLI detects this and
  fans out automatically.
- **Per-test validation errors** are prefixed with the offending test's index
  (`test 2: missing required field: table`) so a bad scenario in a suite can't slip through.
- Built-in YAML parser now supports **block sequences** (`- item`) and nested sequences
  under a key, in addition to mappings, inline maps, and scalars.

### Changed
- `generate(spec, slugName?)` accepts an optional slug override (used by the suite
  generator for de-duplicated filenames). The single-arg call is unchanged.
- Public API now also exports `generateSuite` and the `AtfSuite` type.

## [0.1.0]

- Initial release: `generate(spec)` emits the canonical ServiceNow ATF step sequence
  (Impersonate → Open Form → Set Fields → Submit → Record/Field Validation) as a JSON
  test definition plus a Markdown plan, with a YAML CLI and a dependency-free parser.
