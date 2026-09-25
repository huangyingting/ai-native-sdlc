# Demo projects

Each subdirectory is a self-contained demonstration project with its own
manifest, lockfile, runtime requirements, documentation, and path-scoped CI.
Keeping demos independent prevents one project's framework or dependency
choices from constraining the others.

When adding a demo:

1. Create `demos/<demo-name>/`.
2. Include a project README and the package-manager lockfile.
3. Define the project's test, lint, and build scripts in its manifest.
4. Add a path-scoped workflow under `.github/workflows/`.
5. Add the demo to the repository structure list in the root README.

The root package is reserved for repository automation. Demo dependencies
should not be added to it.
