/**
 * CommitGraph Component
 * Displays commit history for selected repository and branch
 * Shows in the center pane with timeline visualization
 */

import React, { useMemo } from "react";
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Badge,
  Divider,
} from "@fluentui/react-components";
import {
  CircleFilled,
  Person20Regular,
  CalendarLtr20Regular,
  ChatBubblesQuestion20Regular,
} from "@fluentui/react-icons";
import { Commit, Repository, Branch } from "../LakehouseGitFSItemDefinition";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.gap(tokens.spacingVerticalM),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  subtitle: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  commitList: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(tokens.spacingVerticalM),
    overflowY: "auto",
    flex: 1,
  },
  commitCard: {
    position: "relative",
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    cursor: "default",
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  commitTimeline: {
    position: "absolute",
    left: "8px",
    top: "24px",
    bottom: "-12px",
    width: "2px",
    backgroundColor: tokens.colorBrandBackground,
  },
  commitDot: {
    position: "absolute",
    left: "4px",
    top: "4px",
    color: tokens.colorBrandBackground,
  },
  commitContent: {
    marginLeft: "28px",
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  commitMessage: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  commitMeta: {
    display: "flex",
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    ...shorthands.gap(tokens.spacingVerticalM),
    color: tokens.colorNeutralForeground3,
  },
  emptyIcon: {
    fontSize: "48px",
    color: tokens.colorNeutralForeground4,
  },
  emptyText: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground3,
    textAlign: "center",
  },
});

interface CommitGraphProps {
  repository: Repository | null;
  branch: Branch | null;
  commits: Commit[];
}

export const CommitGraph: React.FC<CommitGraphProps> = ({
  repository,
  branch,
  commits,
}) => {
  const classes = useStyles();

  // Filter commits for selected branch
  const filteredCommits = useMemo(() => {
    if (!branch) return [];
    return commits
      .filter((commit) => commit.branch_id === branch.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    
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
              ? "Select a repository from the left panel to view commits" 
              : "Select a branch from the ribbon to view commits"}
          </Text>
        </div>
      </div>
    );
  }

  if (filteredCommits.length === 0) {
    return (
      <div className={classes.container}>
        <div className={classes.header}>
          <Text className={classes.title}>Commit History</Text>
          <Text className={classes.subtitle}>
            {repository.name} / {branch.name}
          </Text>
        </div>
        <Divider />
        <div className={classes.emptyState}>
          <ChatBubblesQuestion20Regular className={classes.emptyIcon} />
          <Text className={classes.emptyText}>
            No commits in this branch yet
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <Text className={classes.title}>Commit History</Text>
        <Text className={classes.subtitle}>
          {repository.name} / {branch.name}
        </Text>
        <Badge appearance="outline" color="informative">
          {filteredCommits.length} commit{filteredCommits.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <Divider />
      <div className={classes.commitList}>
        {filteredCommits.map((commit, index) => (
          <div key={commit.id} className={classes.commitCard}>
            <CircleFilled className={classes.commitDot} />
            {index < filteredCommits.length - 1 && (
              <div className={classes.commitTimeline} />
            )}
            <div className={classes.commitContent}>
              <Text className={classes.commitMessage}>
                {commit.message || "(No commit message)"}
              </Text>
              <div className={classes.commitMeta}>
                {commit.author && (
                  <div className={classes.metaItem}>
                    <Person20Regular />
                    <Text>{commit.author}</Text>
                  </div>
                )}
                <div className={classes.metaItem}>
                  <CalendarLtr20Regular />
                  <Text>{formatDate(commit.created_at)}</Text>
                </div>
                <div className={classes.metaItem}>
                  <Badge size="small" appearance="tint" color="subtle">
                    {commit.id.substring(0, 7)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
