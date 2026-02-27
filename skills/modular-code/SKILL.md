---
name: modular-code
description: Documents the modular static-class architecture used in this project. Use when creating new stores, services, or constants modules, adding submodules to existing classes, or when following the XxxStore/XxxService/Const naming and file layout conventions.
---

# Modular Code Architecture

This project uses a component-style module pattern where code is organized as static classes with submodule properties, enabling clean dot-notation access like `ConfigStore.apiKeys.get(...)`.

## Core concepts

- **Stores** (`src/stores/`) — state and persistence logic. Named `XxxStore`.
- **Services** (`src/services/`) — business/application logic. Named `XxxService`.
- **Constants** (`src/const/`) — static values grouped under the `Const` namespace.

All methods are `static`. There are no instantiated top-level modules — callers use the class directly.

## File layout

```
src/<domain>/<name>/
├── index.ts        # Main class, static methods, submodule instances
├── types.ts        # Types and interfaces for this module
└── <submodule>.ts  # One file per submodule (e.g., api-keys.ts)
```

The domain folder (`stores/`, `services/`, `const/`) groups related modules together.

## Submodules

When a module has a distinct group of related methods, extract them into a submodule class and attach it as a `public static readonly` property on the parent class.

**Naming:** `Submodule<ParentClass><SubmoduleName>` — e.g., `SubmoduleConfigStoreApiKeys`.

```ts
// stores/config/api-keys.ts
export class SubmoduleConfigStoreApiKeys {
  public get(provider: ProviderName, config: AppConfig): string | undefined { ... }
  public hasAny(config: AppConfig): boolean { ... }
}

// stores/config/index.ts
export class ConfigStore {
  public static readonly apiKeys = new SubmoduleConfigStoreApiKeys();

  public static load(): AppConfig { ... }
  public static save(config: AppConfig): void { ... }
}
```

Call site: `ConfigStore.apiKeys.get('openai', config)`

## Constants namespace

Constants are grouped by module under a single `Const` object:

```ts
// const/index.ts
import * as config from '@/const/config';
export const Const = { config };
```

Call site: `Const.config.CONFIG_FILE`, `Const.config.DEFAULT_CONFIG`

## Real examples

| Call | Class | File |
|------|-------|------|
| `ConfigStore.load()` | `ConfigStore` | `src/stores/config/index.ts` |
| `ConfigStore.apiKeys.get(provider, config)` | `SubmoduleConfigStoreApiKeys` | `src/stores/config/api-keys.ts` |
| `AiProviderService.getModel(modelId, config)` | `AiProviderService` | `src/services/providers/index.ts` |
| `AiProviderService.listAvailable(config)` | `AiProviderService` | `src/services/providers/index.ts` |
| `Const.config.ENV_KEY_MAP` | — | `src/const/config.ts` |

## Checklist when adding a new module

- [ ] Place in the correct domain folder (`stores/`, `services/`, or `const/`)
- [ ] Name: `XxxStore` / `XxxService` with only static methods
- [ ] Put types in `types.ts` alongside `index.ts`
- [ ] If a logical group of methods exists, extract to a `Submodule<Parent><Name>` class
- [ ] Attach submodule as `public static readonly <name> = new Submodule...()` on the parent
- [ ] Export relevant types from `index.ts` so consumers import from one place
