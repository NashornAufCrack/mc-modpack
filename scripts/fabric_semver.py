"""Fabric Loader SemanticVersion & VersionPredicateParser implementation."""

from __future__ import annotations

import re
from typing import NamedTuple


class FabricSemVer(NamedTuple):
    components: tuple[int, ...]
    pre: str | None  # None = release, "" = empty pre-release ("1.2-"), str = pre-release


_CORE_NUM_RE = re.compile(r"^(0|[1-9]\d*)$")
_PRE_RE = re.compile(r"^[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$")
_X_RANGE_RE = re.compile(r"^((?:(?:0|[1-9]\d*)\.)+)[xX*]$")
_WRAPPER_PREFIX_RE = re.compile(r"^(?:mc\d+(?:\.\d+)*[_-]|fabric-\d+(?:\.\d+)*[_-]|fabric-|v\.?)", re.IGNORECASE)
_WRAPPER_SUFFIX_RE = re.compile(r"-fabric$", re.IGNORECASE)
_OPS = (">=", "<=", ">", "<", "~", "^", "=")


def parse_sem_ver(raw: str) -> FabricSemVer | None:
    if not raw or not isinstance(raw, str) or re.search(r"\s", raw):
        return None

    rest = raw
    plus_idx = raw.find("+")
    if plus_idx != -1:
        if plus_idx == len(raw) - 1:
            return None
        rest = raw[:plus_idx]

    core = rest
    pre: str | None = None
    dash_idx = rest.find("-")
    if dash_idx != -1:
        core = rest[:dash_idx]
        pre = rest[dash_idx + 1 :]
        if pre != "" and not _PRE_RE.fullmatch(pre):
            return None

    if not core:
        return None

    components: list[int] = []
    for part in core.split("."):
        if not _CORE_NUM_RE.fullmatch(part):
            return None
        components.append(int(part))
    return FabricSemVer(tuple(components), pre)


def compare_sem_ver(a: FabricSemVer, b: FabricSemVer) -> int:
    max_len = max(len(a.components), len(b.components))
    for i in range(max_len):
        ca = a.components[i] if i < len(a.components) else 0
        cb = b.components[i] if i < len(b.components) else 0
        if ca != cb:
            return -1 if ca < cb else 1

    if a.pre is None and b.pre is None:
        return 0
    if a.pre is not None and b.pre is None:
        return -1
    if a.pre is None and b.pre is not None:
        return 1

    if a.pre == "" and b.pre == "":
        return 0
    if a.pre == "":
        return -1
    if b.pre == "":
        return 1

    pa = a.pre.split(".")  # type: ignore[union-attr]
    pb = b.pre.split(".")  # type: ignore[union-attr]
    for sa, sb in zip(pa, pb):
        if sa == sb:
            continue
        na = bool(_CORE_NUM_RE.fullmatch(sa))
        nb = bool(_CORE_NUM_RE.fullmatch(sb))
        if na and nb:
            va, vb = int(sa), int(sb)
            if va != vb:
                return -1 if va < vb else 1
        elif na != nb:
            return -1 if na else 1
        else:
            return -1 if sa < sb else 1

    if len(pa) == len(pb):
        return 0
    return -1 if len(pa) < len(pb) else 1


def _match_wildcard_term(ver: FabricSemVer | None, op: str, raw_target: str) -> bool | None:
    m = _X_RANGE_RE.fullmatch(raw_target)
    if not m:
        return None
    if ver is None:
        return False

    base = [int(p) for p in m.group(1)[:-1].split(".")]
    upper = list(base)
    upper[-1] += 1

    min_v = FabricSemVer(tuple(base), "")
    max_v = FabricSemVer(tuple(upper), "")

    if op in ("=", "^", "~"):
        return compare_sem_ver(ver, min_v) >= 0 and compare_sem_ver(ver, max_v) < 0
    if op == ">=":
        return compare_sem_ver(ver, min_v) >= 0
    if op == ">":
        return compare_sem_ver(ver, max_v) >= 0
    if op == "<":
        return compare_sem_ver(ver, min_v) < 0
    if op == "<=":
        return compare_sem_ver(ver, max_v) < 0
    return False


def _match_term(version: str, term: str) -> bool:
    if term in ("*", "x", "X"):
        return True

    op = "="
    raw_target = term
    for prefix in _OPS:
        if term.startswith(prefix):
            op = prefix
            raw_target = term[len(prefix) :]
            break
    if not raw_target:
        return False

    ver = parse_sem_ver(version)
    x_result = _match_wildcard_term(ver, op, raw_target)
    if x_result is not None:
        return x_result

    req = parse_sem_ver(raw_target)
    if ver is None or req is None:
        return version == raw_target if op == "=" else False

    cmp = compare_sem_ver(ver, req)
    if op == "=":
        return cmp == 0
    if op == ">=":
        return cmp >= 0
    if op == ">":
        return cmp > 0
    if op == "<=":
        return cmp <= 0
    if op == "<":
        return cmp < 0
    if op == "~":
        minor = req.components[1] if len(req.components) > 1 else 0
        upper = FabricSemVer((req.components[0], minor + 1), "")
        return cmp >= 0 and compare_sem_ver(ver, upper) < 0
    if op == "^":
        upper = FabricSemVer((req.components[0] + 1,), "")
        return cmp >= 0 and compare_sem_ver(ver, upper) < 0
    return False


def matches_predicate(version: str, predicate: str | list[str] | None) -> bool:
    if predicate is None:
        return False
    if isinstance(predicate, list):
        return any(matches_predicate(version, p) for p in predicate)
    trimmed = str(predicate).strip()
    if not trimmed:
        return False
    if trimmed in ("*", "x", "X"):
        return True
    normalized = re.sub(r"([<>~^=])\s+", r"\1", trimmed)
    return all(_match_term(version, term) for term in normalized.split())


def normalize_target_version(raw: str) -> str:
    """Strip common Modrinth wrapper prefixes/suffixes only when `raw` is not valid SemVer."""
    if not raw or parse_sem_ver(raw) is not None:
        return raw
    s = _WRAPPER_PREFIX_RE.sub("", raw.strip())
    s = _WRAPPER_SUFFIX_RE.sub("", s)
    return s or raw
