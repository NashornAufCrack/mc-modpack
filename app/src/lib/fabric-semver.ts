/**
 * Fabric Loader SemanticVersion & VersionPredicateParser specification.
 *
 * Implements Fabric's SemVer superset:
 * - Arbitrary numeric component count (missing trailing components default to 0)
 * - Empty pre-release ("1.2-") sorts earlier than any non-empty pre-release ("1.2-alpha")
 * - Pre-releases sort earlier than the corresponding release; "+build" metadata is ignored
 * - Non-SemVer strings compare only by exact equality (except "*" which matches anything)
 * - Arrays represent OR; space-separated predicates in a string represent AND
 * - Operators: exact (<ver> or =), >=, >, <=, <, ~, ^ (no npm ^0.x special case), and X-ranges (1.x, 1.X, 1.*)
 */

export interface FabricSemVer {
  components: number[];
  /** null = release, "" = empty pre-release ("1.2-"), non-empty = pre-release identifiers */
  pre: string | null;
}

const CORE_NUM_RE = /^(0|[1-9]\d*)$/;
const PRE_RE = /^[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$/;
const X_RANGE_RE = /^((?:(?:0|[1-9]\d*)\.)+)[xX*]$/;
const OPS = [">=", "<=", ">", "<", "~", "^", "="] as const;

/** Parse a Fabric SemanticVersion string; returns null for non-SemVer strings. */
export function parseSemVer(raw: string): FabricSemVer | null {
  if (!raw || /\s/.test(raw)) return null;

  let rest = raw;
  const plusIdx = raw.indexOf("+");
  if (plusIdx !== -1) {
    if (plusIdx === raw.length - 1) return null;
    rest = raw.slice(0, plusIdx);
  }

  let core = rest;
  let pre: string | null = null;
  const dashIdx = rest.indexOf("-");
  if (dashIdx !== -1) {
    core = rest.slice(0, dashIdx);
    pre = rest.slice(dashIdx + 1);
    if (pre !== "" && !PRE_RE.test(pre)) return null;
  }

  if (!core) return null;
  const parts = core.split(".");
  const components: number[] = [];
  for (const part of parts) {
    if (!CORE_NUM_RE.test(part)) return null;
    const n = Number(part);
    if (!Number.isSafeInteger(n)) return null;
    components.push(n);
  }
  return { components, pre };
}

/** Compare two parsed Fabric SemanticVersions (-1, 0, or 1). */
export function compareSemVer(a: FabricSemVer, b: FabricSemVer): number {
  const maxLen = Math.max(a.components.length, b.components.length);
  for (let i = 0; i < maxLen; i++) {
    const ca = a.components[i] ?? 0;
    const cb = b.components[i] ?? 0;
    if (ca !== cb) return ca < cb ? -1 : 1;
  }

  if (a.pre === null && b.pre === null) return 0;
  if (a.pre !== null && b.pre === null) return -1;
  if (a.pre === null && b.pre !== null) return 1;

  if (a.pre === "" && b.pre === "") return 0;
  if (a.pre === "") return -1;
  if (b.pre === "") return 1;

  const pa = a.pre!.split(".");
  const pb = b.pre!.split(".");
  const minPre = Math.min(pa.length, pb.length);
  for (let i = 0; i < minPre; i++) {
    const sa = pa[i];
    const sb = pb[i];
    if (sa === sb) continue;
    const na = CORE_NUM_RE.test(sa);
    const nb = CORE_NUM_RE.test(sb);
    if (na && nb) {
      const va = Number(sa);
      const vb = Number(sb);
      if (va !== vb) return va < vb ? -1 : 1;
    } else if (na !== nb) {
      return na ? -1 : 1;
    } else {
      return sa < sb ? -1 : 1;
    }
  }
  return pa.length === pb.length ? 0 : pa.length < pb.length ? -1 : 1;
}

function matchWildcardTerm(ver: FabricSemVer | null, op: string, rawTarget: string): boolean | null {
  const m = X_RANGE_RE.exec(rawTarget);
  if (!m) return null;
  if (!ver) return false;

  const base = m[1].slice(0, -1).split(".").map(Number);
  const upper = base.slice();
  upper[upper.length - 1] += 1;

  const minV: FabricSemVer = { components: base, pre: "" };
  const maxV: FabricSemVer = { components: upper, pre: "" };

  switch (op) {
    case "=":
    case "^":
    case "~":
      return compareSemVer(ver, minV) >= 0 && compareSemVer(ver, maxV) < 0;
    case ">=":
      return compareSemVer(ver, minV) >= 0;
    case ">":
      return compareSemVer(ver, maxV) >= 0;
    case "<":
      return compareSemVer(ver, minV) < 0;
    case "<=":
      return compareSemVer(ver, maxV) < 0;
    default:
      return false;
  }
}

function matchTerm(version: string, term: string): boolean {
  if (term === "*" || term === "x" || term === "X") return true;

  let op = "=";
  let rawTarget = term;
  for (const prefix of OPS) {
    if (term.startsWith(prefix)) {
      op = prefix;
      rawTarget = term.slice(prefix.length);
      break;
    }
  }
  if (!rawTarget) return false;

  const ver = parseSemVer(version);
  const xResult = matchWildcardTerm(ver, op, rawTarget);
  if (xResult !== null) return xResult;

  const req = parseSemVer(rawTarget);
  if (!ver || !req) {
    return op === "=" ? version === rawTarget : false;
  }

  const cmp = compareSemVer(ver, req);
  switch (op) {
    case "=":
      return cmp === 0;
    case ">=":
      return cmp >= 0;
    case ">":
      return cmp > 0;
    case "<=":
      return cmp <= 0;
    case "<":
      return cmp < 0;
    case "~": {
      const upper: FabricSemVer = {
        components: [req.components[0], (req.components[1] ?? 0) + 1],
        pre: "",
      };
      return cmp >= 0 && compareSemVer(ver, upper) < 0;
    }
    case "^": {
      const upper: FabricSemVer = {
        components: [req.components[0] + 1],
        pre: "",
      };
      return cmp >= 0 && compareSemVer(ver, upper) < 0;
    }
    default:
      return false;
  }
}

/** Check whether `version` satisfies a Fabric version predicate (string or OR-array of strings). */
export function matchesPredicate(version: string, predicate: string | string[]): boolean {
  if (predicate == null) return false;
  if (Array.isArray(predicate)) {
    return predicate.some((p) => matchesPredicate(version, p));
  }
  const trimmed = String(predicate).trim();
  if (!trimmed) return false;
  if (trimmed === "*" || trimmed === "x" || trimmed === "X") return true;
  const normalized = trimmed.replace(/([<>~^=])\s+/g, "$1");
  return normalized.split(/\s+/).every((term) => matchTerm(version, term));
}
