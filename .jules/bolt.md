# Bolt's Journal - Critical Performance Learnings

## 2025-02-21 - Query Memoization in Filter Loops
**Learning:** Functions like `matchesQuery` called inside `.filter()` or multi-field search predicates normalize the same `query` string repeatedly (NFD string normalization + multiple regexes) N times per filter pass.
**Action:** Memoize `lastQuery` and pre-split `lastQueryWords` so subsequent calls with the identical search query during list filtering skip re-normalization and string splitting entirely.
