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
