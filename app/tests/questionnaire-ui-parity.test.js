import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stylesUrl = new URL("../css/style.css", import.meta.url);

function declarationsFor(styles, selector) {
  for (const match of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((candidate) => candidate.trim());
    if (selectors.includes(selector)) return match[2];
  }
  assert.fail(`missing CSS selector: ${selector}`);
}

test("T-045 S-002 transplants Kokoro Parea questionnaire dimensions while retaining SigotoSocket colors", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const options = declarationsFor(styles, ".answer-options");
  const option = declarationsFor(styles, ".answer-option");
  const selected = declarationsFor(styles, ".answer-option.selected");
  const navigation = declarationsFor(styles, ".questionnaire-navigation");
  const secondary = declarationsFor(styles, ".secondary-button");
  const danger = declarationsFor(styles, ".danger-button");

  assert.match(options, /gap:\s*12px/);
  assert.match(options, /margin-top:\s*24px/);
  assert.match(option, /min-height:\s*56px/);
  assert.match(option, /padding:\s*14px 16px/);
  assert.match(option, /border-radius:\s*12px/);
  assert.match(option, /font-size:\s*1rem/);
  assert.match(option, /line-height:\s*1\.5/);
  assert.match(selected, /border-color:\s*var\(--accent\)/);
  assert.match(selected, /box-shadow:\s*inset 0 0 0 2px var\(--accent\)/);
  assert.match(navigation, /display:\s*flex/);
  assert.match(navigation, /justify-content:\s*space-between/);
  assert.match(navigation, /gap:\s*10px/);
  assert.match(navigation, /margin-top:\s*28px/);
  assert.match(secondary, /font-weight:\s*700/);
  assert.match(secondary, /color:\s*var\(--accent\)/);
  assert.match(danger, /border-color:\s*#b77a7a/);
  assert.match(danger, /color:\s*#7a2b2b/);
});

test("T-045 S-001 keeps the questionnaire header flat while adopting Kokoro Parea spacing", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const sticky = declarationsFor(styles, ".app-header.is-sticky");

  assert.match(sticky, /padding-top:\s*12px/);
  assert.match(sticky, /padding-inline:\s*12px/);
  assert.match(sticky, /border-radius:\s*0/);
  assert.match(sticky, /background:\s*transparent/);
  assert.match(sticky, /box-shadow:\s*none/);
});
