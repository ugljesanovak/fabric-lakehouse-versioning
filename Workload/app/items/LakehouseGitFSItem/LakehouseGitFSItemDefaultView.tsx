import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Tab, 
  TabList,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  DialogContent,
  Button,
  Textarea,
  Label,
  Badge,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { WorkloadClientAPI, NotificationType } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { OneLakeStorageClientItemWrapper } from "../../clients";
import { callNotificationOpen } from "../../controller/NotificationController";
import { LakehouseGitFSItemDefinition, GitMetadata, Branch } from "./LakehouseGitFSItemDefinition";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { RepositoryExplorer } from "./components/RepositoryExplorer";
import { OneLakeView } from "../../components/OneLakeView";
import { FileQueryPanel } from "./components/FileQueryPanel";
import { CommitGraph } from "./components/CommitGraph";
import { FileRecord } from "./LakehouseGitFSItemDefinition";
import "./LakehouseGitFSItem.scss";

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  tabList: {
    marginBottom: tokens.spacingVerticalS,
  },
  tabBadge: {
    marginLeft: tokens.spacingHorizontalXS,
  },
  scrollableContent: {
    flex: 1,
    ...shorthands.overflow('auto'),
  },
  stagingContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  stagingHeader: {
    ...shorthands.padding(tokens.spacingVerticalM),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stagingLabel: {
    marginLeft: tokens.spacingHorizontalS,
    fontWeight: tokens.fontWeightSemibold,
  },
  stagingActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  commitDialogSurface: {
    maxWidth: '600px',
  },
  commitDialogContent: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
  },
  formField: {
    marginBottom: tokens.spacingVerticalS,
  },
  formLabel: {
    marginBottom: tokens.spacingVerticalXS,
    display: 'block',
  },
  commitTextarea: {
    width: '100%',
    minHeight: '100px',
  },
  fileListContainer: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    ...shorthands.padding(tokens.spacingVerticalM),
    maxHeight: '200px',
    ...shorthands.overflow('auto'),
  },
  fileListItem: {
    ...shorthands.padding(tokens.spacingVerticalXS, '0'),
    fontSize: tokens.fontSizeBase300,
  },
  fileListItemWithBorder: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
});

interface LakehouseGitFSItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<LakehouseGitFSItemDefinition>;
  currentDefinition: LakehouseGitFSItemDefinition;
  storageWrapper: OneLakeStorageClientItemWrapper | null;
  selectedBranch: Branch | null;
  onBranchSelect?: (branch: Branch) => void;
  messageValue?: string;
  onMessageChange?: (newValue: string) => void;
  onDefinitionChange?: (updater: (prev: LakehouseGitFSItemDefinition) => LakehouseGitFSItemDefinition) => void;
  onSave?: () => Promise<void>;
}

