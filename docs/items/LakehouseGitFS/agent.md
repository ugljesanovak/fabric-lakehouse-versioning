# LakehouseGitFS Rebuild Guide

**Step-by-step instructions for AI agents and developers to recreate the LakehouseGitFS item from scratch.**

---

## Objective

Create a **Fabric workload item named `LakehouseGitFS`** that provides **Git-like, zero-copy file versioning** for Lakehouse data, following the design in [readme.md](readme.md) and [architecture.md](architecture.md).

**Prerequisites:**
- Existing Fabric workload created with the Fabric Extensibility Toolkit
- Follow `.ai/commands/item/createItem.md` for item creation patterns
- Reference `docs/components/ItemEditor.md` for UX patterns

---

## Authoritative Context

**MUST READ before implementation:**

### Fabric AI & Item Creation
- `.ai/commands/item/createItem.md` - Item creation automation
- `.ai/context/fabric-workload.md` - Project structure and conventions
- `.ai/context/fabric.md` - Fabric platform understanding

### Item Editor & UI Components
- `docs/components/ItemEditor/` - All ItemEditor patterns
- `docs/components/ItemEditor.md` - ItemEditor overview
- `docs/components/OneLakeView.md` - OneLakeView integration
- `docs/components/README.md` - Component usage guidelines

### Fabric UX System
- `docs/FabricUX_MCP_Server.md` - UX validation and compliance
- 100% design token compliance required (no inline styles, no hardcoded colors)

---

## Design Constraints (Non-Negotiable)

✅ **MUST HAVE:**
- Frontend-first architecture (no backend services)
- DuckDB WASM for query execution only (not metadata storage)
- Metadata stored in item's definition (LakehouseGitFSItemModel.metadata)
- Single branch only: `main`
- CSV and Parquet support only
- OneLake persistence for committed files
- 100% Fabric UX System compliance (design tokens, makeStyles)

❌ **MUST NOT HAVE (in MVP):**
- Backend services
- Fabric SQL dependency
- Multi-branch support
- Merge/diff capabilities
- Real-time collaboration

---

## Step-by-Step Implementation

### Step 1: Create Item Skeleton

**Tool:** `scripts/Setup/CreateNewItem.ps1`

```powershell
.\scripts\Setup\CreateNewItem.ps1 -ItemName "LakehouseGitFS"
```

**Verification:**
- 4 files created:
  - `LakehouseGitFSItemModel.ts` (data model)
  - `LakehouseGitFSItemEditor.tsx` (editor container)
  - `LakehouseGitFSItemEditorEmpty.tsx` (empty state)
  - `LakehouseGitFSItemEditorRibbon.tsx` (ribbon actions)
- Item registered in workload routes

---

### Step 2: Define Data Model

**File:** `Workload/app/items/LakehouseGitFSItem/LakehouseGitFSItemModel.ts`

```typescript
export interface LakehouseGitFSItemModel extends BaseModel {
  lakehouseWorkspaceId?: string;
  lakehouseItemId?: string;
  metadata?: {
    repositories: Repository[];
    branches: Branch[];
    commits: Commit[];
  };
}

export interface Repository {
  id: string;
  name: string;
  created_at: number;
}

export interface Branch {
  id: string;
  repository_id: string;
  name: string;
  head_commit_id?: string;
  created_at: number;
}

export interface Commit {
  id: string;
  branch_id: string;
  message: string;
  parent_commit_id?: string;
  created_at: number;
}

export interface FileRecord {
  id: string;
  commit_id: string;
  file_path: string;
  physical_location: string;
  source_workspace_id?: string;
  source_item_id?: string;
  is_reference: boolean;
  size_bytes: number;
  created_at: number;
}
```

---

### Step 3: Set Up ItemEditor Layout

**File:** `Workload/app/items/LakehouseGitFSItem/LakehouseGitFSItemEditor.tsx`

**Pattern:** ItemEditorDefaultView with two-panel layout

```typescript
import { ItemEditorDefaultView } from '../../components/ItemEditor/ItemEditorDefaultView';

const LakehouseGitFSItemEditor: React.FC = () => {
  return (
    <ItemEditorDefaultView
      left={{
        title: 'Repositories',
        content: <RepositoryExplorer />,
        collapsible: false,
        width: 300
      }}
      center={{
        content: <FileQueryPanel />
      }}
    />
  );
};
```

