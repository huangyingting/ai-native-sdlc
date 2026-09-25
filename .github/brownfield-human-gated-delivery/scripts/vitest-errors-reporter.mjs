import { writeFileSync } from "node:fs";

// Vitest's JSON reporter does not include unhandled errors or nested hook errors.
export default class LifecycleErrorsReporter {
  onTestRunEnd(modules, unhandledErrors, reason) {
    const suiteErrors = [];
    function visit(task) {
      if (task.type !== "suite") return;
      suiteErrors.push(...(task.result?.errors ?? []).map((error) => error.message));
      for (const child of task.tasks ?? []) visit(child);
    }
    for (const module of modules) visit(module.task);
    writeFileSync(process.env.VITEST_ERRORS_REPORT, JSON.stringify({
      reason,
      unhandledErrors: unhandledErrors.map((error) => error.message),
      suiteErrors,
    }));
  }
}
