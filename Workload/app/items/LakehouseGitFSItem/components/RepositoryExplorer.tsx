import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Tree,
  TreeItem,
  TreeItemLayout,
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  DialogContent,
  Input,
  Label,
  Tooltip,
  tokens,
  makeStyles,
  shorthands,
} from "@fluentui/react-components";
import {
  Add20Regular,
  Database20Regular,
  BranchFork20Regular,
  Document20Regular,
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { GitMetadata, FileRecord } from "../LakehouseGitFSItemDefinition";

const useStyles = makeStyles({
  container: {
    ...shorthands.padding(tokens.spacingVerticalS),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalS,
    ...shorthands.padding('0', '0', tokens.spacingVerticalS, '0'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
  },
  headerTitle: {
    fontWeight: tokens.fontWeightSemibold,
    flex: 1,
  },
  treeContainer: {
    flex: 1,
    ...shorthands.overflow('auto'),
  },
  emptyState: {
    ...shorthands.padding(tokens.spacingVerticalXL),
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface RepositoryExplorerProps {
  workloadClient: WorkloadClientAPI;
  metadata: GitMetadata;
  itemId: string;
  onAddFile?: (repositoryId: string, branchId: string) => Promise<void>;
  onMetadataChange?: (updater: (prev: GitMetadata) => GitMetadata) => void;
  onSave?: () => Promise<void>;
  onSelectFile?: (file: FileRecord, branchId: string) => void;
  onSelectBranch?: (branch: any) => void;
  refreshTrigger?: number;
}

export const RepositoryExplorer: React.FC<RepositoryExplorerProps> = ({
  workloadClient,
  metadata,
  itemId,
  onAddFile,
  onMetadataChange,
  onSave,
  onSelectFile,
  onSelectBranch,
  refreshTrigger,
}) => {
  const { t } = useTranslation();
  const styles = useStyles();
  const [createRepoOpen, setCreateRepoOpen] = useState(false);
  const [repoName, setRepoName] = useState("");

  // Extract data directly from metadata prop
  const repositories = metadata.repositories;
  const branches = metadata.branches;
  const files = metadata.files;

  const handleCreateRepo = async () => {
    if (!repoName.trim() || !onMetadataChange) return;

    try {
      const repoId = crypto.randomUUID();
      const branchId = crypto.randomUUID();
      const now = new Date().toISOString();

      console.log('[RepositoryExplorer] 📝 Creating repository:', { repoId, repoName: repoName.trim() });
      console.log('[RepositoryExplorer] 📊 Metadata BEFORE update:', {
        repoCount: metadata.repositories.length,
        branchCount: metadata.branches.length
      });
      
      // Create repository and default branch
      onMetadataChange((prev) => {
        const updated = {
          ...prev,
          repositories: [...prev.repositories, {
            id: repoId,
            name: repoName.trim(),
            created_at: now
          }],
          branches: [...prev.branches, {
            id: branchId,
            repository_id: repoId,
            name: 'main',
            head_commit_id: null,
            created_at: now
          }]
        };
        console.log('[RepositoryExplorer] 🔄 Metadata updated in state:', {
          repoCount: updated.repositories.length,
          branchCount: updated.branches.length
        });
        return updated;
      });
      
      console.log('[RepositoryExplorer] ⏳ Waiting for onSave to complete...');
      
      // Auto-persist after mutation
      if (onSave) {
        await onSave();
        console.log('[RepositoryExplorer] ✅ onSave completed');
      }

      console.log('[RepositoryExplorer] 📊 Metadata AFTER save:', {
        repoCount: metadata.repositories.length,
        branchCount: metadata.branches.length,
        branchesForNewRepo: metadata.branches.filter(b => b.repository_id === repoId).length
      });
      
      // Reset form
      setRepoName("");
      setCreateRepoOpen(false);
    } catch (error) {
      console.error('[RepositoryExplorer] Failed to create repository:', error);
    }
  };

  const handleAddFile = async (repoId: string, branchId: string) => {
    if (onAddFile) {
      await onAddFile(repoId, branchId);
      // Note: Parent component should increment refreshTrigger after successful file addition
    }
  };

  const getAllFilesForBranch = (branchId: string): FileRecord[] => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch || !branch.head_commit_id) return [];

    // With snapshot model, HEAD commit contains complete repository state
    // Just get all files from the HEAD commit
    return files.filter(f => f.commit_id === branch.head_commit_id);
  };

  return (
    <div className={styles.container}>
      {/* Header with Add Repository button */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>
          {t('LakehouseGitFS_Repositories_Label', 'Repositories')}
        </span>
        <Dialog open={createRepoOpen} onOpenChange={(_, d) => setCreateRepoOpen(d.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Tooltip content={t('LakehouseGitFS_AddRepository_Tooltip', 'Add Repository')} relationship="label">
              <Button
                icon={<Add20Regular />}
                appearance="subtle"
                size="small"
                aria-label={t('LakehouseGitFS_AddRepository_Label', 'Add Repository')}
              />
            </Tooltip>
          </DialogTrigger>
          <DialogSurface>
            <DialogBody>
              <DialogTitle>{t('LakehouseGitFS_CreateRepository_Title', 'Create Repository')}</DialogTitle>
              <DialogContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Label htmlFor="repo-name-input" required>
                    {t('LakehouseGitFS_RepositoryName_Label', 'Repository Name')}
                  </Label>
                  <Input
                    id="repo-name-input"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder={t('LakehouseGitFS_RepositoryName_Placeholder', 'Enter repository name')}
                    autoFocus
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" onClick={() => setCreateRepoOpen(false)}>
                  {t('Cancel_Label', 'Cancel')}
                </Button>
                <Button appearance="primary" onClick={handleCreateRepo} disabled={!repoName.trim()}>
                  {t('Create_Label', 'Create')}
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>

      {/* Tree View */}
      <div className={styles.treeContainer}>
        {repositories.length === 0 ? (
          <div className={styles.emptyState}>
            {t('LakehouseGitFS_NoRepositories_Message', 'No repositories yet. Click + to create one.')}
          </div>
        ) : (
          <Tree aria-label={t('LakehouseGitFS_RepositoryTree_Label', 'Repository Tree')}>
            {repositories.map(repo => {
              const repoKey = `repo-${repo.id}`;
              const repoBranches = metadata.branches.filter(b => b.repository_id === repo.id);

              return (
                <TreeItem
                  key={repoKey}
                  itemType={repoBranches.length > 0 ? "branch" : "leaf"}
                  value={repoKey}
                >
                  <TreeItemLayout iconBefore={<Database20Regular />}>
                    {repo.name}
                  </TreeItemLayout>

                  {repoBranches.length > 0 && (
                    <Tree>
                      {repoBranches.map(branch => {
                        const branchFiles = getAllFilesForBranch(branch.id);
                        
                        return (
                          <TreeItem
                            key={`branch-${branch.id}`}
                            itemType={branchFiles.length > 0 ? "branch" : "leaf"}
                            value={`branch-${branch.id}`}
                          >
                            <TreeItemLayout
                              iconBefore={<BranchFork20Regular />}
                              onClick={() => onSelectBranch?.(branch)}
                              style={{ cursor: 'pointer' }}
                              actions={
                                <Tooltip content={t('LakehouseGitFS_AddFile_Tooltip', 'Add File')} relationship="label">
                                  <Button
                                    icon={<Add20Regular />}
                                    appearance="subtle"
                                    size="small"
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation();
                                      handleAddFile(repo.id, branch.id);
                                    }}
                                    aria-label={t('LakehouseGitFS_AddFile_Label', 'Add File')}
                                  />
                                </Tooltip>
                              }
                            >
                              {branch.name} ({branchFiles.length} files)
                            </TreeItemLayout>
                            
                            {branchFiles.length > 0 && (
                              <Tree>
                                {branchFiles.map(file => {
                                  const fileName = file.file_path.split('/').pop() || file.file_path;
                                  
                                  return (
                                    <TreeItem key={`file-${file.id}`} itemType="leaf">
                                      <TreeItemLayout
                                        iconBefore={<Document20Regular />}
                                        onClick={() => onSelectFile?.(file, branch.id)}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        {fileName}
                                      </TreeItemLayout>
                                    </TreeItem>
                                  );
                                })}
                              </Tree>
                            )}
                          </TreeItem>
                        );
                      })}
                    </Tree>
                  )}
                </TreeItem>
              );
            })}
          </Tree>
        )}
      </div>
    </div>
  );
};
