# Aufzug-Demo – Monorepo

Next.js monorepo with two demo apps (ALT & MVG) and a shared library, managed via **npm workspaces**.

## Project Structure

```
aufzug-demo/
├── apps/
│   ├── alt/          # @aufzug/alt – Next.js app (ALT demo)
│   └── mvg/          # @aufzug/mvg – Next.js app (MVG demo)
├── packages/
│   └── shared/       # @aufzug/shared – Shared components & API logic
├── package.json      # Root workspace config & scripts
└── package-lock.json
```

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10 (comes with Node)

## Getting Started

### 1. Install dependencies

Run from the **repo root** to install everything across all workspaces:

```bash
npm install
```

### 2. Start a dev server

Each app runs on its own Next.js dev server:

```bash
# ALT app (default Next.js port 3000)
npm run dev:alt

# MVG app (default Next.js port 3000 — run them one at a time or on different ports)
npm run dev:mvg
```

To run both simultaneously on different ports:

```bash
npm -w apps/alt run dev -- -p 3000 &
npm -w apps/mvg run dev -- -p 3001 &
```

### 3. Build for production

```bash
npm run build:alt
npm run build:mvg
```

Then start:

```bash
npm -w apps/alt run start
npm -w apps/mvg run start
```

### 4. Lint

```bash
npm run lint
```

## Workspace Commands

Target any workspace directly with `-w`:

```bash
npm -w apps/alt run dev       # Start ALT in dev mode
npm -w apps/mvg run build     # Build MVG
npm -w @aufzug/shared <cmd>   # Run a script in the shared package
```

## Shared Package

`@aufzug/shared` is automatically transpiled by both apps (via `transpilePackages` in `next.config.ts`). Any changes to `packages/shared/src/` are picked up immediately in dev mode without rebuilding.
