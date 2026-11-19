import hashlib
import importlib.util
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import tomllib
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from scripts.fabric_semver import compare_sem_ver, matches_predicate, normalize_target_version, parse_sem_ver
from scripts.inspect_jar_deps import inspect_jar_bytes, run_inspection
from scripts.mixin_scan import INDEX_VERSION, check_core_jar_compatibility, core_pack, guard_updates


def load_json(rel_path):
    with open(os.path.join(ROOT, rel_path), encoding="utf-8") as fp:
        return json.load(fp)


def load_build_packwiz():
    path = os.path.join(ROOT, "scripts", "build_packwiz.py")
    spec = importlib.util.spec_from_file_location("build_packwiz", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestProjectConfig(unittest.TestCase):
    def test_project_json_schema_and_values(self):
        cfg = load_json("config/project.json")
        self.assertIsInstance(cfg, dict)
        required = {
            "minecraftVersion",
            "loader",
            "loaderVersion",
            "packFormat",
            "rpFormat",
        }
        self.assertTrue(required.issubset(cfg.keys()))
        for key in required:
            self.assertIsInstance(cfg[key], str, f"{key} must be a string")
            self.assertTrue(cfg[key].strip(), f"{key} must be non-empty")

        self.assertEqual(cfg["loader"], "fabric-loader")
        self.assertTrue(cfg["packFormat"].startswith("packwiz:"))
        self.assertRegex(cfg["minecraftVersion"], r"^\d+\.\d+(?:\.\d+)?$")
        self.assertRegex(cfg["loaderVersion"], r"^\d+\.\d+\.\d+$")
        self.assertRegex(cfg["rpFormat"], r"^\d+(?:\.\d+)?$")


class TestBuildPackwiz(unittest.TestCase):
    def test_build_visual_and_plus_outputs(self):
        bp = load_build_packwiz()
        cfg = load_json("config/project.json")
        self.assertEqual(bp.PROJECT["minecraftVersion"], cfg["minecraftVersion"])
        self.assertEqual(bp.PROJECT["loaderVersion"], cfg["loaderVersion"])
        self.assertEqual(bp.PROJECT["packFormat"], cfg["packFormat"])

        orig_root = bp.R
        with tempfile.TemporaryDirectory() as tmpdir:
            bp.R = tmpdir
            try:
                n_visual = bp.build("visual", False)
                n_plus = bp.build("plus", True)
            finally:
                bp.R = orig_root

            self.assertGreater(n_visual, 0)
            self.assertGreater(n_plus, n_visual)

            for pack_name, expected_title in [("visual", "Vanilla Visual"), ("plus", "Vanilla Plus")]:
                pack_dir = os.path.join(tmpdir, "packs", pack_name)
                pack_toml_path = os.path.join(pack_dir, "pack.toml")
                index_toml_path = os.path.join(pack_dir, "index.toml")
                self.assertTrue(os.path.isfile(pack_toml_path))
                self.assertTrue(os.path.isfile(index_toml_path))

                with open(pack_toml_path, "rb") as fp:
                    pack_raw = fp.read()
                with open(index_toml_path, "rb") as fp:
                    index_raw = fp.read()

                self.assertNotIn(b"\r\n", pack_raw, "pack.toml must use LF line endings")
                self.assertNotIn(b"\r\n", index_raw, "index.toml must use LF line endings")

                pack_meta = tomllib.loads(pack_raw.decode("utf-8"))
                self.assertEqual(pack_meta["name"], expected_title)
                self.assertEqual(pack_meta["pack-format"], cfg["packFormat"])
                self.assertEqual(pack_meta["versions"]["minecraft"], cfg["minecraftVersion"])
                self.assertEqual(pack_meta["versions"]["fabric"], cfg["loaderVersion"])
                self.assertEqual(
                    pack_meta["index"]["hash"],
                    hashlib.sha256(index_raw).hexdigest(),
                    f"{pack_name} pack.toml index hash mismatch",
                )

                index_meta = tomllib.loads(index_raw.decode("utf-8"))
                self.assertEqual(index_meta["hash-format"], "sha256")
                self.assertGreater(len(index_meta["files"]), 0)
                for entry in index_meta["files"]:
                    rel = entry["file"]
                    fpath = os.path.join(pack_dir, rel)
                    self.assertTrue(os.path.isfile(fpath), f"missing indexed file: {rel}")
                    with open(fpath, "rb") as fp:
                        actual_sha = hashlib.sha256(fp.read()).hexdigest()
                    self.assertEqual(entry["hash"], actual_sha, f"hash mismatch for {rel}")

                    if rel.endswith(".pw.toml") and (
                        rel.startswith("resourcepacks/") or rel.startswith("shaderpacks/")
                    ):
                        with open(fpath, "rb") as fp:
                            pw = tomllib.loads(fp.read().decode("utf-8"))
                        self.assertEqual(pw["side"], "client", f"{rel} must have client side")


class TestDataAndInvariants(unittest.TestCase):
    def test_locked_mods_and_catalog_invariants(self):
        data = load_json("data/app-data.json")
        for key in ("mods", "files", "dec", "x", "jar_rules"):
            self.assertIn(key, data)

        mods = data["mods"]
        files = data["files"]
        locked = [
            m["slug"]
            for m in mods
            if (m.get("cat") == "P" and m.get("rolle") == "K") or m.get("pflicht")
        ]
        self.assertGreater(len(locked), 0)
        for slug in locked:
            self.assertIn(slug, files, f"locked mod {slug} missing from files")
            entry = files[slug]
            self.assertGreaterEqual(len(entry), 9)
            self.assertTrue(str(entry[0]).startswith("https://"))
            self.assertRegex(str(entry[2]), r"^[0-9a-f]{40}$")
            self.assertRegex(str(entry[3]), r"^[0-9a-f]{128}$")
            self.assertGreater(int(entry[4]), 0)

    def test_datacheck_ci_passes(self):
        proc = subprocess.run(
            [sys.executable, os.path.join(ROOT, "qa", "datacheck.py"), "--ci"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        self.assertIn("# FEHLER: 0", proc.stdout)

    def test_version_predicate_fixtures_schema(self):
        fixtures = load_json("qa/fixtures/version_predicates.json")
        cases = fixtures.get("predicateCases", [])
        self.assertGreaterEqual(len(cases), 25)
        for case in cases:
            self.assertIsInstance(case["name"], str)
            self.assertIsInstance(case["version"], str)
            self.assertIn("predicate", case)
            self.assertIsInstance(case["expected"], bool)


class TestFabricSemverPython(unittest.TestCase):
    def test_predicate_fixtures(self):
        fixtures = load_json("qa/fixtures/version_predicates.json")
        for case in fixtures["predicateCases"]:
            with self.subTest(name=case["name"]):
                self.assertEqual(
                    matches_predicate(case["version"], case["predicate"]),
                    case["expected"],
                    f"version={case['version']!r} predicate={case['predicate']!r}",
                )

    def test_compare_fixtures(self):
        fixtures = load_json("qa/fixtures/version_predicates.json")
        for case in fixtures["compareCases"]:
            with self.subTest(name=case["name"]):
                a = parse_sem_ver(case["a"])
                b = parse_sem_ver(case["b"])
                self.assertIsNotNone(a, f"failed to parse {case['a']!r}")
                self.assertIsNotNone(b, f"failed to parse {case['b']!r}")
                self.assertEqual(compare_sem_ver(a, b), case["expected"])

    def test_normalize_target_version_and_guards(self):
        self.assertEqual(normalize_target_version("mc26.3-0.9.2-fabric"), "0.9.2")
        self.assertEqual(normalize_target_version("fabric-26.3-0.33.0"), "0.33.0")
        self.assertEqual(normalize_target_version("v2.2.3"), "2.2.3")
        self.assertEqual(normalize_target_version("0.166.0+26.3"), "0.166.0+26.3")
        self.assertIsNone(parse_sem_ver(""))
        self.assertIsNone(parse_sem_ver("1.2.3+"))
        self.assertIsNone(parse_sem_ver("01.2.3"))
        self.assertFalse(matches_predicate("26.3", ""))
        self.assertFalse(matches_predicate("26.3", []))
        self.assertTrue(matches_predicate("", "x"))
        self.assertTrue(matches_predicate("", "X"))


class TestCoreModpackGuardAndJijInspection(unittest.TestCase):
    @staticmethod
    def _build_jar(fmj: dict, nested_jars: dict | None = None) -> bytes:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("fabric.mod.json", json.dumps(fmj))
            for path, n_bytes in (nested_jars or {}).items():
                zf.writestr(path, n_bytes)
        return buf.getvalue()

    def test_nested_jij_jar_inspection_flags_incompatible_subjar(self):
        nested_bytes = self._build_jar(
            {
                "schemaVersion": 1,
                "id": "wanderingtraveler_sub",
                "version": "1.6.0",
                "depends": {"minecraft": ">=1.20 <1.20.2"},
            }
        )
        outer_bytes = self._build_jar(
            {
                "schemaVersion": 1,
                "id": "wandering_traveler",
                "version": "1.6.0+fabric",
                "depends": {"fabricloader": ">=0.15.0"},
                "jars": [{"file": "META-INF/monolith/jars/wanderingtraveler-fabric-1.20.1-1.6.0.jar"}],
            },
            {"META-INF/monolith/jars/wanderingtraveler-fabric-1.20.1-1.6.0.jar": nested_bytes},
        )
        sha1 = hashlib.sha1(outer_bytes).hexdigest()
        res = inspect_jar_bytes(outer_bytes, sha1, "1.6.0+fabric", mc_version="26.3")
        self.assertEqual(res["mod_id"], "wandering_traveler")
        self.assertEqual(res["depends"].get("minecraft"), ">=1.20 <1.20.2")
        self.assertEqual(res.get("broken_jij"), "META-INF/monolith/jars/wanderingtraveler-fabric-1.20.1-1.6.0.jar")

        files = {
            "wandering-traveler": [
                "https://cdn.modrinth.com/data/test/wandering-traveler.jar",
                "wandering-traveler.jar",
                sha1,
                "a" * 128,
                len(outer_bytes),
                [],
                "1.6.0+fabric",
                "Wandering Traveler",
                "m",
            ]
        }
        cache = run_inspection(files=files, cache={}, save=False, mc_version="26.3", fetcher=lambda _u, _s: outer_bytes)
        self.assertIn("wandering-traveler", cache)
        self.assertFalse(matches_predicate("26.3", cache["wandering-traveler"]["depends"]["minecraft"]))

    def test_optional_vs_optional_mixin_collision_is_not_held_back(self):
        old_files = {
            "sodium": ["https://cdn.modrinth.com/sodium.jar", "sodium.jar", "1" * 40, "1" * 128, 100, [], "0.9.2", "Sodium", "m"],
            "opt-a": ["https://cdn.modrinth.com/opt-a-1.jar", "opt-a.jar", "2" * 40, "2" * 128, 100, [], "1.0.0", "Opt A", "m"],
            "opt-b": ["https://cdn.modrinth.com/opt-b-1.jar", "opt-b.jar", "3" * 40, "3" * 128, 100, [], "1.0.0", "Opt B", "m"],
        }
        files = {
            **old_files,
            "opt-b": ["https://cdn.modrinth.com/opt-b-2.jar", "opt-b.jar", "4" * 40, "4" * 128, 100, [], "2.0.0", "Opt B", "m"],
        }
        app = {
            "mods": [
                {"slug": "sodium", "name": "Sodium", "cat": "P", "rolle": "K"},
                {"slug": "opt-a", "name": "Opt A", "cat": "V", "rolle": "O"},
                {"slug": "opt-b", "name": "Opt B", "cat": "V", "rolle": "O"},
            ],
            "files": dict(files),
            "dec": {"beziehungen": [], "gruppen": []},
        }
        redirect_hit = ["net/minecraft/client/Camera", "align", "(F)V", "Lnet/minecraft/client/Camera;move(FFF)V", 1]
        index = {
            "_v": INDEX_VERSION,
            "sodium": {"id": "sodium", "disabled_mixins": [], "redirects": [], "overwrites": [], "sha1": "1" * 40},
            "opt-a": {"id": "opta", "disabled_mixins": [], "redirects": [redirect_hit + ["opta/CameraMixin.class"]], "overwrites": [], "sha1": "2" * 40},
            "opt-b": {"id": "optb", "disabled_mixins": [], "redirects": [redirect_hit + ["optb/CameraMixin.class"]], "overwrites": [], "sha1": "4" * 40},
        }
        insp = {
            "sodium": {"sha1": "1" * 40, "mod_id": "sodium", "jar_version": "0.9.2", "depends": {"minecraft": "26.3"}},
            "opt-a": {"sha1": "2" * 40, "mod_id": "opta", "jar_version": "1.0.0", "depends": {"minecraft": "26.3"}},
            "opt-b": {"sha1": "4" * 40, "mod_id": "optb", "jar_version": "2.0.0", "depends": {"minecraft": "26.3"}},
        }
        upd = {"updates": [{"slug": "opt-b", "name": "Opt B", "von": "1.0.0", "auf": "2.0.0", "art": "release"}]}
        held, _, _, _ = guard_updates(files, old_files, app, app, index, insp=insp, upd=upd, proj={"minecraftVersion": "26.3"}, fetch_missing=False)
        self.assertEqual(held, [])
        self.assertEqual(files["opt-b"][6], "2.0.0")

    def test_core_vs_core_mixin_collision_is_held_back(self):
        old_files = {
            "core-a": ["https://cdn.modrinth.com/core-a.jar", "core-a.jar", "1" * 40, "1" * 128, 100, [], "1.0.0", "Core A", "m"],
            "core-b": ["https://cdn.modrinth.com/core-b-1.jar", "core-b.jar", "2" * 40, "2" * 128, 100, [], "1.0.0", "Core B", "m"],
        }
        files = {
            **old_files,
            "core-b": ["https://cdn.modrinth.com/core-b-2.jar", "core-b.jar", "3" * 40, "3" * 128, 100, [], "2.0.0", "Core B", "m"],
        }
        app = {
            "mods": [
                {"slug": "core-a", "name": "Core A", "cat": "P", "rolle": "K"},
                {"slug": "core-b", "name": "Core B", "cat": "P", "rolle": "K"},
            ],
            "files": dict(files),
            "dec": {"beziehungen": [], "gruppen": []},
        }
        ow_hit = ["net/minecraft/world/level/chunk/PalettedContainer", "acquire", "()V"]
        index = {
            "_v": INDEX_VERSION,
            "core-a": {"id": "corea", "disabled_mixins": [], "redirects": [], "overwrites": [ow_hit + ["corea/Mixin.class"]], "sha1": "1" * 40},
            "core-b": {"id": "coreb", "disabled_mixins": [], "redirects": [], "overwrites": [ow_hit + ["coreb/Mixin.class"]], "sha1": "3" * 40},
        }
        insp = {
            "core-a": {"sha1": "1" * 40, "mod_id": "corea", "jar_version": "1.0.0", "depends": {"minecraft": "26.3"}},
            "core-b": {"sha1": "3" * 40, "mod_id": "coreb", "jar_version": "2.0.0", "depends": {"minecraft": "26.3"}},
        }
        upd = {"updates": [{"slug": "core-b", "name": "Core B", "von": "1.0.0", "auf": "2.0.0", "art": "release"}], "verlauf": []}
        held, _, _, _ = guard_updates(files, old_files, app, app, index, insp=insp, upd=upd, proj={"minecraftVersion": "26.3"}, fetch_missing=False)
        self.assertEqual(len(held), 1)
        self.assertEqual(held[0]["slug"], "core-b")
        self.assertEqual(files["core-b"][6], "1.0.0")
        self.assertTrue(any(v["slug"] == "core-b" for v in upd.get("verfuegbar", [])))

    def test_core_vs_core_fabric_mod_json_depends_and_breaks_are_held_back(self):
        # Reverse dependency check: sodium updates to 0.10.0 while iris in CORE requires sodium ~0.9.0
        old_files = {
            "sodium": ["https://cdn.modrinth.com/sodium-092.jar", "sodium.jar", "1" * 40, "1" * 128, 100, [], "mc26.3-0.9.2-fabric", "Sodium", "m"],
            "iris": ["https://cdn.modrinth.com/iris.jar", "iris.jar", "2" * 40, "2" * 128, 100, ["sodium"], "1.11.4+26.3", "Iris", "m"],
        }
        files = {
            **old_files,
            "sodium": ["https://cdn.modrinth.com/sodium-010.jar", "sodium.jar", "9" * 40, "9" * 128, 100, [], "mc26.3-0.10.0-fabric", "Sodium", "m"],
        }
        app = {
            "mods": [
                {"slug": "sodium", "name": "Sodium", "cat": "P", "rolle": "K"},
                {"slug": "iris", "name": "Iris", "cat": "P", "rolle": "K"},
            ],
            "files": dict(files),
            "dec": {"beziehungen": [], "gruppen": []},
        }
        index = {
            "_v": INDEX_VERSION,
            "sodium": {"id": "sodium", "disabled_mixins": [], "redirects": [], "overwrites": [], "sha1": "9" * 40},
            "iris": {"id": "iris", "disabled_mixins": [], "redirects": [], "overwrites": [], "sha1": "2" * 40},
        }
        insp = {
            "sodium": {"sha1": "9" * 40, "mod_id": "sodium", "jar_version": "0.10.0", "depends": {"minecraft": "26.3"}, "breaks": {}},
            "iris": {"sha1": "2" * 40, "mod_id": "iris", "jar_version": "1.11.4", "depends": {"minecraft": "26.3", "sodium": "0.9.x"}, "breaks": {}},
        }
        upd = {"updates": [{"slug": "sodium", "name": "Sodium", "von": "mc26.3-0.9.2-fabric", "auf": "mc26.3-0.10.0-fabric", "art": "release"}], "verlauf": []}
        held, _, _, _ = guard_updates(files, old_files, app, app, index, insp=insp, upd=upd, proj={"minecraftVersion": "26.3"}, fetch_missing=False)
        self.assertEqual(len(held), 1)
        self.assertEqual(held[0]["slug"], "sodium")
        self.assertEqual(files["sodium"][6], "mc26.3-0.9.2-fabric")
        self.assertIn("iris erfordert sodium", held[0]["grund"])

        # Forward breaks check: core mod update adds breaks against another core mod
        files2 = {
            **old_files,
            "sodium": ["https://cdn.modrinth.com/sodium-093.jar", "sodium.jar", "8" * 40, "8" * 128, 100, [], "mc26.3-0.9.3-fabric", "Sodium", "m"],
        }
        app2 = {**app, "files": dict(files2)}
        insp2 = {
            "sodium": {"sha1": "8" * 40, "mod_id": "sodium", "jar_version": "0.9.3", "depends": {"minecraft": "26.3"}, "breaks": {"iris": "<=1.11.4"}},
            "iris": {"sha1": "2" * 40, "mod_id": "iris", "jar_version": "1.11.4", "depends": {"minecraft": "26.3", "sodium": "0.9.x"}, "breaks": {}},
        }
        index2 = {
            "_v": INDEX_VERSION,
            "sodium": {"id": "sodium", "disabled_mixins": [], "redirects": [], "overwrites": [], "sha1": "8" * 40},
            "iris": {"id": "iris", "disabled_mixins": [], "redirects": [], "overwrites": [], "sha1": "2" * 40},
        }
        upd2 = {"updates": [{"slug": "sodium", "name": "Sodium", "von": "mc26.3-0.9.2-fabric", "auf": "mc26.3-0.9.3-fabric", "art": "release"}], "verlauf": []}
        held2, _, _, _ = guard_updates(files2, old_files, app2, app2, index2, insp=insp2, upd=upd2, proj={"minecraftVersion": "26.3"}, fetch_missing=False)
        self.assertEqual(len(held2), 1)
        self.assertEqual(held2[0]["slug"], "sodium")
        self.assertEqual(files2["sodium"][6], "mc26.3-0.9.2-fabric")

    def test_optional_mod_with_broken_mc_version_is_held_back(self):
        old_files = {
            "wandering-traveler": ["https://cdn.modrinth.com/wt-1.jar", "wt.jar", "1" * 40, "1" * 128, 100, [], "1.5.0", "Wandering Traveler", "m"],
        }
        files = {
            "wandering-traveler": ["https://cdn.modrinth.com/wt-2.jar", "wt.jar", "2" * 40, "2" * 128, 100, [], "1.6.0+fabric", "Wandering Traveler", "m"],
        }
        app = {
            "mods": [{"slug": "wandering-traveler", "name": "Wandering Traveler", "cat": "G", "rolle": "O"}],
            "files": dict(files),
            "dec": {"beziehungen": [], "gruppen": []},
        }
        index = {
            "_v": INDEX_VERSION,
            "wandering-traveler": {"id": "wandering_traveler", "disabled_mixins": [], "redirects": [], "overwrites": [], "sha1": "2" * 40},
        }
        insp = {
            "wandering-traveler": {
                "sha1": "2" * 40,
                "mod_id": "wandering_traveler",
                "jar_version": "1.6.0+fabric",
                "depends": {"minecraft": ">=1.20 <1.20.2"},
                "broken_jij": "META-INF/monolith/jars/wanderingtraveler-fabric-1.20.1-1.6.0.jar",
            }
        }
        upd = {
            "updates": [{"slug": "wandering-traveler", "name": "Wandering Traveler", "von": "1.5.0", "auf": "1.6.0+fabric", "art": "release"}],
            "verlauf": [],
            "stand": {"wandering-traveler": {"version": "1.6.0+fabric", "seit": "2026-11-19"}},
        }
        held, _, _, _ = guard_updates(files, old_files, app, app, index, insp=insp, upd=upd, proj={"minecraftVersion": "26.3"}, fetch_missing=False)
        self.assertEqual(len(held), 1)
        self.assertEqual(held[0]["slug"], "wandering-traveler")
        self.assertEqual(files["wandering-traveler"][6], "1.5.0")
        self.assertEqual(upd["stand"]["wandering-traveler"]["version"], "1.5.0")
        self.assertIn("inkompatibel mit Minecraft 26.3", held[0]["grund"])

    def test_pin_is_empty_in_update_scripts(self):
        with open(os.path.join(ROOT, "scripts", "check-updates.mjs"), encoding="utf-8") as fp:
            mjs_src = fp.read()
        self.assertIn("const PIN = new Set();", mjs_src)

        with open(os.path.join(ROOT, "scripts", "check_updates.py"), encoding="utf-8") as fp:
            py_src = fp.read()
        self.assertIn("PIN = set()", py_src)


if __name__ == "__main__":
    unittest.main()
