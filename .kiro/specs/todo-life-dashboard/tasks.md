# Implementation Plan: To-Do List Life Dashboard

## Overview

This plan implements a zero-dependency, single-page To-Do List Life Dashboard using only HTML, CSS, and Vanilla JavaScript — no framework, no backend, no build step (Requirement 15). The dashboard is opened by double-clicking `index.html`, and all user data (Tasks, Quick Links, Theme, User_Name) persists in the browser's `window.localStorage` as JSON strings under dedicated `tld.*` keys.

The implementation follows the design's three-layer separation inside a single `js/script.js` file: a pure **Logic** layer (property-testable, no DOM or `localStorage` access), a thin **Storage** adapter (safe JSON parsing with per-key fallbacks), and a side-effectful **UI** layer (Renderer + EventBinder + ClockService). Pure logic functions are exposed on a global `window.TLD` namespace so a no-build, browser-based property test harness can exercise them in isolation from real `localStorage` using an in-memory storage fake.

Implementation order: HTML structure and CSS theming/responsive layout first, then the pure Logic layer with one property test written alongside each property (catching errors early), then the Storage adapter, then the UI Renderer and ClockService, then the EventBinder wiring, and finally the AppInit bootstrap. Example, integration, and smoke tests cover the side-effectful presentation layer and the no-build/responsive constraints that are not suited to property-based testing.

The three core challenges are implemented in the pure Logic layer and wired through the EventBinder: the persisted Light/Dark Mode toggle (Req 12–13), the custom name in the Greeting (Req 10), and the case-insensitive, whitespace-trimmed duplicate-task prevention (Req 2).

## Tasks

- [x] 1. Set up project structure and HTML markup
  - [x] 1.1 Create the project directory structure and `index.html`
    - Create `css/` and `js/` directories and `index.html` at the project root
    - Build semantic markup for all dashboard sections: header (Greeting + Date/Time clock), a theme toggle control, a task section (form + list + empty-state placeholder), a quick-link section (form + list + empty-state placeholder), and a user-name input
    - Reference only `./css/style.css` and `./js/script.js`; include no external resources
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 2. Implement CSS theming and responsive layout
  - [x] 2.1 Define CSS custom properties for light/dark palettes and base dashboard styling
    - Define color custom properties for Light Mode on `:root` and the dark palette under `[data-theme="dark"]`
    - Style the dashboard shell, header, forms, buttons, and inputs using the custom properties
    - _Requirements: 12.2, 12.3_
  - [x] 2.2 Add responsive layout and component styling
    - Implement desktop (≥1024px multi-column), tablet (768–1023px), and mobile (<768px single-column) layouts via media queries
    - Style the task list, quick-link area, empty-state messages, and the completed-task visual distinction
    - Keep all interactive controls usable and readable at every breakpoint
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 3.2, 4.3, 8.3_

- [ ] 3. Implement Task management Logic (pure functions)
  - [x] 3.1 Implement the Task pure functions on the `TLD.Logic` namespace
    - Set up `window.TLD = { Logic: {}, Storage: {}, UI: {} }` and define the Task data shape `{ id, name, completed }`
    - Implement: `normalizeTaskName` (trim + lowercase), `isValidTaskName`, `isDuplicateTask` (trimmed + case-insensitive), `generateTaskId` (unique within the collection), `addTask` (validate, duplicate-check, append `{ id, name: trimmed, completed: false }`, return `{ ok, tasks, error? }`), `toggleTaskComplete`, `deleteTask`, `serializeTasks`, `deserializeTasks`
    - `deserializeTasks` returns `[]` on missing/corrupt input without throwing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.4, 3.1, 4.1, 5.4, 5.5_
  - [x] 3.2 Write property test for valid task addition
    - Verify `addTask` appends one well-formed task with a unique id and `completed: false` for any non-empty, non-duplicate name
    - **Property 1: Valid task addition produces a well-formed, uniquely-identified task**
    - **Validates: Requirements 1.1, 1.2, 1.4**
  - [x] 3.3 Write property test for duplicate task rejection
    - Verify `addTask` rejects a name matching an existing task (trimmed, case-insensitive) and leaves the collection unchanged
    - **Property 2: Duplicate task submission is rejected and leaves the collection unchanged**
    - **Validates: Requirements 2.1, 2.3, 2.4**
  - [x] 3.4 Write property test for empty/whitespace task name rejection
    - Verify `addTask` returns `{ ok: false }` for any all-whitespace name and leaves the collection unchanged
    - **Property 3: Empty or whitespace-only task name is rejected and leaves the collection unchanged**
    - **Validates: Requirements 1.3**
  - [-] 3.5 Write property test for completion toggle
    - Verify `toggleTaskComplete` flips the target task's `completed`, preserves all others, and a double-toggle restores the original collection
    - **Property 4: Completion toggle flips the target and preserves the rest**
    - **Validates: Requirements 3.1**
  - [~] 3.6 Write property test for task deletion
    - Verify `deleteTask` removes exactly the matching task, preserves the rest, and decreases size by exactly one
    - **Property 5: Task deletion removes the target and preserves the rest**
    - **Validates: Requirements 4.1**
  - [~] 3.7 Write property test for task persistence round-trip
    - Verify `deserializeTasks(serializeTasks(C))` deep-equals `C` and re-serialization is stable
    - **Property 6: Task collection persistence round-trip**
    - **Validates: Requirements 5.5**
  - [~] 3.8 Write property test for corrupt task storage recovery
    - Verify `deserializeTasks` returns `[]` and does not throw for malformed JSON, `null`, non-array JSON, and arrays with invalid fields
    - **Property 7: Corrupt task storage resets to empty without throwing**
    - **Validates: Requirements 5.4**

