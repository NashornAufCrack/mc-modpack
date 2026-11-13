import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import tomllib
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from scripts.fabric_semver import compare_sem_ver, matches_predicate, normalize_target_version, parse_sem_ver


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


if __name__ == "__main__":
    unittest.main()
