// Minimal YAML subset parser: mappings, block & inline sequences, inline {a: b}
// maps, scalars, bools, ints.
export function parse(text: string): any {
  const lines = text.split("\n").filter((l) => l.trim() && !/^\s*#/.test(l));
  let i = 0;
  const indent = (l: string) => l.match(/^ */)![0].length;
  const isSeqItem = (l: string, ind: number) =>
    l.slice(ind, ind + 2) === "- " || l.slice(ind).trimEnd() === "-";

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

  // A node is a block sequence (lines starting with "- ") or a mapping.
  function parseNode(ind: number): any {
    if (i < lines.length && indent(lines[i]) === ind && isSeqItem(lines[i], ind)) {
      const arr: any[] = [];
      while (i < lines.length && indent(lines[i]) === ind && isSeqItem(lines[i], ind)) {
        const rest = lines[i].slice(ind + 2);
        if (/^[\w.-]+:\s*/.test(rest)) {
          // a mapping item: rewrite "- " to spaces and parse the mapping at ind+2
          lines[i] = " ".repeat(ind + 2) + rest;
          arr.push(parseMapping(ind + 2));
        } else {
          arr.push(scalar(rest));
          i++;
        }
      }
      return arr;
    }
    return parseMapping(ind);
  }

  function parseMapping(ind: number): any {
    const obj: any = {};
    while (i < lines.length && indent(lines[i]) === ind && !isSeqItem(lines[i], ind)) {
      const m = lines[i].slice(ind).match(/^([\w.-]+):\s*(.*)$/);
      if (!m) break;
      i++;
      if (m[2] === "") {
        if (i < lines.length) {
          const ci = indent(lines[i]);
          if (ci > ind) obj[m[1]] = parseNode(ci);                                  // nested block
          else if (ci === ind && isSeqItem(lines[i], ind)) obj[m[1]] = parseNode(ind); // seq at same indent
          else obj[m[1]] = null;
        } else obj[m[1]] = null;
      } else obj[m[1]] = scalar(m[2]);
    }
    return obj;
  }

  return parseNode(indent(lines[0] ?? ""));
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
