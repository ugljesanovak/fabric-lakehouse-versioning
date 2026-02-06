# Version Controlled Lakehouse (LakehouseGitFS)

**Git-like, zero-copy file versioning for Microsoft Fabric Lakehouse**, inspired by [lakeFS](https://lakefs.io/) and [duckdb-ui](https://github.com/frectonz/duckdb-ui).

> **Note:** This item appears as **Version Controlled Lakehouse** in the Fabric UI (internal code name: `LakehouseGitFS`).

---

## What Is It?

Version Controlled Lakehouse is a Fabric workload item that brings **version control semantics** to **OneLake data files**. It enables data engineers and analysts to:

- Browse and query Lakehouse files (CSV and Parquet) using SQL
- Commit query results as immutable file versions  
- Navigate repositories with a familiar Git-like structure (Repository → Branch → Files → Commits)
- Explore data interactively in the browser without backend services

**Design Philosophy:**
- **Frontend-first**: No backend services, all logic runs in the browser
- **Zero-copy**: Files are referenced through metadata, not duplicated (MVP copies, future zero-copy)
- **Metadata-driven**: Item definition stores repository structure, branches, and commit history
- **Fabric-native**: Built using the Fabric Extensibility Toolkit with full OneLake integration

---

## Key Features

### Current (MVP)
- **SQL exploration** powered by DuckDB WASM running in the browser
- **Repository tree navigation** with hierarchical structure (Repository → Branches → Files)
- **Git-like commit model** with parent commit tracking and snapshot-based versioning
- **Multi-branch support** with branch creation, switching, and deletion
- **Commit graph visualization** with parent-child relationships (GitHub/GitKraken-inspired)
- **Interactive commit history** with visual timeline and file explorer
- **Immutable snapshots** storing complete repository state per commit (like Git/lakeFS)
- **OneLake persistence** for committed files
- **Branch operations** including create branch from any commit

### Supported Formats
- CSV (text-based)
- Parquet (binary)

### Future Vision
- **Backend option** using Fabric SQL for metadata (multi-user, enterprise-grade)
- **Merge capabilities** with conflict resolution between branches
- **Diff visualization** showing changes between commits and branches
- **Cross-Lakehouse references** with true zero-copy semantics (OneLake shortcuts)
- **Governance integration** with Fabric lineage and catalog
- **Policy-based commit validation** for data quality
- **Content-based deduplication** for efficient storage

---

## Why LakehouseGitFS?

### For Data Engineers
- **Reproducible snapshots** of query results for auditing and rollback
- **Familiar Git semantics** applied to data files (commits, branches, parent tracking)
- **No infrastructure overhead** with frontend-first architecture
- **Branch experimentation** isolate changes without affecting main branch
- **Visual commit history** understand data lineage through graph visualization

### For Analysts
- **Interactive SQL exploration** without leaving Fabric
- **Commit query outputs** to create versioned datasets
- **Explore commit history** with visual graph and file navigation
- **Time travel queries** access any previous version through commit history
- **Branch workflows** work on experimental queries in isolated branches

### For Organizations
- **Auditability**: Immutable commit history for compliance
- **Discoverability**: Navigate data like code repositories
- **Scalability**: Clear path from browser-based MVP to enterprise backend

---

## Design Influences

### lakeFS
- **Inspiration**: Git-like version control for data lakes
- **Applied**: Repository/branch/commit model, zero-copy philosophy
- **Difference**: Frontend-first MVP with browser-based metadata store

### duckdb-ui
- **Inspiration**: Interactive SQL exploration in the browser
- **Applied**: DuckDB WASM for client-side query execution
- **Difference**: Integrated with Fabric OneLake and commit workflows

---

## Architecture Highlights

**Frontend:**
- React + Fluent UI v9 (100% Fabric UX System compliance)
- ItemEditor layout (Ribbon + Left Panel + Main Panel)
- OneLakeView for Lakehouse/file selection

**Data Layer:**
- DuckDB WASM (in-memory during session)
- Metadata persisted in item's definition in Fabric
- Git-like commit model with parent tracking for complete history
- Snapshot-based commits (entire repository state per commit, like Git)
- Committed files stored in `/Files/.gitfs/{item_id}/Data/{commit_id}/{file_name}`

**No Backend:**
- All logic runs client-side
- No Fabric SQL dependency in MVP
- Metadata persisted in item definition on Save

See [architecture.md](architecture.md) for technical details.

---

## Status

✅ **MVP Complete**  
- Repository management with multi-branch support
- SQL queries with DuckDB WASM
- Git-like commit workflow with parent tracking
- Commit graph visualization with parent-child relationships
- Branch operations (create, switch, delete)
- OneLake persistence with snapshot model

🚀 **Future Enhancements**  
- Fabric SQL backend option for multi-user scenarios
- Merge capabilities with conflict resolution
- Diff visualization between commits/branches
- Zero-copy with OneLake shortcuts

📚 **Documentation**  
- [architecture.md](architecture.md) - Technical decisions and component design
- [agent.md](agent.md) - Step-by-step rebuild instructions for developers
