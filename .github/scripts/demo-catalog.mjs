import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const catalogRoot = fileURLToPath(new URL("../../demos/", import.meta.url));
const executionModes = new Set(["direct", "fleet", "sequential"]);

export function loadDemoCatalog(root = catalogRoot) {
  const demos = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => {
      const path = join(root, entry.name);
      const demo = JSON.parse(readFileSync(path, "utf8"));
      for (const field of ["id", "label", "execution", "description", "defaultPrompt", "instruction"]) {
        if (!demo[field]) throw new Error(`Missing ${field} in ${path}`);
      }
      if (`${demo.id}.json` !== basename(entry.name)) throw new Error(`Demo id must match its filename: ${path}`);
      if (!executionModes.has(demo.execution)) throw new Error(`Unsupported execution mode in ${path}: ${demo.execution}`);
      return { ...demo, legacyLabels: demo.legacyLabels ?? [] };
    })
    .sort((left, right) => left.label.localeCompare(right.label));

  const ids = new Set();
  const labels = new Set();
  for (const demo of demos) {
    if (ids.has(demo.id)) throw new Error(`Duplicate demo id: ${demo.id}`);
    ids.add(demo.id);
    for (const label of [demo.label, ...demo.legacyLabels]) {
      if (labels.has(label)) throw new Error(`Duplicate demo label or alias: ${label}`);
      labels.add(label);
    }
  }
  return demos;
}

export const demoCatalog = loadDemoCatalog();
export const defaultDemoLabel = "Parallel research";

export function findDemo(label) {
  const selectedLabel = label || defaultDemoLabel;
  const demo = demoCatalog.find((candidate) =>
    candidate.label === selectedLabel || candidate.legacyLabels.includes(selectedLabel));
  if (!demo) throw new Error(`Unsupported demo: ${label || "(missing)"}`);
  return demo;
}