**Dependencies:**
- Create `RepositoryExplorer.tsx` (Step 6)
- Create `FileQueryPanel.tsx` (Step 7)

---

### Step 4: Implement Ribbon Actions

**File:** `Workload/app/items/LakehouseGitFSItem/LakehouseGitFSItemEditorRibbon.tsx`

**Pattern:** Static `homeToolbarActions` array with state-driven enablement

```typescript
import { createSaveAction, createSettingsAction } from '../../components/ItemEditor';
import type { ItemEditorRibbonProps } from '../../components/ItemEditor';

export const createLakehouseGitFSItemEditorRibbon = (
  props: ItemEditorRibbonProps<LakehouseGitFSItemModel>
): ItemEditorRibbon => {
  const { itemContext } = props;
  const hasLakehouse = !!itemContext.lakehouseItemId;
  const hasPinnedFile = !!itemContext.pinnedFile;

  return {
    homeToolbarActions: [
      createSaveAction(props),
      createSettingsAction(props),
      {
        id: 'open-lakehouse',
        label: 'Open Lakehouse',
        icon: <Database20Regular />,
        disabled: !hasLakehouse,
        onClick: () => { /* Open OneLakeView */ }
      },
      {
        id: 'commit',
        label: 'Commit',
        icon: <ArrowUpload20Regular />,
        disabled: !hasPinnedFile,
        onClick: () => { /* Open commit dialog */ }
      },
      {
        id: 'branch-selector',
        label: 'Branch: main',
        icon: <BranchFork20Regular />,
        disabled: !hasPinnedFile,
        readonly: true
      }
    ]
  };
};
```

**State transitions:**
- No Lakehouse: Only `Settings` enabled
- Lakehouse bound: `Save`, `Open Lakehouse` enabled
- File pinned: All actions enabled

---

### Step 5: Implement Empty State (Lakehouse Binding)

**File:** `Workload/app/items/LakehouseGitFSItem/LakehouseGitFSItemEditorEmpty.tsx`

**Pattern:** ItemEditorEmptyView for initial setup

```typescript
import { ItemEditorEmptyView } from '../../components/ItemEditor';

const LakehouseGitFSItemEditorEmpty: React.FC = () => {
  const handleAddDataSource = () => {
    // Open OneLakeView for Lakehouse selection
    // On selection:
    // 1. Save lakehouseWorkspaceId and lakehouseItemId to model
    // 2. Initialize metadata arrays (repositories, branches, commits, files)
    // 3. Save item definition
    // 4. Show success notification
  };

  return (
    <ItemEditorEmptyView
      title="Add Data Source"
      description="Select a Lakehouse to start versioning files"
      primaryAction={{
        label: 'Add Lakehouse',
        onClick: handleAddDataSource
      }}
    />
  );
};
```

---

### Step 6: Implement RepositoryExplorer (Left Panel)

**File:** `Workload/app/items/LakehouseGitFSItem/components/RepositoryExplorer.tsx`

**Purpose:** 2-level tree navigation (Repository → Branch → Files)

**Key features:**
- Load repositories from item model metadata (itemContext.metadata.repositories)
- Render tree structure with expand/collapse
- Single-select file → notify parent (FileQueryPanel)
- Use design tokens for spacing (tree indentation)

**Data access:**
```typescript
// Access metadata from item model
const repositories = itemContext.metadata?.repositories || [];
const branches = itemContext.metadata?.branches.filter(b => b.repository_id === repoId) || [];
const files = itemContext.metadata?.files.filter(f => {
  const commit = itemContext.metadata?.commits.find(c => c.id === f.commit_id);
  return commit?.branch_id === branchId;
}) || [];
```

**Styling:** `makeStyles` with `tokens.spacingHorizontalM` for padding

---

### Step 7: Implement FileQueryPanel (Main Panel)

**File:** `Workload/app/items/LakehouseGitFSItem/components/FileQueryPanel.tsx`

**Purpose:** SQL editor + results grid + commit workflow

**Components to use:**
- `SQLEditor` from `Workload/app/components/SQLEditor/SQLEditor.tsx`
- `ResultsGrid` from `Workload/app/components/ResultsGrid/ResultsGrid.tsx`

