# Plan: Indoor Topo — Point States & Traverse Support

## Context

Indoor climbing topos currently show route paths as polylines or circles with no per-hold metadata. Climbers need to mark:

- **Traverse routes**: paths where holds are numbered sequentially (1, 2, 3...) along the route
- **Point states**: whether a specific hold is a start, top, or match point
- These states are exclusive per point (neutral | start | top | match)

---

## 1. Data Model

**File**: `src/models/topo.model.ts`

Add new types and extend `TopoPath`:

```ts
export type PointState = "neutral" | "start" | "top" | "match";

export interface TopoPoint {
  x: number;
  y: number;
  state?: PointState; // default 'neutral'
}

export interface TopoPath {
  points: TopoPoint[];
  color?: string;
  width?: number;
  type?: "line" | "circle";
  isTraverse?: boolean;
  [key: string]: unknown;
}
```

Backward compatible: `TopoPoint` extends `{ x, y }` with optional `state`. Old data without `state` or `isTraverse` renders identically to today. No DB migration needed.

---

## 2. Editor Changes

**File**: `src/components/dialogs/topo-path-editor-dialog.ts`

### 2a. Traverse Toggle

New control in the sidebar bottom panel (alongside path type selector):

- Checkbox/button labeled "Traverse"
- Toggles `isTraverse` on the current path in `pathsMap`
- When enabled, circles along the path display sequential hold numbers (1, 2, 3...)

### 2b. Double-Tap to Cycle Point State

On control points (drag handles shown when a route is selected):

- Add `(dblclick)` handler on `<g class="control-point">` elements
- Cycle order: `neutral → start → top → match → neutral`
- Store state in `pathsMap` entry's point object: `point.state`

### 2c. Control Point Visual Feedback

When a point has a state, the control point inner circle changes fill color:

| State   | Color                 | Hex       |
| ------- | --------------------- | --------- |
| neutral | route color (current) | —         |
| start   | green                 | `#22C55E` |
| top     | red                   | `#EF4444` |
| match   | blue                  | `#3B82F6` |

### 2d. State Legend

Small legend row below the controls panel:

```
🟢 S = Start  |  🔴 T = Top  |  🔵 M = Match
```

---

## 3. Visualization Changes

**File**: `src/components/topo/topo-route-renderer.ts`

### 3a. Traverse Path Numbering

When `path.isTraverse === true`:

- Every circle point shows its sequential index (1, 2, 3...) as white text inside the circle
- First point (start marker) shows **grade + hold number** (e.g. "6a · 1")
- Text sized proportionally to circle radius, with text-shadow for contrast

### 3b. Point State Markers

For each point with `state !== 'neutral'`:

- Draw a small colored badge above/inside the circle:
  - **start**: Green filled circle with "S" text
  - **top**: Red filled circle with "T" text
  - **match**: Blue filled circle with "M" text
- Badge offset slightly above the main circle to avoid overlapping the hold number

### 3c. End Dot Logic

Currently a white dot is drawn at the last point of polylines. For traverses, skip this if the last point has `state: 'top'` (the top marker replaces it).

---

## 4. File Changes Summary

| File                                                | What Changes                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/models/topo.model.ts`                          | Add `PointState`, `TopoPoint`; update `TopoPath`                                              |
| `src/components/dialogs/topo-path-editor-dialog.ts` | Traverse toggle, double-tap cycling, state legend, control point colors                       |
| `src/components/topo/topo-route-renderer.ts`        | Traverse numbering, state badges, end dot logic                                               |
| `src/utils/drawing.utils.ts`                        | `addPointToPath` initializes `state: 'neutral'`                                               |
| `src/utils/topo-styles.utils.ts`                    | Helper: `getPointStateColor(state: PointState): string`                                       |
| `src/i18n/en.json`, `src/i18n/es.json`              | Keys: `topos.editor.traverse`, `topos.legend.start`, `topos.legend.top`, `topos.legend.match` |

---

## 5. Rendering Reference

### Traverse mode (every point numbered)

```
○ 6a·1   ← start (green badge + grade + hold#)
  ○ 2    ← neutral (plain circle + number)
○ 3 M    ← match (blue badge + number)
  ○ 4    ← neutral
○ 5 T    ← top (red badge + number)
```

### Non-traverse mode (only state-marked points get badges)

```
○ 6a     ← start (green badge, grade shown)
○        ← neutral (no number, just circle)
○ M      ← match (blue badge)
○ T      ← top (red badge)
```

---

## 6. Backward Compatibility

- Old topos without `isTraverse` or `state` fields: `isTraverse` defaults to `false`, all points default to `neutral` → renders identically to current behavior
- Existing `{ x, y }` point objects are valid `TopoPoint` since `state` is optional
- No Supabase schema changes; everything stored in existing JSON `path` column

---

## 7. Decisions Made

| Question             | Answer                                              |
| -------------------- | --------------------------------------------------- |
| Number display       | Every point gets a number (hold order: 1, 2, 3...)  |
| State exclusivity    | One state per point (neutral, start, top, or match) |
| Double-tap scope     | Editor only (not viewer)                            |
| Marker style         | Colored icons/shapes (S=green, T=red, M=blue)       |
| Start marker content | Grade + hold number (e.g. "6a · 1")                 |
| Number meaning       | Hold order along the path (not route number)        |
