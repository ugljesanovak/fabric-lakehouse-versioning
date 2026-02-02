# LakehouseGitFS

**Git-like, zero-copy file versioning for Microsoft Fabric Lakehouse**, inspired by [lakeFS](https://lakefs.io/) and [duckdb-ui](https://github.com/frectonz/duckdb-ui).

---

## What Is It?

LakehouseGitFS is a Fabric workload item that brings **version control semantics** to **OneLake data files**. It enables data engineers and analysts to:

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
- **Repository tree navigation** with hierarchical structure (Repository → main → Files)
- **Commit-based versioning** with immutable file snapshots
- **Single branch** (`main`) for simplified workflows
- **OneLake persistence** for committed files

### Supported Formats
- CSV (text-based)
- Parquet (binary)

### Future Vision
- **Backend option** using Fabric SQL for metadata (multi-user, enterprise-grade)
- **Multi-branch support** with merge and diff capabilities
- **Cross-Lakehouse references** with true zero-copy semantics (OneLake shortcuts)
- **Commit graph visualization** for history exploration
- **Governance integration** with Fabric lineage and catalog
- **Policy-based commit validation** for data quality

---

## Why LakehouseGitFS?

### For Data Engineers
- **Reproducible snapshots** of query results for auditing and rollback
- **Familiar Git semantics** applied to data files
- **No infrastructure overhead** with frontend-first architecture

### For Analysts
- **Interactive SQL exploration** without leaving Fabric
- **Commit query outputs** to create versioned datasets
- **Explore commit history** to understand data evolution

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
- Metadata persisted item's definition in Fabric
- Committed files stored in `/Files/.gitfs/{item_id}/Data/{commit_id}/{file_name}`

**No Backend:**
- All logic runs client-side
- No Fabric SQL dependency in MVP
- Metadata persisted in item definition on Save

See [architecture.md](architecture.md) for technical details.

---

## Status

✅ **MVP Complete**  
- Repository management, SQL queries, commit workflow, OneLake persistence

🚀 **Future Enhancements**  
- Fabric SQL backend option, multi-branch, merge/diff, zero-copy with shortcuts

📚 **Documentation**  
- [architecture.md](architecture.md) - Technical decisions and component design
- [agent.md](agent.md) - Step-by-step rebuild instructions for developers
