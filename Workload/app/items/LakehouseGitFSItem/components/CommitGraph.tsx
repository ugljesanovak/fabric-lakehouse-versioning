/**
 * CommitGraph Component
 * Displays commit history with visual parent-child relationships
 * Inspired by GitHub Network Graph and GitKraken with Fabric UX compliance
 */

import React, { useMemo, useState } from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Badge,
  Tooltip,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Label,
} from "@fluentui/react-components";
import {
  Person20Regular,
  CalendarLtr20Regular,
  ChatBubblesQuestion20Regular,
  BranchFork20Regular,
  Delete20Regular,
  Document20Regular,
  ChevronDown20Filled,
  ChevronRight20Filled,
} from "@fluentui/react-icons";
import { Commit, Repository, Branch, FileRecord } from "../LakehouseGitFSItemDefinition";

const COMMIT_HEIGHT = 80;
const COMMIT_SPACING = 20;
const GRAPH_LEFT_MARGIN = 60;
const NODE_RADIUS = 8;

interface CommitNode {
  commit: Commit;
  x: number;
  y: number;
  parentId: string | null;
  isHead: boolean;
  isOrphaned: boolean;
}

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
  },
  graphContainer: {
    ...shorthands.flex(1),
    ...shorthands.overflow('auto'),
    position: "relative",
  },
  graphSvg: {
    position: "absolute",
    left: 0,
    top: 0,
    pointerEvents: "none",
  },
  commitList: {
    position: "relative",
    ...shorthands.padding(tokens.spacingVerticalM, '0'),
  },
  commitRow: {
    display: "flex",
    alignItems: "flex-start",
    position: "relative",
    minHeight: `${COMMIT_HEIGHT + COMMIT_SPACING}px`,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalXL, tokens.spacingVerticalS, `${GRAPH_LEFT_MARGIN + 30}px`),
  },
  commitCard: {
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    cursor: "pointer",
    transitionDuration: tokens.durationNormal,
    transitionProperty: "all",
    transitionTimingFunction: tokens.curveEasyEase,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground2Hover,
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      boxShadow: tokens.shadow4,
    },
  },
  commitCardHead: {
    ...shorthands.borderColor(tokens.colorBrandStroke2),
    ...shorthands.borderWidth('2px'),
  },
  commitCardOrphaned: {
    opacity: '0.6',
    ...shorthands.borderColor(tokens.colorNeutralStroke3),
    ...shorthands.borderStyle('dashed'),
  },
  commitHeader: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalXS,
  },
  commitMessage: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    flex: 1,
  },
  commitMeta: {
    display: "flex",
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: tokens.spacingVerticalXS,
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  commitActions: {
    display: "flex",
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginTop: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
  },
  commitHashBadge: {
    fontFamily: tokens.fontFamilyMonospace,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    ...shorthands.gap(tokens.spacingVerticalM),
    ...shorthands.padding(tokens.spacingVerticalXXXL),
    color: tokens.colorNeutralForeground3,
  },
  emptyIcon: {
    fontSize: "64px",
    color: tokens.colorNeutralForeground4,
  },
  emptyText: {
    fontSize: tokens.fontSizeBase400,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
    maxWidth: "400px",
  },
  fileList: {
    marginTop: tokens.spacingVerticalM,
    paddingTop: tokens.spacingVerticalM,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalS),
    ...shorthands.borderRadius(tokens.borderRadiusSmall),
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    transitionDuration: tokens.durationNormal,
    transitionProperty: 'all',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
});

