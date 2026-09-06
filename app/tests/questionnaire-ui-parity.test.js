import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const stylesUrl = new URL("../css/style.css", import.meta.url);

function declarationsFor(styles, selector) {
  const uncommentedStyles = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of uncommentedStyles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
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

test("T-046 S-001 keeps one header geometry for all screens", async () => {
  const styles = await readFile(stylesUrl, "utf8");
  const header = declarationsFor(styles, ".app-header");

  assert.match(header, /padding-bottom:\s*18px/);
  assert.match(header, /border-bottom:\s*1px solid var\(--line\)/);
  assert.doesNotMatch(styles, /\.app-header\.is-sticky\s*\{/);
});