export function LakehouseGitFSItemDefaultView({
  workloadClient,
  item,
  currentDefinition,
  storageWrapper,
  selectedBranch,
  onBranchSelect,
  messageValue,
  onMessageChange,
  onDefinitionChange,
  onSave,
}: LakehouseGitFSItemDefaultViewProps) {
  const { t } = useTranslation();
  const styles = useStyles();
  const [treeRefreshTrigger, setTreeRefreshTrigger] = useState(0);
  const [fileSelectionState, setFileSelectionState] = useState<{
    isSelecting: boolean;
    repositoryId: string;
    branchId: string;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("repositories");
  const [stagedFiles, setStagedFiles] = useState<Array<{
    fileName: string;
    sourcePath: string;
    sourceWorkspaceId: string;
    sourceItemId: string;
  }>>([]);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [selectedFileBranchId, setSelectedFileBranchId] = useState<string | null>(null);

  // Handle file selection from commit graph
  const handleFileSelect = (file: FileRecord, branchId: string) => {
    setSelectedFile(file);
    setSelectedFileBranchId(branchId);
  };

  // Handle creating a new branch from a commit
  const handleCreateBranch = (branchName: string, fromCommitId: string, repositoryId: string) => {
    updateMetadata((prev) => ({
      ...prev,
      branches: [
        ...prev.branches,
        {
          id: crypto.randomUUID(),
          repository_id: repositoryId,
          name: branchName,
          head_commit_id: fromCommitId,
          created_at: new Date().toISOString(),
        },
      ],
    }));

    // Notify user
    callNotificationOpen(
      workloadClient,
      t('LakehouseGitFS_BranchCreated_Title', 'Branch Created'),
      t('LakehouseGitFS_BranchCreated_Message', `Branch "${branchName}" created successfully`),
      NotificationType.Success,
      undefined
    );

    // Auto-save after creating branch
    if (onSave) {
      onSave();
    }
  };

  // Handle deleting a branch
  const handleDeleteBranch = (branchId: string) => {
    const branchToDelete = metadata.branches.find(b => b.id === branchId);
    if (!branchToDelete) return;

    // Remove branch from metadata
    updateMetadata((prev) => ({
      ...prev,
      branches: prev.branches.filter(b => b.id !== branchId),
    }));

    // Clear selection if the deleted branch was selected
    if (selectedBranch?.id === branchId) {
      onBranchSelect?.(null);
    }

    // Notify user
    callNotificationOpen(
      workloadClient,
      t('LakehouseGitFS_BranchDeleted_Title', 'Branch Deleted'),
      t('LakehouseGitFS_BranchDeleted_Message', `Branch "${branchToDelete.name}" has been deleted`),
      NotificationType.Success,
      undefined
    );

    // Auto-save after deleting branch
    if (onSave) {
      onSave();
    }
  };

  // Initialize metadata if not present
  const metadata: GitMetadata = currentDefinition.metadata || {
    repositories: [],
    branches: [],
    commits: [],
    files: []
  };

  const updateMetadata = (updater: (prev: GitMetadata) => GitMetadata) => {
    if (onDefinitionChange) {
      onDefinitionChange((prev) => ({
        ...prev,
        metadata: updater(prev.metadata || { repositories: [], branches: [], commits: [], files: [] })
      }));
    }
  };

  // const handleOpenResource = async (url: string) => {
  //   try {
  //     // Demonstrate external navigation API
  //     await callNavigationOpenInNewBrowserTab(workloadClient, url);
  //   } catch (error) {
  //     // Log the error
  //     console.error('Failed to open resource via Fabric navigation API:', error);
  //   }
  // };

  const handleAddFile = async (repositoryId: string, branchId: string) => {
    if (!storageWrapper || !item || !currentDefinition) {
      console.error('[LakehouseGitFSItemDefaultView] Missing dependencies for file addition');
      return;
    }

    // Switch to file selection tab and set state
    setSelectedTab("files");
    setFileSelectionState({
      isSelecting: true,
      repositoryId,
      branchId
    });
  };

  const handleFileSelected = async (fileName: string, oneLakeLink: string) => {
    if (!fileSelectionState || !storageWrapper || !item || !currentDefinition) {
      console.error('[LakehouseGitFSItemDefaultView] Invalid state for file selection');
      return;
    }

    try {
      // Parse OneLake link format: {workspaceId}/{itemId}/Files/{path}
      const parts = oneLakeLink.split('/');
      const filesIndex = parts.indexOf('Files');
      
      if (filesIndex === -1 || filesIndex < 2) {
        throw new Error('Invalid OneLake link format');
      }

      const sourceWorkspaceId = parts[filesIndex - 2];
      const sourceItemId = parts[filesIndex - 1];
      const sourcePath = 'Files/' + parts.slice(filesIndex + 1).join('/');

      console.log('[LakehouseGitFSItemDefaultView] Selected file:', fileName);
      console.log('[LakehouseGitFSItemDefaultView] Source - workspace:', sourceWorkspaceId, 'item:', sourceItemId, 'path:', sourcePath);

      // Validate file type
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'csv' && fileExtension !== 'parquet') {
        callNotificationOpen(
          workloadClient,
          t('LakehouseGitFS_InvalidFileType_Title', 'Invalid File Type'),
          t('LakehouseGitFS_InvalidFileType_Message', 'Only CSV and Parquet files are supported. Please select a .csv or .parquet file.'),
          NotificationType.Error,
          undefined
        );
        return;
      }

      // Check if file already staged
      if (stagedFiles.some(f => f.fileName === fileName && f.sourcePath === sourcePath)) {
        return;
      }

      // Add file to staging area
      setStagedFiles(prev => [...prev, {
        fileName,
        sourcePath,
        sourceWorkspaceId,
        sourceItemId
      }]);

    } catch (error) {
      console.error('[LakehouseGitFSItemDefaultView] ❌ Failed to stage file:', error);
      
      callNotificationOpen(
        workloadClient,
        t('LakehouseGitFS_StageFile_Error_Title', 'Failed to Stage File'),
        t('LakehouseGitFS_StageFile_Error_Message', 'An error occurred while staging the file: {error}', {
          error: error.message || error
        }),
        NotificationType.Error,
        undefined
      );
    }
  };

  const handleCommitStagedFiles = async () => {
    if (!fileSelectionState || !item || !currentDefinition || stagedFiles.length === 0) {
      console.error('[LakehouseGitFSItemDefaultView] Invalid state for commit');
      return;
    }

    const { repositoryId, branchId } = fileSelectionState;

    try {

      // Generate commit ID
      const commitId = crypto.randomUUID();
      const now = new Date().toISOString();
      const author = 'Current User'; // TODO: Extract actual user from workloadClient context

      // NOTE: File Reference Strategy
      // Initial addition: Store file reference WITHOUT copying.
      // On commit with changes: Copy modified file to /Files/.gitfs/{item_id}/Data/{commit_id}/{fileName}
      // This way:
      //   - No duplication for unchanged files
      //   - Commit history preserves modified versions
      //   - Original files remain untouched until edited

      // Get current HEAD to set as parent
      const currentBranch = currentDefinition.metadata?.branches.find(b => b.id === branchId);
      const parentCommitId = currentBranch?.head_commit_id || null;

      // Create commit with custom message
      const newCommit = {
        id: commitId,
        repository_id: repositoryId,
        branch_id: branchId,
        parent_commit_id: parentCommitId,
        message: commitMessage.trim() || `Added ${stagedFiles.length} file(s)`,
        author,
        created_at: now
      };

      // Get all files from parent commit (complete snapshot)
      const parentFiles: typeof currentDefinition.metadata.files = [];
      if (parentCommitId) {
        // Walk parent chain to get all files reachable from parent
        const reachableCommits = new Set<string>();
        let currentId: string | null = parentCommitId;
        
        while (currentId) {
          if (reachableCommits.has(currentId)) break;
          reachableCommits.add(currentId);
          const commit = currentDefinition.metadata.commits.find(c => c.id === currentId);
          currentId = commit?.parent_commit_id || null;
        }
        
        // Get files from all reachable commits
        const filesFromParents = currentDefinition.metadata.files.filter(f => 
          reachableCommits.has(f.commit_id)
        );
        
        // Group by file_path and take the latest version
        const filesByPath = new Map<string, typeof filesFromParents[0]>();
        filesFromParents.forEach(file => {
          const existing = filesByPath.get(file.file_path);
          if (!existing || new Date(file.created_at) > new Date(existing.created_at)) {
            filesByPath.set(file.file_path, file);
          }
        });
        
        // Re-create file records for this commit (snapshot)
        filesByPath.forEach(file => {
          parentFiles.push({
            ...file,
            id: crypto.randomUUID(), // New ID for this commit's snapshot
            commit_id: commitId,     // This commit owns this snapshot
          });
        });
      }

      // Create file records for newly staged files (override parent versions)
      const newFilesByPath = new Map<string, typeof parentFiles[0]>();
      
      // First, add all parent files
      parentFiles.forEach(file => {
        newFilesByPath.set(file.file_path, file);
      });
      
      // Then, add/override with staged files
      stagedFiles.forEach(stagedFile => {
        newFilesByPath.set(stagedFile.fileName, {
          id: crypto.randomUUID(),
          commit_id: commitId,
          file_path: stagedFile.fileName,
          physical_location: `/${stagedFile.sourcePath}`,
          source_workspace_id: stagedFile.sourceWorkspaceId,
          source_item_id: stagedFile.sourceItemId,
          is_reference: true,
          size_bytes: null as number | null,
          created_at: now
        });
      });
      
      // Convert map back to array - this is the COMPLETE snapshot for this commit
      const allFilesInCommit = Array.from(newFilesByPath.values());

      // Update metadata
      updateMetadata((prev) => {
        const updatedBranches = prev.branches.map(b => 
          b.id === branchId ? { ...b, head_commit_id: commitId } : b
        );
        
        return {
          repositories: prev.repositories,
          branches: updatedBranches,
          commits: [...prev.commits, newCommit],
          files: [...prev.files, ...allFilesInCommit] // Complete snapshot
        };
      });

      console.log('[LakehouseGitFSItemDefaultView] ✅ Commit created with', allFilesInCommit.length, 'total file(s) (', stagedFiles.length, 'new/modified)');

      // Clear staging area and close dialog
      setStagedFiles([]);
      setCommitMessage("");
      setCommitDialogOpen(false);
      setFileSelectionState(null);
      setSelectedTab("repositories");

      // Refresh tree view
      setTreeRefreshTrigger(prev => prev + 1);

      // Auto-persist
      if (onSave) {
        await onSave();
        console.log('[LakehouseGitFSItemDefaultView] ✅ Auto-saved after commit');
      }

    } catch (error) {
      console.error('[LakehouseGitFSItemDefaultView] ❌ Failed to commit:', error);
      
      callNotificationOpen(
        workloadClient,
        t('LakehouseGitFS_Commit_Error_Title', 'Failed to Commit'),
        t('LakehouseGitFS_Commit_Error_Message', 'An error occurred while creating the commit: {error}', {
          error: error.message || error
        }),
        NotificationType.Error,
        undefined
      );
    }
  };



  return (
    <ItemEditorDefaultView
      //Add left control if you want to split the center content in the editor
      left={!storageWrapper || !item?.id ? undefined : {
        content: (
          <div className={styles.container}>
            <TabList 
              selectedValue={selectedTab} 
              onTabSelect={(_, data) => setSelectedTab(data.value as string)}
              className={styles.tabList}
            >
              <Tab value="repositories">{t('LakehouseGitFS_Repositories_Tab', 'Repositories')}</Tab>
              <Tab 
                value="files" 
                disabled={!fileSelectionState?.isSelecting}
              >
                {t('LakehouseGitFS_SelectFile_Tab', 'Select File')}
                {stagedFiles.length > 0 && (
                  <Badge appearance="filled" color="success" className={styles.tabBadge}>
                    {stagedFiles.length}
                  </Badge>
                )}
              </Tab>
            </TabList>
            <div className={styles.scrollableContent}>
              {selectedTab === "repositories" ? (
                <RepositoryExplorer
                  workloadClient={workloadClient}
                  metadata={metadata}
                  itemId={item?.id || ''}
                  onAddFile={handleAddFile}
                  onMetadataChange={updateMetadata}
                  onSave={onSave}
                  onSelectFile={(file, branchId) => {
                    setSelectedFile(file);
                    setSelectedFileBranchId(branchId);
                  }}
                  onSelectBranch={(branch) => {
                    setSelectedFile(null);
                    setSelectedFileBranchId(null);
                    onBranchSelect?.(branch);
                  }}
                  refreshTrigger={treeRefreshTrigger}
                />
              ) : selectedTab === "files" && fileSelectionState?.isSelecting ? (
                <div className={styles.stagingContainer}>
                  {/* Staging area header */}
                  {stagedFiles.length > 0 && (
                    <div className={styles.stagingHeader}>
                      <div>
                        <Badge appearance="filled" color="success">{stagedFiles.length}</Badge>
                        <span className={styles.stagingLabel}>
                          {t('LakehouseGitFS_StagedFiles_Label', 'Staged Files')}
                        </span>
                      </div>
                      <div className={styles.stagingActions}>
                        <Button 
                          size="small"
                          appearance="secondary"
                          onClick={() => setStagedFiles([])}
                        >
                          {t('LakehouseGitFS_ClearStaging_Button', 'Clear')}
                        </Button>
                        <Dialog open={commitDialogOpen} onOpenChange={(_, data) => setCommitDialogOpen(data.open)}>
                          <DialogTrigger disableButtonEnhancement>
                            <Button 
                              size="small"
                              appearance="primary"
                            >
                              {t('LakehouseGitFS_Commit_Button', 'Commit')}
                            </Button>
                          </DialogTrigger>
                          <DialogSurface className={styles.commitDialogSurface}>
                            <DialogBody>
                              <DialogTitle>{t('LakehouseGitFS_CommitDialog_Title', 'Create Commit')}</DialogTitle>
                              <DialogContent className={styles.commitDialogContent}>
                                <div>
                                  <Label weight="semibold" className={styles.formLabel}>
                                    {t('LakehouseGitFS_CommitMessage_Label', 'Commit Message')}
                                  </Label>
                                  <Textarea
                                    id="commit-message-input"
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    placeholder={t('LakehouseGitFS_CommitMessage_Placeholder', 'Describe the changes in this commit...')}
                                    rows={4}
                                    resize="vertical"
                                    appearance="filled-darker"
                                    className={styles.commitTextarea}
                                  />
                                </div>
                                <div>
                                  <Label weight="semibold" className={styles.formLabel}>
                                    {t('LakehouseGitFS_FilesToCommit_Label', 'Files to commit')} ({stagedFiles.length})
                                  </Label>
                                  <div className={styles.fileListContainer}>
                                    {stagedFiles.map((file, idx) => (
                                      <div 
                                        key={idx} 
                                        className={`${styles.fileListItem} ${idx < stagedFiles.length - 1 ? styles.fileListItemWithBorder : ''}`}
                                      >
                                        📄 {file.fileName}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </DialogContent>
                              <DialogActions>
                                <Button appearance="secondary" onClick={() => setCommitDialogOpen(false)}>
                                  {t('Cancel_Label', 'Cancel')}
                                </Button>
                                <Button 
                                  appearance="primary" 
                                  onClick={handleCommitStagedFiles}
                                >
                                  {t('LakehouseGitFS_CreateCommit_Button', 'Create Commit')}
                                </Button>
                              </DialogActions>
                            </DialogBody>
                          </DialogSurface>
                        </Dialog>
                      </div>
                    </div>
                  )}
                  
                  {/* Staged files list */}
                  {stagedFiles.length > 0 && (
                    <div style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                      {stagedFiles.map((file, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '6px 8px', 
                            marginBottom: '4px',
                            backgroundColor: '#e8f5e9',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '13px'
                          }}
                        >
                          <span>📄 {file.fileName}</span>
                          <Button
                            size="small"
                            appearance="subtle"
                            onClick={() => setStagedFiles(prev => prev.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* OneLakeView for file selection */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <OneLakeView
                      workloadClient={workloadClient}
                      config={{
                        mode: "view",
                        initialItem: {
                          id: currentDefinition.lakehouseId,
                          workspaceId: currentDefinition.lakehouseWorkspaceId,
                          displayName: "Bound Lakehouse"
                        }
                      }}
                      callbacks={{
                        onFileSelected: handleFileSelected
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ),
        width: 350,
        minWidth: 250,
        title: t('LakehouseGitFS_LeftPane_Label', 'Navigation'),
        enableUserResize: true,
        collapsible: true
      }}
      center={{
         content: !storageWrapper || !item?.id ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            padding: '40px',
            textAlign: 'center'
          }}>
            <h2>{t('LakehouseGitFS_NotBound_Title', 'Lakehouse Binding Required')}</h2>
            <p style={{ maxWidth: '500px', marginTop: '16px' }}>
              {t('LakehouseGitFS_NotBound_Message', 'This item must be bound to a Lakehouse before it can store metadata. Please click the Settings button in the ribbon and select a Lakehouse to bind to.')}
            </p>
          </div>
        ) : selectedFile ? (
          <FileQueryPanel
            key={selectedFile.id}
            workloadClient={workloadClient}
            file={selectedFile}
            repositoryId={metadata.repositories.find(r => 
              metadata.branches.some(b => 
                b.id === selectedFileBranchId && 
                b.repository_id === r.id
              )
            )?.id || ''}
            branchName={metadata.branches.find(b => 
              b.id === selectedFileBranchId
            )?.name || ''}
            branchId={selectedFileBranchId || ''}
            itemId={item?.id || ''}
            workspaceId={item?.workspaceId || ''}
            lakehouseId={currentDefinition.lakehouseId}
            lakehouseWorkspaceId={currentDefinition.lakehouseWorkspaceId}
            metadata={metadata}
            onMetadataChange={updateMetadata}
            onSave={onSave}
            onClose={() => {
              setSelectedFile(null);
              setSelectedFileBranchId(null);
            }}
          />
        ) : selectedBranch ? (
          <CommitGraph
            repository={metadata.repositories.find(r => 
              metadata.branches.some(b => b.id === selectedBranch.id && b.repository_id === r.id)
            ) || null}
            branch={selectedBranch}
            commits={metadata.commits}
            files={metadata.files}
            onFileSelect={handleFileSelect}
            onCreateBranch={handleCreateBranch}
            onDeleteBranch={handleDeleteBranch}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            padding: '20px',
            textAlign: 'center'
          }}>
            <h3>Welcome to Version Controlled Lakehouse</h3>
            <p style={{ color: '#666', marginTop: '8px', maxWidth: '500px' }}>
              Select a branch from the ribbon to view commit history, or choose a file from the repository tree to analyze it with SQL.
            </p>
          </div>
        )
      }}
    />
  );
}
