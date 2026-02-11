# Digito Admin Dashboard — Development Guidelines

## Package Management

**Always use pnpm instead of npm** for package management to keep the lockfile in sync with Vercel's build system.

- Install dependencies: `pnpm install`
- Add packages: `pnpm add <package-name>`
- Add dev dependencies: `pnpm add -D <package-name>`

## TDD Rule

Always create tests first, then implement. Every new feature, component, or utility must have its test written and committed before the implementation code. This applies to:

- React components (use React Testing Library)
- Utility functions
- Custom hooks
- Form validation schemas
- Firestore CRUD operations

The workflow is:
1. Write a failing test that describes the expected behavior
2. Implement the minimum code to make the test pass
3. Refactor if needed, keeping tests green

## Documentation

After implementing important code changes, take your time to document them for other coding agents to use as pick-and-go context in admin-dashboard.md. 
Extract learnings for design-direction.md when there are stylistic changes that we can reuse and repeat in the future. 
Update firestore-data-structure.md when you make changes to Firestore data structure.
Keep your edits brief and with a clear but short explanation.

## Language support

When planning any feature, plan i18n integration also. 
