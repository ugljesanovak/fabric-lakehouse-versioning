/**
 * FileQueryPanel Component
 * Consolidated SQL Editor + Results Grid for querying CSV/Parquet files with DuckDB WASM
 * Self-contained within LakehouseGitFSItem - not shared across workload
 * Supports commit history navigation
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import Editor from "@monaco-editor/react";
import {
    makeStyles,
    shorthands,
    tokens,
    Button,
    Spinner,
    MessageBar,
    MessageBarTitle,
    MessageBarBody,
    Text,
    Tooltip,
    Table,
    TableHeader,
    TableRow,
    TableHeaderCell,
    TableBody,
    TableCell,
    Dropdown,
    Option,
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogBody,
    DialogTitle,
    DialogContent,
    DialogActions,
    Textarea,
    Label,
} from '@fluentui/react-components';
import {
    Dismiss24Regular,
    Play24Regular,
    ChevronLeft24Regular,
    ChevronRight24Regular,
    Save24Regular,
} from '@fluentui/react-icons';
import { WorkloadClientAPI } from '@ms-fabric/workload-client';
import { OneLakeStorageClient } from '../../../clients';
import { DuckDBClient, getFileExtension, getTableNameFromPath, QueryResult } from '../clients/duckDBClient';
import { FileRecord, GitMetadata } from '../LakehouseGitFSItemDefinition';

const ROWS_PER_PAGE = 50;

const useStyles = makeStyles({
    dialogSurface: {
        width: '90vw',
        maxWidth: '1400px',
        height: '85vh',
        maxHeight: '900px',
        padding: 0,
    },
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
    },
    header: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...shorthands.padding('4px', tokens.spacingHorizontalM),
        backgroundColor: tokens.colorNeutralBackground1,
        minHeight: '28px',
    },
    fileInfo: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalS),
        flexGrow: 1,
        minWidth: 0,
    },
    fileName: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    commitId: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorBrandForeground1,
        backgroundColor: tokens.colorBrandBackground2,
        ...shorthands.padding('1px', tokens.spacingHorizontalXXS),
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
    },
    commitDropdown: {
        minWidth: '400px',
        maxWidth: '500px',
    },
    commitOption: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalS),
        minWidth: 0,
    },
    commitHash: {
        fontFamily: tokens.fontFamilyMonospace,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorBrandForeground1,
        backgroundColor: tokens.colorBrandBackground2,
        ...shorthands.padding('2px', '6px'),
        ...shorthands.borderRadius(tokens.borderRadiusSmall),
        flexShrink: 0,
    },
    commitMessage: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
        ...shorthands.overflow('hidden'),
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: tokens.colorNeutralForeground1,
    },
    commitDate: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        flexShrink: 0,
        marginLeft: 'auto',
    },
    commitIdHighlight: {
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorBrandForeground1,
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        ...shorthands.overflow('hidden'),
    },
    editorSection: {
        ...shorthands.padding('6px', tokens.spacingHorizontalM, tokens.spacingVerticalS),
        ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
        backgroundColor: tokens.colorNeutralBackground1,
    },
    editorToolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shorthands.gap(tokens.spacingHorizontalS),
        marginBottom: tokens.spacingVerticalXS,
    },
    editorToolbarLeft: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalS),
    },
    editorToolbarRight: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalS),
    },
    editorHint: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    editor: {
        height: '200px',
        ...shorthands.border('2px', 'solid', tokens.colorNeutralStroke1),
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
        backgroundColor: tokens.colorNeutralBackground1,
    },
    tableHeaderCell: {
        fontWeight: tokens.fontWeightSemibold,
        backgroundColor: tokens.colorNeutralBackground3,
        ...shorthands.borderBottom('2px', 'solid', tokens.colorNeutralStroke1),
        minWidth: '120px',
        maxWidth: '300px',
        ...shorthands.overflow('hidden'),
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    tableCell: {
        minWidth: '120px',
        maxWidth: '300px',
        ...shorthands.overflow('hidden'),
        textOverflow: 'ellipsis',
    },
    resultsSection: {
        ...shorthands.flex(1),
        ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap(tokens.spacingVerticalS),
        minHeight: '0',
        backgroundColor: tokens.colorNeutralBackground2,
    },
    resultsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tableContainer: {
        ...shorthands.flex(1),
        minHeight: '200px',
        ...shorthands.overflow('auto'),
        ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
        backgroundColor: tokens.colorNeutralBackground1,
    },
    emptyState: {
        textAlign: 'center',
        ...shorthands.padding(tokens.spacingVerticalXXXL),
        color: tokens.colorNeutralForeground3,
    },
    pagination: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalM),
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        ...shorthands.gap(tokens.spacingVerticalL),
        ...shorthands.padding(tokens.spacingVerticalXXXL),
    },
    commitDialogSurface: {
        maxWidth: '600px',
    },
    commitDialogContent: {
        display: 'flex',
        flexDirection: 'column',
        ...shorthands.gap(tokens.spacingVerticalL),
    },
    commitMessageField: {
        marginBottom: tokens.spacingVerticalS,
    },
    commitMessageTextarea: {
        width: '100%',
        minHeight: '100px',
    },
});

export interface FileQueryPanelProps {
    workloadClient: WorkloadClientAPI;
    file: FileRecord;
    repositoryId: string;
    branchName: string;
    branchId: string;
    itemId: string;
    workspaceId: string;
    lakehouseId: string;
    lakehouseWorkspaceId: string;
    metadata: GitMetadata;
    onMetadataChange?: (updater: (prev: GitMetadata) => GitMetadata) => void;
    onSave?: () => Promise<void>;
    onClose: () => void;
}

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

// Helper function to truncate commit message
const truncateMessage = (message: string, maxLength: number = 45): string => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength).trim() + '...';
};

export const FileQueryPanel: React.FC<FileQueryPanelProps> = ({
    workloadClient,
    file,
    repositoryId,
    branchName,
    branchId,
    itemId,
    workspaceId,
    lakehouseId,
    lakehouseWorkspaceId,
    metadata,
    onMetadataChange,
    onSave,
    onClose,
}) => {
    const styles = useStyles();
    const editorRef = useRef<any>(null);
    const duckDBClientRef = useRef<DuckDBClient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sqlQuery, setSqlQuery] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [selectedCommitId, setSelectedCommitId] = useState<string>(file.commit_id);
    const [currentFile, setCurrentFile] = useState<FileRecord>(file);
    const [isCommitting, setIsCommitting] = useState(false);
    const [commitDialogOpen, setCommitDialogOpen] = useState(false);
    const [commitMessage, setCommitMessage] = useState('');
    const [showCommitSuccess, setShowCommitSuccess] = useState(false);

    // Initialize DuckDB and load file
    useEffect(() => {
        let isMounted = true;

        // Create a fresh DuckDB instance for this file load
        const duckDBClient = new DuckDBClient();
        duckDBClientRef.current = duckDBClient;

        const initializeAndLoadFile = async () => {
            try {
                setIsLoading(true);
                setLoadError(null);

                await duckDBClient.initialize();

                const fileExtension = getFileExtension(currentFile.physical_location);
                if (!fileExtension) {
                    throw new Error('Unsupported file type. Only CSV and Parquet files are supported.');
                }

                const oneLakeClient = new OneLakeStorageClient(workloadClient);
                const sourceItemWrapper = oneLakeClient.createItemWrapper({
                    id: currentFile.source_item_id,
                    workspaceId: currentFile.source_workspace_id
                });
                
                const base64Content = await sourceItemWrapper.readFileAsBase64(currentFile.physical_location);
                
                if (!base64Content) {
                    throw new Error(`Failed to fetch file from OneLake: ${currentFile.physical_location}`);
                }
                
                const binaryString = atob(base64Content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const fileBlob = new Blob([bytes], { 
                    type: fileExtension === 'csv' ? 'text/csv' : 'application/octet-stream' 
                });
                
                const fileName = currentFile.physical_location.split('/').pop() || 'data.csv';
                await duckDBClient.loadFile(fileName, fileBlob, fileExtension);

                const tableName = getTableNameFromPath(currentFile.physical_location);
                await duckDBClient.createTableFromFile(tableName, fileName, fileExtension);

                if (isMounted) {
                    const initialQuery = `SELECT * FROM ${tableName} LIMIT 100`;
                    setSqlQuery(initialQuery);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to initialize file query view:', error);
                if (isMounted) {
                    setLoadError(error instanceof Error ? error.message : 'Failed to load file');
                    setIsLoading(false);
                }
            }
        };

        initializeAndLoadFile();

        return () => {
            isMounted = false;
            duckDBClient.cleanup();
        };
    }, [currentFile.physical_location, currentFile.source_item_id, currentFile.source_workspace_id, workloadClient, selectedCommitId]);

    // Keyboard shortcut for ESC to close
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // Execute SQL query
    const handleExecute = useCallback(async () => {
        if (!sqlQuery.trim()) {
            setQueryError('Please enter a SQL query');
            return;
        }

        if (!duckDBClientRef.current) {
            setQueryError('DuckDB not initialized');
            return;
        }

        try {
            setIsExecuting(true);
            setQueryError(null);
            setQueryResult(null);
            setPage(0);

            const result = await duckDBClientRef.current.executeQuery(sqlQuery.trim());
            setQueryResult(result);
        } catch (error) {
            console.error('[Execute] Query execution failed:', error);
            setQueryError(error instanceof Error ? error.message : 'Query execution failed');
        } finally {
            setIsExecuting(false);
        }
    }, [sqlQuery]);

    const handleClear = () => {
        setSqlQuery("");
        editorRef.current?.focus();
    };

    // Commit query results as new file version
    const handleCommit = useCallback(async (message: string) => {
        if (!queryResult || !onMetadataChange) return;

        try {
            setIsCommitting(true);
            setCommitDialogOpen(false);

            // Detect original file format
            const fileExtension = getFileExtension(currentFile.physical_location);
            if (!fileExtension) {
                throw new Error('Unsupported file type');
            }

            // Convert query result based on original file format
            let fileContent: string | Uint8Array;
            let contentBlob: Blob;
            
            if (fileExtension === 'csv') {
                // Convert to CSV
                const csvContent = [
                    queryResult.columns.join(','),
                    ...queryResult.rows.map(row => 
                        row.map(cell => {
                            const str = cell === null ? '' : String(cell);
                            return str.includes(',') || str.includes('"') || str.includes('\n')
                                ? `"${str.replace(/"/g, '""')}"`
                                : str;
                        }).join(',')
                    )
                ].join('\n');
                fileContent = csvContent;
                contentBlob = new Blob([csvContent], { type: 'text/csv' });
            } else {
                // For Parquet, use DuckDB to export
                if (!duckDBClientRef.current) {
                    throw new Error('DuckDB not initialized');
                }
                const tempTableName = 'temp_commit_export';
                const exportFileName = 'export.parquet';
                
                // Create temp table from query result
                const createTempTable = `CREATE OR REPLACE TABLE ${tempTableName} AS SELECT * FROM (VALUES ${
                    queryResult.rows.map(row => 
                        `(${row.map(cell => cell === null ? 'NULL' : typeof cell === 'string' ? `'${cell.replace(/'/g, "''")}'` : cell).join(', ')})`
                    ).join(', ')
                })`;
                await duckDBClientRef.current.executeQuery(createTempTable);
                
                // Export to Parquet using DuckDB's COPY command
                await duckDBClientRef.current.executeQuery(
                    `COPY ${tempTableName} TO '${exportFileName}' (FORMAT PARQUET)`
                );
                
                // Read the exported file from DuckDB's virtual filesystem
                const exportedFile = await duckDBClientRef.current.readFile(exportFileName);
                // Copy to a new ArrayBuffer to ensure Blob compatibility
                const buffer = new ArrayBuffer(exportedFile.length);
                const view = new Uint8Array(buffer);
                view.set(exportedFile);
                fileContent = view;
                contentBlob = new Blob([buffer], { type: 'application/octet-stream' });
            }

            // Generate new commit ID
            const newCommitId = crypto.randomUUID();
            const fileName = currentFile.file_path.split('/').pop() || `data.${fileExtension}`;
            const newPhysicalLocation = `Files/.gitfs/${lakehouseId}/Data/${newCommitId}/${fileName}`;

            // STEP 1: Save file to bound Lakehouse (before updating metadata)
            console.log('[Commit] Saving to:', newPhysicalLocation);
            const oneLakeClient = new OneLakeStorageClient(workloadClient);
            const itemWrapper = oneLakeClient.createItemWrapper({ 
                id: lakehouseId,
                workspaceId: lakehouseWorkspaceId
            });
            
            if (typeof fileContent === 'string') {
                await itemWrapper.writeFileAsText(newPhysicalLocation, fileContent);
            } else {
                // For binary content (Parquet), convert to base64
                const base64Content = btoa(String.fromCharCode(...fileContent));
                await itemWrapper.writeFileAsBase64(newPhysicalLocation, base64Content);
            }

            // STEP 2: Create new file record
            const newFileRecord: FileRecord = {
                id: crypto.randomUUID(),
                commit_id: newCommitId,
                file_path: currentFile.file_path,
                physical_location: newPhysicalLocation,
                source_workspace_id: lakehouseWorkspaceId,
                source_item_id: lakehouseId,
                is_reference: false,
                size_bytes: contentBlob.size,
                created_at: new Date().toISOString(),
            };

            // STEP 3: Update metadata (after file is saved)
            onMetadataChange((prev) => ({
                ...prev,
                commits: [
                    ...prev.commits,
                    {
                        id: newCommitId,
                        repository_id: repositoryId,
                        branch_id: branchId,
                        message: message || `Updated ${fileName}`,
                        author: null,
                        created_at: new Date().toISOString(),
                    }
                ],
                files: [
                    ...prev.files,
                    newFileRecord,
                ],
            }));

            // STEP 4: Save metadata
            if (onSave) {
                await onSave();
            }

            // STEP 5: Load the committed file into DuckDB (reuse existing instance, don't reload from OneLake)
            if (duckDBClientRef.current) {
                await duckDBClientRef.current.loadFile(fileName, contentBlob, fileExtension);
                const tableName = getTableNameFromPath(currentFile.file_path);
                await duckDBClientRef.current.createTableFromFile(tableName, fileName, fileExtension);
            }

            // STEP 6: Update UI to show the new commit
            setSelectedCommitId(newCommitId);
            setCurrentFile(newFileRecord);
            setCommitMessage('');
            setShowCommitSuccess(true);
            setTimeout(() => setShowCommitSuccess(false), 5000); // Hide after 5 seconds
            setIsCommitting(false);
        } catch (error) {
            console.error('Failed to commit changes:', error);
            setQueryError(error instanceof Error ? error.message : 'Failed to commit changes');
            setIsCommitting(false);
        }
    }, [queryResult, onMetadataChange, currentFile, itemId, repositoryId, branchId, workloadClient, onSave, workspaceId, lakehouseId, lakehouseWorkspaceId]);

    // Pagination
    const paginatedData = useMemo(() => {
        if (!queryResult) return { rows: [], totalPages: 0 };
        const start = page * ROWS_PER_PAGE;
        const end = start + ROWS_PER_PAGE;
        return {
            rows: queryResult.rows.slice(start, end),
            totalPages: Math.ceil(queryResult.rows.length / ROWS_PER_PAGE),
        };
    }, [queryResult, page]);

    const fileName = currentFile.physical_location.split('/').pop() || 'Unknown File';
    
    // Get all commits for this file's path
    const fileCommits = metadata.files
        .filter(f => f.file_path === file.file_path)
        .map(f => {
            const commit = metadata.commits.find(c => c.id === f.commit_id);
            return { fileRecord: f, commit };
        })
        .filter(fc => fc.commit !== undefined)
        .sort((a, b) => new Date(b.commit!.created_at).getTime() - new Date(a.commit!.created_at).getTime());

    const handleCommitChange = (_: any, data: any) => {
        const newCommitId = data.optionValue;
        if (newCommitId && newCommitId !== selectedCommitId) {
            const newFileRecord = metadata.files.find(f => f.commit_id === newCommitId && f.file_path === file.file_path);
            if (newFileRecord) {
                console.log('[CommitChange] Switching to commit:', newCommitId);
                setSelectedCommitId(newCommitId);
                setCurrentFile(newFileRecord);
                setQueryResult(null);
                setQueryError(null);
            }
        }
    };

    if (isLoading) {
        return (
            <div className={styles.root}>
                <div className={styles.loadingContainer}>
                    <Spinner size="extra-large" />
                    <Text size={400} weight="semibold">Loading file into DuckDB</Text>
                    <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
                        {fileName}
                    </Text>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className={styles.root}>
                <div className={styles.loadingContainer}>
                    <MessageBar intent="error">
                        <MessageBarTitle>Failed to Load File</MessageBarTitle>
                        <MessageBarBody>{loadError}</MessageBarBody>
                    </MessageBar>
                    <Button appearance="primary" onClick={onClose}>Close</Button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.fileInfo}>
                    <Text className={styles.fileName}>{fileName}@{branchName}</Text>
                    <Dropdown
                        className={styles.commitDropdown}
                        value={
                            (() => {
                                const currentCommit = fileCommits.find(fc => fc.fileRecord.commit_id === selectedCommitId);
                                if (currentCommit) {
                                    const hash = currentCommit.commit!.id.substring(0, 8);
                                    const msg = truncateMessage(currentCommit.commit!.message || 'No message', 30);
                                    return `${hash} • ${msg}`;
                                }
                                return selectedCommitId.substring(0, 8);
                            })()
                        }
                        selectedOptions={[selectedCommitId]}
                        onOptionSelect={handleCommitChange}
                        size="small"
                    >
                        {fileCommits.map(fc => {
                            const hash = fc.commit!.id.substring(0, 8);
                            const message = fc.commit!.message || 'No message';
                            const relativeTime = formatRelativeTime(fc.commit!.created_at);
                            const fullText = `${hash} • ${message} • ${relativeTime}`;
                            
                            return (
                                <Option 
                                    key={fc.fileRecord.commit_id} 
                                    value={fc.fileRecord.commit_id}
                                    text={fullText}
                                >
                                    <Tooltip 
                                        content={`${message}\n\nCommit: ${fc.commit!.id}\nDate: ${new Date(fc.commit!.created_at).toLocaleString()}`}
                                        relationship="description"
                                    >
                                        <div className={styles.commitOption}>
                                            <span className={styles.commitHash}>{hash}</span>
                                            <span className={styles.commitMessage}>{truncateMessage(message)}</span>
                                            <span className={styles.commitDate}>{relativeTime}</span>
                                        </div>
                                    </Tooltip>
                                </Option>
                            );
                        })}
                    </Dropdown>
                </div>
                <Tooltip content="Close file" relationship="label">
                    <Button
                        appearance="subtle"
                        icon={<Dismiss24Regular />}
                        onClick={onClose}
                        aria-label="Close file"
                    />
                </Tooltip>
            </div>

            {/* Success Message Bar */}
            {showCommitSuccess && (
                <MessageBar intent="success">
                    <MessageBarTitle>Commit Created</MessageBarTitle>
                    <MessageBarBody>Query results successfully saved as new commit.</MessageBarBody>
                </MessageBar>
            )}

            {/* SQL Editor */}
            <div className={styles.editorSection}>
                <div className={styles.editorToolbar}>
                    <div className={styles.editorToolbarLeft}>
                        <Tooltip content="Execute query (Ctrl+Enter)" relationship="label">
                            <Button
                                appearance="primary"
                                icon={<Play24Regular />}
                                onClick={handleExecute}
                                disabled={isExecuting || !sqlQuery.trim()}
                                size="small"
                            >
                                Execute
                            </Button>
                        </Tooltip>

                        <Button
                            appearance="subtle"
                            icon={<Dismiss24Regular />}
                            onClick={handleClear}
                            disabled={isExecuting}
                            size="small"
                        >
                            Clear
                        </Button>

                        {isExecuting && <Spinner size="tiny" label="Running query..." />}
                    </div>

                    <div className={styles.editorToolbarRight}>
                        <Text className={styles.editorHint}>
                            Press <strong>Ctrl+Enter</strong> to execute
                        </Text>
                    </div>
                </div>

                <div className={styles.editor}>
                    <Editor
                        height="100%"
                        language="sql"
                        value={sqlQuery}
                        onChange={(v) => setSqlQuery(v ?? "")}
                        onMount={(editor, monaco) => {
                            editorRef.current = editor;
                            
                            // Add Ctrl+Enter keyboard shortcut
                            editor.addCommand(
                                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                                handleExecute
                            );
                        }}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                scrollbar: {
                                    verticalScrollbarSize: 10,
                                    horizontalScrollbarSize: 10,
                                },
                            }}
                        />
                    </div>
                </div>

            {/* Results Grid */}
            <div className={styles.resultsSection}>
                {queryError && (
                    <MessageBar intent="error">
                        <MessageBarBody>{queryError}</MessageBarBody>
                    </MessageBar>
                )}

                {queryResult ? (
                    <>
                        <div className={styles.resultsHeader}>
                            <Text weight="semibold">
                                {queryResult.rowCount ?? queryResult.rows.length} rows returned
                            </Text>
                            <Dialog open={commitDialogOpen} onOpenChange={(_, data) => setCommitDialogOpen(data.open)}>
                                <DialogTrigger disableButtonEnhancement>
                                    <Button
                                        icon={<Save24Regular />}
                                        size="small"
                                        disabled={isCommitting || !onMetadataChange}
                                    >
                                        {isCommitting ? 'Committing...' : 'Commit'}
                                    </Button>
                                </DialogTrigger>
                                <DialogSurface className={styles.commitDialogSurface}>
                                    <DialogBody>
                                        <DialogTitle>Create Commit</DialogTitle>
                                        <DialogContent className={styles.commitDialogContent}>
                                            <div className={styles.commitMessageField}>
                                                <Label weight="semibold" style={{ marginBottom: '8px', display: 'block' }}>
                                                    Commit Message
                                                </Label>
                                                <Textarea
                                                    id="commit-message"
                                                    value={commitMessage}
                                                    onChange={(_, data) => setCommitMessage(data.value)}
                                                    placeholder="Describe the changes in this commit..."
                                                    rows={4}
                                                    resize="vertical"
                                                    appearance="filled-darker"
                                                    className={styles.commitMessageTextarea}
                                                />
                                            </div>
                                        </DialogContent>
                                        <DialogActions>
                                            <Button appearance="secondary" onClick={() => setCommitDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button 
                                                appearance="primary" 
                                                onClick={() => handleCommit(commitMessage)}
                                                disabled={isCommitting}
                                            >
                                                {isCommitting ? 'Creating Commit...' : 'Create Commit'}
                                            </Button>
                                        </DialogActions>
                                    </DialogBody>
                                </DialogSurface>
                            </Dialog>
                        </div>

                        <div className={styles.tableContainer}>
                            <Table size="small">
                                <TableHeader>
                                    <TableRow>
                                        {queryResult.columns.map((col, i) => (
                                            <TableHeaderCell key={i} className={styles.tableHeaderCell}>
                                                <Tooltip content={col} relationship="label">
                                                    <span>{col}</span>
                                                </Tooltip>
                                            </TableHeaderCell>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.rows.map((row, rowIdx) => (
                                        <TableRow key={rowIdx}>
                                            {row.map((cell, cellIdx) => (
                                                <TableCell key={cellIdx} className={styles.tableCell}>
                                                    {cell === null ? (
                                                        <Text italic style={{ color: tokens.colorNeutralForeground3 }}>
                                                            NULL
                                                        </Text>
                                                    ) : (
                                                        String(cell)
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {paginatedData.totalPages > 1 && (
                            <div className={styles.pagination}>
                                <Button
                                    icon={<ChevronLeft24Regular />}
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    size="small"
                                />
                                <Text>
                                    Page {page + 1} of {paginatedData.totalPages}
                                </Text>
                                <Button
                                    icon={<ChevronRight24Regular />}
                                    onClick={() => setPage(p => Math.min(paginatedData.totalPages - 1, p + 1))}
                                    disabled={page >= paginatedData.totalPages - 1}
                                    size="small"
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <Text size={300}>Execute a query to see results</Text>
                    </div>
                )}
            </div>
        </div>
    );
};