- [ ] 4. Implement Quick Link Logic (pure functions)
  - [x] 4.1 Implement the Quick Link pure functions on the `TLD.Logic` namespace
    - Define the Quick Link data shape `{ id, title, url }`
    - Implement: `normalizeUrl` (prepend `http://` when no protocol scheme is present), `isValidQuickLink` (both trimmed non-empty), `generateQuickLinkId`, `addQuickLink` (validate, normalize URL, append, return `{ ok, links, error? }`), `editQuickLink` (update in place on valid input; leave unchanged on invalid), `removeQuickLink`, `serializeQuickLinks`, `deserializeQuickLinks`
    - `deserializeQuickLinks` returns `[]` on missing/corrupt input without throwing
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.1, 9.4, 9.5_
  - [~] 4.2 Write property test for valid quick link addition
    - Verify `addQuickLink` appends one link with a unique id, trimmed title, and a URL that has a protocol scheme
    - **Property 8: Valid quick link addition produces a well-formed link**
    - **Validates: Requirements 6.1**
  - [~] 4.3 Write property test for URL scheme normalization
    - Verify `normalizeUrl` always yields a value beginning with a protocol scheme, and preserves a URL that already has one
    - **Property 9: URL scheme normalization prepends http:// only when a scheme is absent**
    - **Validates: Requirements 6.4**
  - [~] 4.4 Write property test for empty/whitespace quick link rejection
    - Verify `addQuickLink` and `editQuickLink` reject empty/whitespace title or URL and leave the collection unchanged
    - **Property 10: Empty/whitespace quick link title or URL is rejected and leaves the collection unchanged**
    - **Validates: Requirements 6.2, 6.3, 7.2**
  - [~] 4.5 Write property test for quick link edit in place
    - Verify `editQuickLink` updates the matching link's title (trimmed) and url (`normalizeUrl`) in place while preserving all others
    - **Property 11: Quick link edit updates the target in place and preserves the rest**
    - **Validates: Requirements 7.1**
  - [~] 4.6 Write property test for quick link removal
    - Verify `removeQuickLink` removes exactly the matching link, preserves the rest, and decreases size by exactly one
    - **Property 12: Quick link removal removes the target and preserves the rest**
    - **Validates: Requirements 8.1**
  - [~] 4.7 Write property test for quick link persistence round-trip
    - Verify `deserializeQuickLinks(serializeQuickLinks(C))` deep-equals `C` and re-serialization is stable
    - **Property 13: Quick link collection persistence round-trip**
    - **Validates: Requirements 9.5**
  - [~] 4.8 Write property test for corrupt quick link storage recovery
    - Verify `deserializeQuickLinks` returns `[]` and does not throw for malformed JSON, `null`, non-array JSON, and arrays with invalid fields
    - **Property 14: Corrupt quick link storage resets to empty without throwing**
    - **Validates: Requirements 9.4**