interface CommitGraphProps {
  repository: Repository | null;
  branch: Branch | null;
  commits: Commit[];
  files: FileRecord[];
  onFileSelect?: (file: FileRecord, branchId: string) => void;
  onCreateBranch?: (branchName: string, fromCommitId: string, repositoryId: string) => void;
  onDeleteBranch?: (branchId: string) => void;
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  repository,
  branch,
  commits,
  files,
  onFileSelect,
  onCreateBranch,
  onDeleteBranch,
}) => {
  const classes = useStyles();
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [selectedCommitForBranch, setSelectedCommitForBranch] = useState<Commit | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedCommitId, setExpandedCommitId] = useState<string | null>(null);

  const handleCreateBranch = () => {
    if (newBranchName.trim() && selectedCommitForBranch && repository) {
      onCreateBranch?.(newBranchName.trim(), selectedCommitForBranch.id, repository.id);
      setBranchDialogOpen(false);
      setNewBranchName("");
      setSelectedCommitForBranch(null);
    }
  };

  const openBranchDialog = (commit: Commit) => {
    setSelectedCommitForBranch(commit);
    setNewBranchName("");
    setBranchDialogOpen(true);
  };

  const handleDeleteBranch = () => {
    if (branch) {
      onDeleteBranch?.(branch.id);
      setDeleteDialogOpen(false);
    }
  };

  const isMainBranch = branch?.name.toLowerCase() === 'main';

  // Build commit graph with parent-child relationships using topological sort from HEAD
  const { commitNodes, svgHeight } = useMemo(() => {
    if (!branch || !branch.head_commit_id) return { commitNodes: [], svgHeight: 0 };

    // Use all commits, not just those with matching branch_id
    // This allows branches to show commits from their parent branch
    const commitMap = new Map(commits.map(c => [c.id, c]));
    const headCommitId = branch.head_commit_id;
    
    // Build main chain following parent relationships from HEAD (reachable commits)
    const reachableCommits: Commit[] = [];
    const reachableIds = new Set<string>();
    
    // Walk backwards from HEAD following parent_commit_id
    let currentId: string | null = headCommitId;
    while (currentId) {
      if (reachableIds.has(currentId)) break; // Prevent infinite loops
      
      const commit = commitMap.get(currentId);
      if (!commit) break;
      
      reachableIds.add(currentId);
      reachableCommits.push(commit);
      currentId = commit.parent_commit_id;
    }
    
    // Find orphaned commits (commits with this branch_id but not reachable from HEAD)
    const branchCommits = commits.filter((commit) => commit.branch_id === branch.id);
    const orphanedCommits = branchCommits.filter(c => !reachableIds.has(c.id));
    
    // Sort orphaned commits by creation date (newest first)
    orphanedCommits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const LANE_WIDTH = 60;
    const nodes: CommitNode[] = [];
    
    // Position main chain commits in lane 0
    reachableCommits.forEach((commit, index) => {
      nodes.push({
        commit,
        x: GRAPH_LEFT_MARGIN / 2,
        y: 40 + index * (COMMIT_HEIGHT + COMMIT_SPACING),
        parentId: commit.parent_commit_id,
        isHead: commit.id === headCommitId,
        isOrphaned: false,
      });
    });
    
    // Position orphaned commits in lane 1 (to the right)
    orphanedCommits.forEach((commit, index) => {
      nodes.push({
        commit,
        x: GRAPH_LEFT_MARGIN / 2 + LANE_WIDTH,
        y: 40 + index * (COMMIT_HEIGHT + COMMIT_SPACING),
        parentId: commit.parent_commit_id,
        isHead: false, // Orphaned commits are never HEAD
        isOrphaned: true,
      });
    });
    
    // Calculate height based on all commits
    const maxY = Math.max(
      reachableCommits.length > 0 ? 40 + (reachableCommits.length - 1) * (COMMIT_HEIGHT + COMMIT_SPACING) : 0,
      orphanedCommits.length > 0 ? 40 + (orphanedCommits.length - 1) * (COMMIT_HEIGHT + COMMIT_SPACING) : 0
    );
    
    const height = maxY > 0 ? maxY + 60 : 0;

    return { commitNodes: nodes, svgHeight: height };
  }, [branch, commits]);

  // Format timestamp
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  // Empty states
  if (!repository || !branch) {
    return (
      <div className={classes.container}>
        <div className={classes.emptyState}>
          <ChatBubblesQuestion20Regular className={classes.emptyIcon} />
          <Text className={classes.emptyText}>
            {!repository 
              ? "Select a repository from the left panel to view commit history" 
              : "Select a branch from the ribbon to view commits"}
          </Text>
        </div>
      </div>
    );
  }

  if (commitNodes.length === 0) {
    return (
      <div className={classes.container}>
        <div className={classes.header}>
          <Text className={classes.title}>Commit History</Text>
          <Text className={classes.subtitle}>
            {repository.name} / {branch.name}
          </Text>
        </div>
        <div className={classes.emptyState}>
          <ChatBubblesQuestion20Regular className={classes.emptyIcon} />
          <Text className={classes.emptyText}>
            No commits in this branch yet. Start by adding files and creating your first commit.
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM }}>
            <Text className={classes.title}>Commit History</Text>
            <Badge appearance="outline" color="informative" size="large">
              {commitNodes.length} commit{commitNodes.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {!isMainBranch && (
            <Tooltip content="Delete this branch" relationship="label">
              <Button
                icon={<Delete20Regular />}
                appearance="subtle"
                size="small"
                onClick={() => setDeleteDialogOpen(true)}
                aria-label="Delete branch"
              />
            </Tooltip>
          )}
        </div>
        <Text className={classes.subtitle}>
          {repository.name} / {branch.name}
        </Text>
      </div>
      
      <div className={classes.graphContainer}>
        {/* SVG Layer for graph lines */}
        <svg 
          className={classes.graphSvg}
          width="100%" 
          height={svgHeight}
        >
          {/* Draw connection lines between commits */}
          {commitNodes.map((node, index) => {
            if (!node.parentId) return null;
            
            // Find parent node
            const parentIndex = commitNodes.findIndex(n => n.commit.id === node.parentId);
            if (parentIndex === -1) return null;
            
            const parent = commitNodes[parentIndex];
            
            // Draw curved line from child to parent
            const startX = node.x;
            const startY = node.y;
            const endX = parent.x;
            const endY = parent.y;
            
            const controlOffset = Math.abs(endY - startY) / 3;
            const path = `M ${startX},${startY} C ${startX},${startY + controlOffset} ${endX},${endY - controlOffset} ${endX},${endY}`;
            
            return (
              <path
                key={`${node.commit.id}-${node.parentId}`}
                d={path}
                stroke={node.isOrphaned ? tokens.colorNeutralStroke3 : tokens.colorBrandBackground}
                strokeWidth="2"
                strokeDasharray={node.isOrphaned ? "4 4" : "none"}
                fill="none"
                opacity={node.isOrphaned ? "0.4" : "0.6"}
              />
            );
          })}
          
          {/* Draw commit nodes */}
          {commitNodes.map((node) => (
            <g key={node.commit.id}>
              {/* Outer ring for HEAD commit */}
              {node.isHead && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke={tokens.colorBrandForeground1}
                  strokeWidth="2"
                />
              )}
              {/* Main commit node */}
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={node.isHead ? tokens.colorBrandBackground : node.isOrphaned ? tokens.colorNeutralBackground4 : tokens.colorNeutralBackground5}
                stroke={node.isOrphaned ? tokens.colorNeutralStroke3 : tokens.colorBrandBackground}
                strokeWidth="2"
                opacity={node.isOrphaned ? "0.6" : "1"}
              />
            </g>
          ))}
        </svg>

        {/* Commit cards layer */}
        <div className={classes.commitList}>
          {commitNodes.map((node) => {
            const commitFiles = files.filter(f => f.commit_id === node.commit.id);
            const isExpanded = expandedCommitId === node.commit.id;
            
            return (
            <div 
              key={node.commit.id} 
              className={classes.commitRow}
              style={{ minHeight: `${COMMIT_HEIGHT + COMMIT_SPACING}px` }}
            >
              <div 
                className={`${classes.commitCard} ${node.isHead ? classes.commitCardHead : ''} ${node.isOrphaned ? classes.commitCardOrphaned : ''}`}
              >
                <div onClick={() => setExpandedCommitId(isExpanded ? null : node.commit.id)} style={{ cursor: 'pointer' }}>
                  <div className={classes.commitHeader}>
                  {isExpanded ? <ChevronDown20Filled /> : <ChevronRight20Filled />}
                  <Text className={classes.commitMessage}>
                    {node.commit.message || "(No commit message)"}
                  </Text>
                  <Badge appearance="outline" size="small">
                    {commitFiles.length} file{commitFiles.length !== 1 ? 's' : ''}
                  </Badge>
                  {node.isHead && (
                    <Badge appearance="filled" color="brand" size="small">
                      HEAD
                    </Badge>
                  )}
                  {node.isOrphaned && (
                    <Badge appearance="tint" color="warning" size="small">
                      Orphaned
                    </Badge>
                  )}
                </div>
                
                <div className={classes.commitMeta}>
                  <Tooltip content={`Commit ID: ${node.commit.id}`} relationship="description">
                    <div className={classes.metaItem}>
                      <Badge 
                        size="small" 
                        appearance="tint" 
                        color="brand"
                        className={classes.commitHashBadge}
                      >
                        {node.commit.id.substring(0, 7)}
                      </Badge>
                    </div>
                  </Tooltip>
                  
                  {node.commit.author && (
                    <div className={classes.metaItem}>
                      <Person20Regular />
                      <Text>{node.commit.author}</Text>
                    </div>
                  )}
                  
                  <Tooltip 
                    content={new Date(node.commit.created_at).toLocaleString()}
                    relationship="description"
                  >
                    <div className={classes.metaItem}>
                      <CalendarLtr20Regular />
                      <Text>{formatDate(node.commit.created_at)}</Text>
                    </div>
                  </Tooltip>

                  {node.parentId && (
                    <Tooltip content={`Parent: ${node.parentId.substring(0, 7)}`} relationship="description">
                      <div className={classes.metaItem}>
                        <Text style={{ fontSize: tokens.fontSizeBase100 }}>
                          ↳ {node.parentId.substring(0, 7)}
                        </Text>
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>

                {/* Expandable file list */}
                {isExpanded && commitFiles.length > 0 && (
                  <div className={classes.fileList}>
                    {commitFiles.map(file => {
                      return (
                        <div 
                          key={file.id} 
                          className={classes.fileItem}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFileSelect?.(file, branch!.id);
                          }}
                        >
                          <Document20Regular />
                          <Text>{file.file_path}</Text>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Commit actions */}
                <div className={classes.commitActions}>
                  <Tooltip content="Create a new branch from this commit" relationship="description">
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<BranchFork20Regular />}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        openBranchDialog(node.commit);
                      }}
                    >
                      Create Branch
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Delete branch confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(_, data) => setDeleteDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete Branch?</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                <Text>
                  Are you sure you want to delete the branch <strong>{branch?.name}</strong>?
                </Text>
                <Text size={200} style={{ color: tokens.colorPaletteRedForeground1 }}>
                  This action cannot be undone. All commits unique to this branch will become inaccessible.
                </Text>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                appearance="primary" 
                onClick={handleDeleteBranch}
                style={{ 
                  backgroundColor: tokens.colorPaletteRedBackground3,
                  color: tokens.colorNeutralForegroundOnBrand,
                }}
              >
                Delete Branch
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Branch creation dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={(_, data) => setBranchDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                <div>
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    value={newBranchName}
                    onChange={(_, data) => setNewBranchName(data.value)}
                    placeholder="feature/new-feature"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newBranchName.trim()) {
                        handleCreateBranch();
                      }
                    }}
                  />
                </div>
                {selectedCommitForBranch && (
                  <Text size={200}>
                    Branch will be created from commit{' '}
                    <Badge size="small" appearance="tint" color="brand">
                      {selectedCommitForBranch.id.substring(0, 7)}
                    </Badge>
                    {selectedCommitForBranch.message && (
                      <> - {selectedCommitForBranch.message}</>
                    )}
                  </Text>
                )}
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setBranchDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                appearance="primary" 
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim()}
              >
                Create Branch
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
