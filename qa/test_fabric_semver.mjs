import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSemVer, compareSemVer, matchesPredicate } from "../app/src/lib/fabric-semver.ts";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/version_predicates.json", import.meta.url), "utf8")
);
const projectConfig = JSON.parse(
  readFileSync(new URL("../config/project.json", import.meta.url), "utf8")
);
const appData = JSON.parse(
  readFileSync(new URL("../data/app-data.json", import.meta.url), "utf8")
);

test("predicateCases from version_predicates.json", async (t) => {
  assert.ok(fixtures.predicateCases.length >= 25, "expected at least 25 predicate cases");
  for (const tc of fixtures.predicateCases) {
    await t.test(tc.name, () => {
      assert.equal(
        matchesPredicate(tc.version, tc.predicate),
        tc.expected,
        `version=${JSON.stringify(tc.version)} predicate=${JSON.stringify(tc.predicate)}`
      );
    });
  }
});

test("compareCases from version_predicates.json", async (t) => {
  for (const tc of fixtures.compareCases) {
    await t.test(tc.name, () => {
      const a = parseSemVer(tc.a);
      const b = parseSemVer(tc.b);
      assert.ok(a, `expected ${tc.a} to parse as SemVer`);
      assert.ok(b, `expected ${tc.b} to parse as SemVer`);
      assert.equal(compareSemVer(a, b), tc.expected);
    });
  }
});

test("edge guards for empty/null predicates and non-SemVer parsing", () => {
  assert.equal(parseSemVer(""), null);
  assert.equal(parseSemVer("1.2.3+"), null);
  assert.equal(parseSemVer("1..2"), null);
  assert.equal(parseSemVer("01.2.3"), null);
  assert.equal(parseSemVer("v1.2.3"), null);
  assert.equal(matchesPredicate("26.3", ""), false);
  assert.equal(matchesPredicate("26.3", []), false);
  assert.equal(matchesPredicate("", "*"), true);
  assert.equal(matchesPredicate("", "x"), true);
  assert.equal(matchesPredicate("", "X"), true);
});

test("all jar_rules mc predicates in app-data.json are compatible with config/project.json minecraftVersion", () => {
  const mc = projectConfig.minecraftVersion;
  const rules = appData.jar_rules || {};
  assert.ok(Object.keys(rules).length > 0);
  for (const [slug, rule] of Object.entries(rules)) {
    if (rule.mc) {
      assert.equal(
        matchesPredicate(mc, rule.mc),
        true,
        `${slug} mc=${JSON.stringify(rule.mc)} failed for ${mc}`
      );
    }
  }
});
