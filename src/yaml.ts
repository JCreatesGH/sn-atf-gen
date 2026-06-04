// Minimal YAML subset parser (mappings, inline {a: b}, scalars, bools, ints).
export function parse(text: string): any {
  const lines = text.split("\n").filter((l) => l.trim() && !/^\s*#/.test(l));
  let i = 0;
  const indent = (l: string) => l.match(/^ */)![0].length;
  const scalar = (v: string): any => {
    v = v.trim();
    if (v === "true" || v === "false") return v === "true";
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (v.startsWith("{") && v.endsWith("}")) {
      const obj: any = {};
      const inner = v.slice(1, -1).trim();
      if (inner) for (const pair of splitTop(inner)) {
        const [k, ...rest] = pair.split(":");
        obj[k.trim()] = scalar(rest.join(":"));
      }
      return obj;
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
    return v;
  };
  function block(ind: number): any {
    const obj: any = {};
    while (i < lines.length && indent(lines[i]) === ind) {
      const m = lines[i].slice(ind).match(/^([\w.-]+):\s*(.*)$/);
      if (!m) break;
      i++;
      if (m[2] === "") {
        const childIndent = i < lines.length ? indent(lines[i]) : ind;
        obj[m[1]] = childIndent > ind ? block(childIndent) : null;
      } else obj[m[1]] = scalar(m[2]);
    }
    return obj;
  }
  return block(indent(lines[0] ?? ""));
}

function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0, buf = "";
  for (const ch of s) {
    if (ch === "{") depth++; if (ch === "}") depth--;
    if (ch === "," && depth === 0) { out.push(buf); buf = ""; } else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}
