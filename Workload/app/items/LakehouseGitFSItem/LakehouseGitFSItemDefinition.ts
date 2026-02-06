/***
 * Metadata types for LakehouseGitFS
 * 
 * FILE REFERENCE STRATEGY:
 * - Files are stored as references in metadata (no immediate copying)
 * - physical_location points to the original file in the bound Lakehouse
 * - When changes are committed, modified files are saved to:
 *   /Files/.gitfs/{item_id}/Data/{commit_id}/{fileName}
 * - This allows version control without duplicating unchanged files
 */
export interface Repository {
  id: string;
  name: string;
  created_at: string; // ISO timestamp
}

export interface Branch {
  id: string;
  repository_id: string;
  name: string;
  head_commit_id: string | null;
  created_at: string; // ISO timestamp
}

export interface Commit {
  id: string;
  repository_id: string;
  branch_id: string;
  parent_commit_id: string | null;
  message: string | null;
  author: string | null;
  created_at: string; // ISO timestamp
}

export interface FileRecord {
  id: string;
  commit_id: string;
  file_path: string;
  physical_location: string;
  source_workspace_id: string | null;
  source_item_id: string | null;
  is_reference: boolean;
  size_bytes: number | null;
  created_at: string; // ISO timestamp
}

export interface GitMetadata {
  repositories: Repository[];
  branches: Branch[];
  commits: Commit[];
  files: FileRecord[];
}

/***
 * Interface representing the definition of a LakehouseGitFS item.
 * This information is stored in Fabric as Item definition. 
 * It will be returned once the item definition is loaded.
 */
export interface LakehouseGitFSItemDefinition  {
  lakehouseId?: string;           // ID of the selected Lakehouse
  lakehouseWorkspaceId?: string;  // Workspace ID required by OneLakeView
  isBinded?: boolean;             // Is lakehouse bound successfully
  metadata?: GitMetadata;         // Git repository metadata (repositories, branches, commits, files)
  message?: string;               // Optional message to display in the editor
}
