#!/usr/bin/env node
import { generateFromYaml } from "./generate.js";

const HELP = `sn-atf-gen — generate ServiceNow ATF tests from a YAML scenario

Usage:
  sn-atf-gen <scenario.yaml> [--out <dir>]   write the generated files (default: cwd)
  sn-atf-gen <scenario.yaml> --print         print the generated files to stdout
  sn-atf-gen <scenario.yaml> --json          print only the ATF test JSON

Exit code: 1 on an invalid spec.`;

// Execute only as the CLI binary (not when imported by tests).
if (process.argv[1] && /cli\.js$/.test(process.argv[1])) {
  const args = process.argv.slice(2);
  if (!args.length || args.includes("-h") || args.includes("--help")) {
    console.log(HELP);
    process.exit(args.length ? 0 : 1);
  }
  const file = args.find((a) => !a.startsWith("-"));
  if (!file) { console.error(HELP); process.exit(2); }

  Promise.all([import("node:fs"), import("node:path")]).then(([fs, path]) => {
    let yamlText: string;
    try {
      yamlText = fs.readFileSync(file, "utf8");
    } catch (e) {
      console.error(`error: cannot read ${file}: ${(e as Error).message}`);
      process.exit(2);
    }
    const { files, errors } = generateFromYaml(yamlText);
    if (errors.length) {
      console.error("invalid scenario:");
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }
    if (args.includes("--json")) {
      const atf = Object.entries(files).find(([n]) => n.endsWith(".atf.json"));
      console.log(atf ? atf[1].trimEnd() : "{}");
    } else if (args.includes("--print")) {
      for (const [name, content] of Object.entries(files)) {
        console.log(`# ===== ${name} =====`);
        console.log(content.trimEnd());
        console.log();
      }
    } else {
      const outIdx = args.indexOf("--out");
      const outDir = outIdx >= 0 ? args[outIdx + 1] : ".";
      for (const [name, content] of Object.entries(files)) {
        const dest = path.join(outDir, name);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, content);
        console.log(`wrote ${dest}`);
      }
    }
    process.exit(0);
  });
}
