# LakehouseGitFS Architecture

**Technical decisions and component design for Git-like file versioning in Microsoft Fabric.**

---

## Design Principles

- **Frontend-first**: All logic runs in the browser, no backend services
- **Zero-copy philosophy**: Metadata references files, not duplicate storage (MVP copies, future shortcuts)
- **Metadata-driven state**: Item definition stores repository structure, branches, commits
- **Fabric-native lifecycle**: Follows ItemEditor patterns, OneLake persistence, Ribbon UX
- **Separation of concerns**: Metadata layer decoupled from data layer

---

## Architecture Layers

### 1. Fabric Item UI (Frontend)
- **Framework**: React + TypeScript, Fluent UI v9 (100% Fabric UX System compliance)
- **Layout**: ItemEditor with Ribbon + Left Panel (RepositoryExplorer) + Main Panel (FileQueryPanel)
- **Components**:
  - `LakehouseGitFSItemDefaultView` - Main container with ItemEditorDefaultView two-panel layout
  - `RepositoryExplorer` - 2-level tree (Repository → Branch → Files)
  - `FileQueryPanel` - SQL editor + results grid + commit workflow
- **State management**: Ribbon-driven progressive enablement (Settings → Save → Commit)

### 2. Client-Side Execution Layer
- **DuckDB WASM** (v1.28.0): In-browser SQL engine for querying CSV/Parquet files
- **Session-scoped instances**: Fresh DuckDB instance per file query (torn down after query execution)
- **No backend dependency**: All SQL execution happens client-side

### 3. OneLake Persistence Layer
- **Committed files**: Immutable snapshots in `/Files/.gitfs/{item_id}/Data/{commit_id}/{file_name}`
- **OneLake APIs**: `writeFileAsText` (CSV), `writeFileAsBase64` (Parquet), `createItemWrapper` pattern

---

## Metadata Model

**Storage:** All metadata stored in item's definition (`LakehouseGitFSItemModel.metadata`), persisted on Save.

### Repository
Logical container for versioned files.