**DuckDB lifecycle:**
1. **Load file:**
   ```typescript
   const db = await createDuckDB();
   await db.insertCSVFromPath(file.physical_location, 'data');
   ```

2. **Execute query:**
   ```typescript
   const result = await db.connection.query(sqlText);
   setResults(result.toArray());
   ```

3. **Commit workflow:**
   ```typescript
   // 1. Materialize query results
   const commitId = generateUUID();
   const fileName = `${commitId}.csv`; // or .parquet
   const targetPath = `/Files/.gitfs/${itemId}/Data/${commitId}/${fileName}`;
   
   // 2. Write to OneLake
   const itemWrapper = oneLakeClient.createItemWrapper({
     id: lakehouseItemId,
     workspaceId: lakehouseWorkspaceId
   });
   await itemWrapper.writeFileAsText(targetPath, csvData);
   
   // 3. Create commit record in item model
   const newCommit: Commit = {
     id: commitId,
     branch_id: branchId,
     message: commitMessage,
     created_at: Date.now(),
     parent_commit_id: currentBranch.head_commit_id
   };
   
   // 4. Create file record
   const newFile: FileRecord = {
     id: generateUUID(),
     commit_id: commitId,
     file_path: fileName,
     physical_location: targetPath,
     is_reference: false,
     size_bytes: csvData.length,
     created_at: Date.now()
   };
   
   // 5. Update item model
   updateItemContext({
     metadata: {
       ...itemContext.metadata,
       commits: [...itemContext.metadata.commits, newCommit],
       files: [...itemContext.metadata.files, newFile],
       branches: itemContext.metadata.branches.map(b =>
         b.id === branchId ? { ...b, head_commit_id: commitId } : b
       )
     }
   });
   
   // 6. Save item definition (persists metadata)
   await saveItem();
   ```

4. **Cleanup:**
   ```typescript
   await db.close();
   ```

**Styling:** 100% design tokens (no inline styles)

---

### Step 8: Metadata Management Utilities

**Create utility:** `Workload/app/items/LakehouseGitFSItem/utils/MetadataHelpers.ts`

**Metadata operations:**
```typescript
export const createRepository = (name: string): Repository => ({
  id: generateUUID(),
  name,
  created_at: Date.now()
});

export const createBranch = (repositoryId: string): Branch => ({
  id: generateUUID(),
  repository_id: repositoryId,
  name: 'main',
  created_at: Date.now()
});

export const createCommit = (
  branchId: string,
  message: string,
  parentCommitId?: string
): Commit => ({
  id: generateUUID(),
  branch_id: branchId,
  message,
  created_at: Date.now(),
  parent_commit_id: parentCommitId
});

export const createFileRecord = (
  commitId: string,
  filePath: string,
  physicalLocation: string,
  sizeBytes: number
): FileRecord => ({
  id: generateUUID(),
  commit_id: commitId,
  file_path: filePath,
  physical_location: physicalLocation,
  is_reference: false,
  size_bytes: sizeBytes,
  created_at: Date.now()
});

// Query helpers
export const getRepositoryBranches = (
  metadata: LakehouseGitFSItemModel['metadata'],
  repositoryId: string
): Branch[] => {
  return metadata?.branches.filter(b => b.repository_id === repositoryId) || [];
};

export const getBranchFiles = (
  metadata: LakehouseGitFSItemModel['metadata'],
  branchId: string
): FileRecord[] => {
  const commits = metadata?.commits.filter(c => c.branch_id === branchId) || [];
  const commitIds = new Set(commits.map(c => c.id));
  return metadata?.files.filter(f => commitIds.has(f.commit_id)) || [];
};
```

---

### Step 9: Implement UX Compliance (Design Tokens)

**Apply 100% design token coverage to all components:**

**Example (RepositoryExplorer.tsx):**
```typescript
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground1
  },
  treeItem: {
    paddingLeft: tokens.spacingHorizontalL, // Tree indentation
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2
    }
  },
  header: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300
  }
});
```

**NO inline styles except dynamic values:**
```typescript
// ✅ ALLOWED (dynamic based on tree depth):
style={{ paddingLeft: `${depth * 16}px` }}

// ❌ FORBIDDEN (use design tokens):
style={{ padding: '12px', backgroundColor: '#f5f5f5' }}
```

---

