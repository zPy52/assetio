---
name: naming
description: Guidelines for naming methods, classes, and types in this codebase. Use when naming a new method, class, type, or variable, or when reviewing whether an existing name is clear and intent-revealing.
---

# Naming

Good names are the cheapest form of documentation. A name should answer "what does this do?" without requiring the reader to look at the implementation.

## Methods: verb-noun pattern

Every method name should start with a strong, specific verb. The noun tells you what it acts on.

| Verb | Use for |
|------|---------|
| `get` | Return a value that already exists or can be derived cheaply |
| `create` / `build` | Construct and return a new object |
| `to` | Convert one form to another (pure, no side-effects) |
| `fetch` | Async retrieval from an external source (network, disk) |
| `execute` / `invoke` | Run something by name or reference |
| `process` | Read input, produce side-effects and/or return output |
| `send` / `emit` | Push data outward |
| `load` / `save` | Persist to or read from storage |

## Avoid vague verbs

These verbs are legal but reveal nothing about intent:

| Avoid | Why | Better |
|-------|-----|--------|
| `resolve` | Overloaded: build? fetch? convert? | `getModel`, `fetchUser`, `toPath` |
| `handle` | What is handled and how? | `onSubmit`, `processError`, `dismissOverlay` |
| `run` | What runs and what does it produce? | `chat`, `executeTask`, `startWorker` |
| `build` | Build what from what? | `toAssistantContent`, `createRegistry` |
| `do` / `perform` | Placeholder, not a name | name the actual action |

Use `run` only as the single public entry point on a service class where the name of the class already supplies the missing context (e.g. `AgentService.run`).

## Conversions: use `to` prefix

Pure functions that convert one shape to another should start with `to`. This signals: no side-effects, returns a new value.

```ts
// Good
toAssistantContent(text, toolCalls)   // string + calls → content parts array
toDisplayMessage(coreMessage)         // core → UI shape

// Avoid
buildAssistantContent(...)            // "build" implies construction, hides conversion intent
formatMessage(...)                    // "format" is vague about input/output types
```

## Queries vs. mutations: make it obvious

- Queries (read-only) → noun or `get`/`list`/`find` prefix: `listAvailable()`, `getModel()`, `findById()`
- Mutations (write) → verb that signals change: `save()`, `delete()`, `update()`, `append()`
- Mixed (read + side-effect) → be explicit: `processStream()`, `executeTools()`

## Classes: role suffix pattern

This project uses role suffixes that signal responsibility:

| Suffix | Responsibility |
|--------|---------------|
| `Service` | Business / application logic, no state |
| `Store` | State management and persistence |
| `Submodule` | Logical sub-group of a `Service` or `Store` |

Never name a class after what it _is_ internally (`Runner`, `Manager`, `Handler`) — name it after the domain role it fills (`AgentService`, `ConfigStore`).

## Real before/after examples from this codebase

| Before | After | Reason |
|--------|-------|--------|
| `AgentRunner` | `AgentService` | Matches `XxxService` convention; "Runner" is an impl detail |
| `AiProviderService.resolve(id, cfg)` | `AiProviderService.getModel(id, cfg)` | `resolve` is vague; `getModel` says what comes back |
| `buildAssistantContent(text, calls, msgs)` | `toAssistantContent(text, calls)` | Pure conversion → `to` prefix; removed side-effectful `msgs` arg |
| `collectStream(stream, cbs, signal)` | `processStream(stream, cbs, signal)` | Emits callbacks and returns structured output — more than "collecting" |
| `runToolCalls(calls, cbs)` | `executeTools(calls, cbs)` | `execute` is specific; plural noun matches the batch nature |
| `executeTool(name, args)` | `invokeTool(name, args)` | `invoke` is the standard term for calling by name/reference |
| `RawToolCall` | `StreamedToolCall` | Describes origin, not internal format |
