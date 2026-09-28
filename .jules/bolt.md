# Bolt's Journal - Critical Performance Learnings

## 2025-02-21 - Query Memoization in Filter Loops
**Learning:** Functions like `matchesQuery` called inside `.filter()` or multi-field search predicates normalize the same `query` string repeatedly (NFD string normalization + multiple regexes) N times per filter pass.
**Action:** Memoize `lastQuery` and pre-split `lastQueryWords` so subsequent calls with the identical search query during list filtering skip re-normalization and string splitting entirely.

## 2025-02-22 - Animation RAF Loops outside NgZone
**Learning:** High-frequency `requestAnimationFrame` loops run inside Angular's zone by default because zone.js monkey-patches `requestAnimationFrame`, causing microtask change detection ticks across the component tree on every frame (60–120 fps).
**Action:** Wrap recursive `requestAnimationFrame` steps in `ngZone.runOutsideAngular(...)` and re-enter Angular Zone using `ngZone.run(...)` only when applying the final end state or completing the animation.