- [ ] 5. Implement Greeting and Theme Logic (pure functions)
  - [x] 5.1 Implement the Greeting and Theme pure functions on the `TLD.Logic` namespace
    - Greeting: `normalizeUserName` (trim), `buildGreeting` (a time-of-day greeting containing the name when set; a default greeting that references no name when the name is empty/whitespace)
    - Theme: `isValidTheme`, `normalizeTheme` (return value if valid, else `"light"`), `toggleTheme` (flip light↔dark), `serializeTheme`, `deserializeTheme` (fallback `"light"` on missing/corrupt/invalid without throwing)
    - _Requirements: 10.1, 10.2, 10.5, 12.1, 13.3, 13.4_
  - [~] 5.2 Write property test for user name trimming
    - Verify `normalizeUserName(S)` equals `S.trim()` for any string
    - **Property 15: User name is trimmed before storing**
    - **Validates: Requirements 10.5**
  - [~] 5.3 Write property test for greeting name inclusion
    - Verify `buildGreeting` contains the trimmed name when set, and returns the default greeting with no user name when empty/whitespace
    - **Property 16: Greeting includes the name when set**
    - **Validates: Requirements 10.1, 10.2**
  - [~] 5.4 Write property test for theme toggle
    - Verify `toggleTheme` returns the other theme and a double-toggle restores the original
    - **Property 17: Theme toggle flips and round-trips**
    - **Validates: Requirements 12.1**
  - [~] 5.5 Write property test for theme persistence round-trip
    - Verify `deserializeTheme(serializeTheme(T))` equals `T` for both valid themes
    - **Property 18: Theme persistence round-trip**
    - **Validates: Requirements 13.4**
  - [~] 5.6 Write property test for invalid/corrupt theme fallback
    - Verify `deserializeTheme` returns `"light"` and does not throw for malformed JSON, `null`, and invalid values
    - **Property 19: Invalid or corrupt theme falls back to light without throwing**
    - **Validates: Requirements 13.3**

- [~] 6. Checkpoint - Logic layer complete
  - Ensure all property tests pass (100+ iterations each), ask the user if questions arise.

- [x] 7. Implement the Storage adapter
  - [x] 7.1 Implement `TLD.Storage` over `window.localStorage`
    - Implement `get`, `set`, `remove`, `getJSON(key, fallback)` (try/catch JSON parse; return fallback on `null`, malformed JSON, or thrown error), and `setJSON(key, value)`
    - Every read returns a safe fallback instead of throwing; each storage key is independent so corruption of one never affects another
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4, 13.1, 13.2, 13.3_

- [ ] 8. Implement the UI Renderer
  - [ ] 8.1 Implement `TLD.UI` Renderer functions
    - `renderTaskList` (rebuild list; show the empty-state message when empty) and `renderQuickLinks` (rebuild; show the empty-state when empty)
    - `renderGreeting`, `renderClock`, `applyTheme` (set `document.documentElement.dataset.theme`)
    - `showDuplicateMessage`, `clearDuplicateMessage`, `clearTaskInput` (clear and refocus)
    - Apply the completed-task visual distinction in markup/attributes
    - _Requirements: 1.1, 2.2, 3.2, 4.3, 8.3, 10.1, 10.2, 11.1, 12.2, 12.3_

- [ ] 9. Implement the ClockService
  - [~] 9.1 Implement the ClockService
    - `startClock` renders immediately (satisfies the first render before the first interval) then calls `setInterval(renderClock, 1000)`
    - `renderClock` writes the current date/time to the clock element and no-ops if the element is missing
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 10. Implement the EventBinder
  - [~] 10.1 Implement `TLD.UI.bindEvents`
    - Wire the task form submit (trim, duplicate-check via `Logic.isDuplicateTask`, `addTask`, persist via `Storage`, render; show the duplicate message on reject and do not clear the input; clear input on success)
    - Wire task list delegation for complete toggle (`toggleTaskComplete`, persist, render) and delete (`deleteTask`, persist, render, empty-state)
    - Wire quick-link form submit (`addQuickLink`, persist, render), quick-link edit (`editQuickLink`, persist, render), and remove (`removeQuickLink`, persist, render, empty-state)
    - Wire user-name submit/clear (trim, `buildGreeting`, persist, render; clearing reverts to the default greeting and removes the stored name)
    - Wire the theme toggle (`toggleTheme`, persist, `applyTheme`)
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.3, 4.1, 4.2, 6.1, 7.1, 7.3, 8.1, 8.2, 10.3, 10.4, 12.1, 12.4_

- [ ] 11. Implement the App bootstrap and load sequence
  - [~] 11.1 Implement `AppInit.init` on `DOMContentLoaded`
    - Orchestrate the load sequence: apply the stored theme, load and render tasks, load and render quick links, load and render the greeting, start the clock, show empty states where needed, then `bindEvents`
    - Initialize each component to its default when storage is missing/corrupt (empty collections, Light Mode, empty user name)
    - _Requirements: 4.3, 5.2, 8.3, 9.2, 11.3, 13.1, 13.2_