### Step 10: Add CommitGraph Component (Optional Enhancement)

**File:** `Workload/app/items/LakehouseGitFSItem/components/CommitGraph.tsx`

**Purpose:** Timeline visualization of commit history

**Features:**
- Chronological commit list with dots/lines
- Relative timestamps ("2 hours ago")
- Commit messages and metadata
- Empty state when no commits

**Styling:** Already 100% compliant if copied from existing implementation

---

### Step 11: Testing Checklist

**Lakehouse Initialization:**
- [ ] OneLakeView opens for Lakehouse selection
- [ ] Item model initialized with empty metadata arrays
- [ ] Item definition saved successfully
- [ ] Success notification shown

**Repository Management:**
- [ ] Add repository updates item model metadata
- [ ] Repository tree renders correctly from item model
- [ ] Default `main` branch auto-created in model

**File Workflow:**
- [ ] File selection loads into FileQueryPanel
- [ ] SQL queries execute successfully
- [ ] Results grid displays data
- [ ] CSV and Parquet formats supported

**Commit Workflow:**
- [ ] Commit button disabled until file pinned
- [ ] Commit dialog accepts message
- [ ] File materialized to OneLake (`/Files/.gitfs/{item_id}/Data/{commit_id}/`)
- [ ] Commit and file records added to item model
- [ ] Branch HEAD updated in item model
- [ ] Repository tree refreshes from updated model

**Save/Reload:**
- [ ] Save persists item definition with metadata
- [ ] Reload restores repository tree from item model
- [ ] Metadata arrays correctly populated on reload

**Ribbon States:**
- [ ] No Lakehouse: Only Settings enabled
- [ ] Lakehouse bound: Save, Open Lakehouse enabled
- [ ] File pinned: All actions enabled

**UX Compliance:**
- [ ] Zero inline styles (except dynamic values)
- [ ] All colors use design tokens
- [ ] All spacing uses design tokens
- [ ] 100% Fabric UX System compliance

---

## Dependencies

**DuckDB (query execution only):**
```json
{
  "@duckdb/duckdb-wasm": "^1.28.0"
}
```

**Fluent UI v9:**
```json
{
  "@fluentui/react-components": "^9.x.x",
  "@fluentui/react-icons": "^2.x.x"
}
```

**OneLake Client:**
- Use existing `OneLakeStorageClient` from `Workload/app/clients/`
- ALWAYS use `createItemWrapper` pattern (never construct paths manually)

---

## Reference Implementations

**Similar items to study:**
- `Workload/app/items/LakehouseFileGitItem/` - DuckDB query execution patterns
- `Workload/app/components/SQLEditor/` - SQL editor component
- `Workload/app/components/ResultsGrid/` - Results grid component
- `Workload/app/components/ItemEditor/` - ItemEditor patterns
- Any item using `BaseModel` - Metadata in item definition patterns

---

## Common Pitfalls

❌ **DON'T:**
- Use inline styles (violates Fabric UX compliance)
- Create multiple DuckDB instances without cleanup (memory leaks)
- Store absolute OneLake paths in metadata (use relative paths)
- Mutate item model metadata directly (use immutable updates)
- Forget to save item definition after metadata changes
- Implement multi-branch features (MVP constraint)

✅ **DO:**
- Use `makeStyles` with design tokens for ALL styling
- Tear down DuckDB instances after query execution
- Use `createItemWrapper` for OneLake operations
- Update item model immutably (spread operators)
- Save item definition after metadata changes
- Follow progressive ribbon enablement pattern

---

## Success Criteria

**MVP Complete when:**
- ✅ Lakehouse binding workflow functional
- ✅ Repository tree navigation working (from item model)
- ✅ SQL queries execute on CSV/Parquet files (DuckDB)
- ✅ Commit workflow materializes files to OneLake
- ✅ Metadata persistence in item definition working (save/reload)
- ✅ 100% Fabric UX System compliance
- ✅ Zero TypeScript errors
- ✅ All ribbon states working correctly

---

## Future Enhancements (NOT for MVP)

- Backend option with Fabric SQL metadata store
- Multi-branch support (create, switch, merge)
- Commit diff (schema and data comparison)
- Zero-copy with OneLake shortcuts
- Governance integration (lineage, catalog)

See [readme.md](readme.md#future-vision) for roadmap.