**TypeScript Interface:**
```typescript
interface Repository {
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Branch
Logical pointer to commit history. **MVP constraint: Single branch `main` only.**

**TypeScript Interface:**
```typescript
interface Branch {
  id: string;
  repository_id: string;
  name: string;
  head_commit_id?: string;
  created_at: number;
}
```

### Commit
Immutable reference to a file version.

**TypeScript Interface:**
```typescript
interface Commit {
  id: string;
  branch_id: string;
  message: string;
  created_at: number;
  parent_commit_id?: string;
}
```

### File
Physical file location and metadata.

**TypeScript Interface:**
```typescript
interface FileRecord {
  id: string;
  commit_id: string;
  file_path: string;              // Original filename
  physical_location: string;      // OneLake path
  source_workspace_id?: string;   // Source lakehouse workspace
  source_item_id?: string;        // Source lakehouse item
  is_reference: boolean;          // Future zero-copy flag
  size_bytes: number;
  created_at: number;
}
```

---

## Storage Layout

### Metadata Persistence
**Location:** Item's definition (`LakehouseGitFSItemModel.metadata`)  
**Persistence triggers:** Save action

**Structure:**
```typescript
export interface GitMetadata {
  repositories: Repository[];
  branches: Branch[];
  commits: Commit[];
  files: FileRecord[];
}
```

### Data Persistence (Commits)
```
/Files/.gitfs/{item_id}/Data/{commit_id}/{original_filename}.csv|parquet
```
**Characteristics**:
- Immutable (never modified after commit)
- Preserves original filenames for discoverability
- Supports multiple files per commit folder (future)
- Prepared for zero-copy shortcuts (future)

---

## Component Details

### LakehouseGitFSItemDefaultView
- **Purpose**: Main container orchestrating two-panel layout
- **Layout**: ItemEditorDefaultView with left panel (RepositoryExplorer) + center panel (FileQueryPanel)
- **State management**: 
  - Lakehouse binding workflow (initial CTA → OneLakeView selection)
  - Repository/branch/file selection state
- **Ribbon actions**: `homeToolbarActions` (Save, Settings, Open Lakehouse, Commit, Branch selector)
- **Design tokens**: 100% compliance (no inline styles, all `makeStyles` with token references)

### RepositoryExplorer
- **Purpose**: 2-level tree navigation
- **Structure**: Repository → Branch (main) → Files
- **Data source**: Item model metadata (repositories, branches, files arrays)
- **UX pattern**: Always visible, disabled until Lakehouse bound
- **Styling**: `makeStyles` with spacing tokens (paddingLeft for tree hierarchy)
- **Interaction**: Single-select file → loads in FileQueryPanel

### FileQueryPanel
- **Purpose**: SQL editor + results grid + commit workflow
- **Features**:
  - Monaco SQL editor with syntax highlighting
  - Query execution against DuckDB WASM (fresh instance per file)
  - Results grid with column headers
  - Commit dialog with message input
  - Format preservation (CSV/Parquet based on source)
- **DuckDB lifecycle** (query execution only):
  1. User selects file from RepositoryExplorer
  2. Load file into fresh DuckDB instance
  3. Execute SQL queries
  4. On commit: materialize results to OneLake, update item model metadata
  5. Tear down DuckDB instance
- **Styling**: 100% design token compliance

### CommitGraph
- **Purpose**: Timeline visualization of commit history
- **Features**:
  - Chronological display with relative timestamps
  - Commit messages and metadata
  - Empty state handling
- **Status**: Already 100% UX compliant (no refactoring needed)

---

## Session Lifecycle

1. **Item opened**
   - Metadata initialized from item's definition
   - Restore repository tree state

2. **User interaction**
   - Select Lakehouse via OneLakeView
   - Browse repositories/branches/files
   - Execute SQL queries (ephemeral DuckDB instances)

3. **Save / session end**
   - Persist metadata to item's definition
   - Tear down all DuckDB instances

---

## Ribbon State Machine

| State | Settings | Save | Open Lakehouse | Commit | Branch |
|-------|----------|------|----------------|--------|--------|
| **No Lakehouse** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Lakehouse bound** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **File pinned** | ✅ | ✅ | ✅ | ✅ | ✅ (read-only, `main`) |

**Implementation**: Progressive enablement pattern with state-driven `disabled` props

---

## Zero-Copy Strategy

### MVP (Copy-Based)
- All files copied to commit folders on commit
- `is_reference = false` in file metadata
- Tracks source workspace/lakehouse for future optimization

### Future (True Zero-Copy)
- When `source_lakehouse == bound_lakehouse`:
  - Set `is_reference = true`
  - Use OneLake shortcuts instead of copying
  - `physical_location` points to original file path
- Supports cross-Lakehouse references with smart copy/shortcut logic

---

## Fabric UX Compliance

### Design Tokens
- **Spacing**: `tokens.spacingVerticalS/M/L`, `tokens.spacingHorizontalS/M/L`
- **Colors**: `tokens.colorNeutralBackground1/2`, `tokens.colorNeutralStroke1/2`
- **Typography**: `tokens.fontWeightSemibold`, `tokens.fontSizeBase300`
- **Border**: `tokens.borderRadiusMedium`

### Patterns
- **makeStyles**: All styling via `makeStyles` from `@fluentui/react-components`
- **shorthands**: `shorthands.padding()`, `shorthands.borderBottom()`
- **Zero inline styles**: Except dynamic values (e.g., tree indentation based on depth)

### WCAG 2.1 AA
- Maintained through Fluent UI v9 default token system
- No hardcoded colors that could violate contrast ratios

---

## Influences from lakeFS and duckdb-ui

### lakeFS
- **Repository/Branch/Commit model**: Directly adapted for Fabric OneLake
- **Zero-copy philosophy**: Metadata-driven versioning, future OneLake shortcuts
- **Difference**: Frontend-first MVP vs. lakeFS backend architecture

### duckdb-ui
- **Browser-based SQL**: DuckDB WASM for client-side execution
- **Interactive exploration**: SQL editor + results grid pattern
- **Difference**: Integrated with Fabric OneLake storage and commit workflows

---

## Security & Isolation

- **Access control**: Governed by Fabric item permissions
- **OneLake scope**: DuckDB operates only on authorized OneLake paths via `createItemWrapper`
- **Metadata isolation**: Scoped to item ID and selected Lakehouse
- **No cross-contamination**: Session-scoped DuckDB instances prevent state leakage

---

## Evolution Path

### Phase 1 (MVP) ✅
- Frontend-first, browser-based metadata
- Single branch (`main`)
- CSV/Parquet commit snapshots
- SQL exploration with DuckDB WASM

### Phase 2 (Future)
- **Backend option**: Fabric SQL metadata store for multi-user concurrency
- **Multi-branch**: Branch creation, switching, merge
- **Zero-copy shortcuts**: OneLake shortcuts for same-Lakehouse files
- **Commit diff**: Schema and data comparison
- **Graph visualization**: Enhanced commit history UI

### Phase 3 (Enterprise)
- **Governance integration**: Fabric lineage, catalog, purview
- **Policy validation**: Pre-commit data quality checks
- **Deduplication**: Content-based file hashing
- **Cross-workspace references**: Smart federation across Fabric workspaces

---

## Architectural Tradeoffs

### Why Frontend-First?
- ✅ Faster time to value (no backend deployment)
- ✅ Lower operational complexity (no service management)
- ✅ Easier iteration (frontend-only changes)
- ✅ Fabric-native item lifecycle
- ⚠️ Limited to single-user scenarios (no real-time collaboration)

### Why DuckDB WASM?
- ✅ Embedded, lightweight, no backend needed
- ✅ Excellent SQL support (Parquet, CSV, complex queries)
- ✅ WASM compatibility (runs in any browser)
- ✅ Proven in similar tools (duckdb-ui, Observable)
- ⚠️ Memory constraints for very large files (browser limits)

### Why OneLake Only?
- ✅ Tight Fabric integration
- ✅ No external dependencies
- ✅ Unified storage model
- ⚠️ Coupled to OneLake availability and performance

---

## Summary

LakehouseGitFS delivers a **frontend-first, metadata-driven Git-like versioning system** for Fabric Lakehouse files, achieving:
- 100% Fabric UX System compliance
- Zero backend dependencies in MVP
- Clear path to enterprise-grade backend evolution
- Inspiration from lakeFS (versioning model) and duckdb-ui (browser SQL)