- [~] 12. Checkpoint - Dashboard wired
  - Ensure all tests pass and the dashboard loads without errors, ask the user if questions arise.

- [ ] 13. Implement the test harness and verification tests
  - [x] 13.1 Create the browser-based test harness and shared test scaffolding
    - Create `tests/test.html` that loads `js/script.js` and `fast-check` from a CDN, then runs `tests/properties.js`
    - Create `tests/properties.js` scaffolding: an in-memory storage fake (so the pure logic is tested in isolation from real `localStorage`), `fast-check` arbitraries for `Task`/`QuickLink`/collections/whitespace/all-whitespace/URLs-with-and-without-schemes/malformed-JSON/invalid-theme, and a tagged test runner (each test tagged `// Feature: todo-life-dashboard, Property N: ...` with `numRuns: 100`)
    - _Requirements: 15.2, 15.3_
  - [~] 13.2 Write example-based unit tests for UI and edge cases
    - Duplicate task submit shows the duplicate message; toggling complete applies the completed class/attribute; deleting the last task shows the empty-state; removing the last quick link shows the empty-state; missing storage keys initialize to defaults; set/clear user name updates the greeting immediately and reverts on clear; apply dark/light theme sets `data-theme`
    - _Requirements: 2.2, 3.2, 4.3, 5.3, 8.3, 9.3, 10.3, 10.4, 12.2, 12.3, 13.2_
  - [~] 13.3 Write integration tests with the storage fake
    - Completing/deleting a task persists under `tld.tasks`; editing/removing a quick link persists under `tld.quickLinks`; a theme change persists under `tld.theme` and is applied on load; load restores seeded tasks/quick links/theme
    - _Requirements: 3.3, 4.2, 5.1, 5.2, 7.3, 8.2, 9.1, 9.2, 12.4, 13.1_
  - [~] 13.4 Write smoke tests for setup, timing, and structure
    - Clock renders immediately on load and registers a 1000ms interval (fake timers); `index.html` loads via `file://` and renders without errors; `index.html` references only `./css/style.css` and `./js/script.js`; `script.js` contains no framework imports and no `fetch`/`XMLHttpRequest`/backend calls
    - _Requirements: 11.1, 11.2, 11.3, 15.1, 15.2, 15.3_

- [~] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks; they can be skipped for a faster MVP, but the property tests are recommended to validate the pure Logic layer.
- Each task references specific requirements (and design properties where applicable) for traceability; the 19 design correctness properties each map to exactly one property test sub-task.
- The three core challenges are implemented in the pure Logic layer and wired through the EventBinder: the persisted theme toggle (Req 12–13), the custom-name greeting (Req 10), and the case-insensitive/trimmed duplicate-task prevention (Req 2).
- Because the app is no-build and loads JavaScript only from `js/script.js`, all Logic/Storage/UI live in that one file under the `window.TLD` namespace; property tests exercise `window.TLD.Logic.*` with an in-memory storage fake.
- Tasks are incremental: each step builds on the previous ones and ends with wiring everything together in `AppInit` (task 11), leaving no orphaned code.
- Checkpoints validate incrementally: after the Logic layer (task 6), after UI wiring (task 12), and at the end (task 14).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1", "13.1"] },
    { "id": 1, "tasks": ["2.2", "4.1", "3.2"] },
    { "id": 2, "tasks": ["5.1", "3.3"] },
    { "id": 3, "tasks": ["7.1", "3.4"] },
    { "id": 4, "tasks": ["8.1", "3.5"] },
    { "id": 5, "tasks": ["9.1", "3.6"] },
    { "id": 6, "tasks": ["10.1", "3.7"] },
    { "id": 7, "tasks": ["11.1", "3.8"] },
    { "id": 8, "tasks": ["4.2"] },
    { "id": 9, "tasks": ["4.3"] },
    { "id": 10, "tasks": ["4.4"] },
    { "id": 11, "tasks": ["4.5"] },
    { "id": 12, "tasks": ["4.6"] },
    { "id": 13, "tasks": ["4.7"] },
    { "id": 14, "tasks": ["4.8"] },
    { "id": 15, "tasks": ["5.2"] },
    { "id": 16, "tasks": ["5.3"] },
    { "id": 17, "tasks": ["5.4"] },
    { "id": 18, "tasks": ["5.5"] },
    { "id": 19, "tasks": ["5.6"] },
    { "id": 20, "tasks": ["13.2"] },
    { "id": 21, "tasks": ["13.3"] },
    { "id": 22, "tasks": ["13.4"] }
  ]
}
```
