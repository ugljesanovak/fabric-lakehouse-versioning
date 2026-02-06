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
    Badge,
    Checkbox,
    Input,
    Menu,
    MenuTrigger,
    MenuPopover,
    MenuList,
    MenuItem,
} from '@fluentui/react-components';
import {
    Dismiss24Regular,
    Play24Regular,
    ChevronLeft24Regular,
    ChevronRight24Regular,
    Save24Regular,
    ArrowSync24Regular,
    Database24Regular,
    Checkmark24Filled,
    DocumentRegular,
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
        ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke1),
        minHeight: '44px',
    },
    fileInfo: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalS),
        flexGrow: 1,
        minWidth: 0,
    },
    fileIcon: {
        color: tokens.colorBrandForeground1,
        fontSize: '20px',
        flexShrink: 0,
    },
    fileName: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
        flexShrink: 0,
    },
    branchBadge: {
        flexShrink: 0,
    },
    separator: {
        color: tokens.colorNeutralForeground3,
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightBold,
        flexShrink: 0,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        ...shorthands.gap(tokens.spacingHorizontalS),
        flexShrink: 0,
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
        minWidth: '320px',
        maxWidth: '450px',
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
    const [saveAsNew, setSaveAsNew] = useState(false);
    const [customFileName, setCustomFileName] = useState('');
    const [showCommitSuccess, setShowCommitSuccess] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [additionalLoadedFiles, setAdditionalLoadedFiles] = useState<Set<string>>(new Set());
    const [isLoadingAdditionalFile, setIsLoadingAdditionalFile] = useState(false);

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
                setAdditionalLoadedFiles(new Set()); // Reset loaded files when switching commits/files

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

    // Get files available in the current commit (excluding the pinned file)
    const availableFilesInCommit = useMemo(() => {
        return metadata.files
            .filter(f => f.commit_id === selectedCommitId && f.file_path !== currentFile.file_path)
            .sort((a, b) => a.file_path.localeCompare(b.file_path));
    }, [metadata.files, selectedCommitId, currentFile.file_path]);

    // Load additional file into DuckDB for joins
    const loadAdditionalFile = useCallback(async (fileRecord: FileRecord) => {
        if (!duckDBClientRef.current) return;

        try {
            setIsLoadingAdditionalFile(true);
            const fileExtension = getFileExtension(fileRecord.physical_location);
            if (!fileExtension) {
                throw new Error('Unsupported file type. Only CSV and Parquet files are supported.');
            }

            const oneLakeClient = new OneLakeStorageClient(workloadClient);
            const sourceItemWrapper = oneLakeClient.createItemWrapper({
                id: fileRecord.source_item_id,
                workspaceId: fileRecord.source_workspace_id
            });
            
            const base64Content = await sourceItemWrapper.readFileAsBase64(fileRecord.physical_location);
            
            if (!base64Content) {
                throw new Error(`Failed to fetch file from OneLake: ${fileRecord.physical_location}`);
            }
            
            const binaryString = atob(base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const fileBlob = new Blob([bytes], { 
                type: fileExtension === 'csv' ? 'text/csv' : 'application/octet-stream' 
            });
            
            const fileName = fileRecord.physical_location.split('/').pop() || `data.${fileExtension}`;
            await duckDBClientRef.current.loadFile(fileName, fileBlob, fileExtension);

            const tableName = getTableNameFromPath(fileRecord.file_path);
            await duckDBClientRef.current.createTableFromFile(tableName, fileName, fileExtension);

            setAdditionalLoadedFiles(prev => new Set(prev).add(fileRecord.file_path));
            console.log(`[LoadAdditionalFile] Loaded ${fileRecord.file_path} as table ${tableName}`);
        } catch (error) {
            console.error('Failed to load additional file:', error);
            setQueryError(error instanceof Error ? error.message : 'Failed to load file');
        } finally {
            setIsLoadingAdditionalFile(false);
        }
    }, [workloadClient]);

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
    const handleCommit = useCallback(async (message: string, saveAsNew: boolean, customFileName: string) => {
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
            
            // Determine filename: use custom name if saveAsNew, otherwise use original
            let fileName: string;
            let filePath: string;
            
            if (saveAsNew && customFileName.trim()) {
                // Ensure the custom filename has the correct extension
                const customName = customFileName.trim();
                const hasExtension = customName.endsWith(`.${fileExtension}`);
                fileName = hasExtension ? customName : `${customName}.${fileExtension}`;
                filePath = fileName; // New file at repository root
            } else {
                // Overwrite mode: use original file path
                fileName = currentFile.file_path.split('/').pop() || `data.${fileExtension}`;
                filePath = currentFile.file_path;
            }
            
            const newPhysicalLocation = `Files/.gitfs/${itemId}/Data/${newCommitId}/${fileName}`;

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

            // STEP 2: Get current HEAD to set as parent
            const currentBranch = metadata.branches.find(b => b.id === branchId);
            const parentCommitId = currentBranch?.head_commit_id || null;

            // STEP 3: Create snapshot - copy all files from parent commit + add/replace current file
            const parentFiles = parentCommitId 
                ? metadata.files.filter(f => f.commit_id === parentCommitId)
                : [];

            // Create new file record for the committed file
            const newFileRecord: FileRecord = {
                id: crypto.randomUUID(),
                commit_id: newCommitId,
                file_path: filePath,
                physical_location: newPhysicalLocation,
                source_workspace_id: lakehouseWorkspaceId,
                source_item_id: lakehouseId,
                is_reference: false,
                size_bytes: contentBlob.size,
                created_at: new Date().toISOString(),
            };

            // Clone parent files with new commit_id (snapshot model)
            const clonedParentFiles = parentFiles
                .filter(f => f.file_path !== filePath) // Exclude file being updated/replaced
                .map(f => ({
                    ...f,
                    id: crypto.randomUUID(), // New ID for the file record
                    commit_id: newCommitId,  // Point to new commit
                    // Keep same physical_location (file data doesn't change)
                }));

            // Combine: cloned parent files + new/modified file
            const newCommitFiles = [...clonedParentFiles, newFileRecord];

            // STEP 4: Update metadata (after file is saved)
            onMetadataChange((prev) => ({
                ...prev,
                commits: [
                    ...prev.commits,
                    {
                        id: newCommitId,
                        repository_id: repositoryId,
                        branch_id: branchId,
                        parent_commit_id: parentCommitId,
                        message: message || `Updated ${fileName}`,
                        author: null,
                        created_at: new Date().toISOString(),
                    }
                ],
                branches: prev.branches.map(b => 
                    b.id === branchId ? { ...b, head_commit_id: newCommitId } : b
                ),
                files: [
                    ...prev.files,
                    ...newCommitFiles,
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
    }, [queryResult, onMetadataChange, currentFile, itemId, repositoryId, branchId, metadata, workloadClient, onSave, workspaceId, lakehouseId, lakehouseWorkspaceId]);

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
    
    // Get commits for this branch: reachable from HEAD + orphans created on this branch
    const branchCommitIds = useMemo(() => {
        const currentBranch = metadata.branches.find(b => b.id === branchId);
        if (!currentBranch) return new Set<string>();

        // 1. Get commits reachable from HEAD
        const reachable = new Set<string>();
        let currentId: string | null = currentBranch.head_commit_id;
        
        while (currentId) {
            if (reachable.has(currentId)) break;
            reachable.add(currentId);
            const commit = metadata.commits.find(c => c.id === currentId);
            currentId = commit?.parent_commit_id || null;
        }
        
        // 2. Add orphaned commits that were created on THIS branch
        const branchOrphans = metadata.commits
            .filter(c => c.branch_id === branchId && !reachable.has(c.id));
        
        branchOrphans.forEach(c => reachable.add(c.id));
        
        return reachable;
    }, [branchId, metadata.branches, metadata.commits]);
    
    // Get all commits for this file's path that are part of this branch
    const fileCommits = metadata.files
        .filter(f => f.file_path === file.file_path && branchCommitIds.has(f.commit_id))
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

    // Calculate orphaned commits that will be created by reset
    const orphanedCommitsCount = useMemo(() => {
        const currentBranch = metadata.branches.find(b => b.id === branchId);
        if (!currentBranch || currentBranch.head_commit_id === selectedCommitId) return 0;

        // Find all commits reachable from current HEAD
        const reachableFromCurrent = new Set<string>();
        let currentId: string | null = currentBranch.head_commit_id;
        while (currentId) {
            if (reachableFromCurrent.has(currentId)) break;
            reachableFromCurrent.add(currentId);
            const commit = metadata.commits.find(c => c.id === currentId);
            currentId = commit?.parent_commit_id || null;
        }

        // Find all commits reachable from selected commit
        const reachableFromSelected = new Set<string>();
        let selectedId: string | null = selectedCommitId;
        while (selectedId) {
            if (reachableFromSelected.has(selectedId)) break;
            reachableFromSelected.add(selectedId);
            const commit = metadata.commits.find(c => c.id === selectedId);
            selectedId = commit?.parent_commit_id || null;
        }

        // Orphaned = reachable from current but not from selected
        return Array.from(reachableFromCurrent).filter(id => !reachableFromSelected.has(id)).length;
    }, [selectedCommitId, branchId, metadata.branches, metadata.commits]);

    // Check if a commit is orphaned (not reachable from HEAD)
    const isCommitOrphaned = useCallback((commitId: string) => {
        const currentBranch = metadata.branches.find(b => b.id === branchId);
        if (!currentBranch) return false;

        // Find commits reachable from HEAD
        const reachableFromHead = new Set<string>();
        let currentId: string | null = currentBranch.head_commit_id;
        while (currentId) {
            if (reachableFromHead.has(currentId)) break;
            reachableFromHead.add(currentId);
            const commit = metadata.commits.find(c => c.id === currentId);
            currentId = commit?.parent_commit_id || null;
        }

        // Commit is orphaned if it's not reachable from HEAD
        return !reachableFromHead.has(commitId);
    }, [branchId, metadata.branches, metadata.commits]);

    // Reset handler - moves HEAD to selected commit (with confirmation)
    const handleReset = useCallback(async () => {
        if (!onMetadataChange || !onSave) return;

        try {
            setIsCheckingOut(true);
            setResetDialogOpen(false);
            console.log('[Reset] Moving HEAD to commit:', selectedCommitId);

            // Update branch to point HEAD to selected commit
            onMetadataChange((prev) => ({
                ...prev,
                branches: prev.branches.map(b =>
                    b.id === branchId ? { ...b, head_commit_id: selectedCommitId } : b
                ),
            }));

            // Save metadata
            await onSave();

            console.log('[Reset] ✅ HEAD moved to commit:', selectedCommitId);
            setIsCheckingOut(false);
        } catch (error) {
            console.error('[Reset] Failed:', error);
            setQueryError(error instanceof Error ? error.message : 'Failed to reset branch');
            setIsCheckingOut(false);
        }
    }, [selectedCommitId, branchId, onMetadataChange, onSave]);

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
                    <DocumentRegular className={styles.fileIcon} />
                    <Text className={styles.fileName}>{fileName}</Text>
                    <Badge 
                        appearance="filled" 
                        color="brand" 
                        size="small"
                        className={styles.branchBadge}
                    >
                        {branchName}
                    </Badge>
                    <span className={styles.separator}>•</span>
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
                            const isHead = metadata.branches.find(b => b.id === branchId)?.head_commit_id === fc.commit!.id;
                            
                            return (
                                <Option 
                                    key={fc.fileRecord.commit_id} 
                                    value={fc.fileRecord.commit_id}
                                    text={fullText}
                                >
                                    <Tooltip 
                                        content={`${message}\n\nCommit: ${fc.commit!.id}\nDate: ${new Date(fc.commit!.created_at).toLocaleString()}${isHead ? '\n\n✓ Current HEAD' : ''}`}
                                        relationship="description"
                                    >
                                        <div className={styles.commitOption}>
                                            <span className={styles.commitHash}>{hash}</span>
                                            <span className={styles.commitMessage}>{truncateMessage(message)}</span>
                                            <span className={styles.commitDate}>{relativeTime}</span>
                                            {isHead && <Badge appearance="filled" color="brand" size="small" style={{ marginLeft: 'auto' }}>HEAD</Badge>}
                                            {isCommitOrphaned(fc.commit!.id) && !isHead && <Badge appearance="tint" color="warning" size="small" style={{ marginLeft: isHead ? '4px' : 'auto' }}>Orphaned</Badge>}
                                        </div>
                                    </Tooltip>
                                </Option>
                            );
                        })}
                    </Dropdown>
                </div>
                <div className={styles.headerActions}>
                    {/* Reset button */}
                    {(() => {
                        const currentBranch = metadata.branches.find(b => b.id === branchId);
                        const isNotHead = currentBranch?.head_commit_id !== selectedCommitId;
                        return isNotHead && (
                            <Tooltip content="Reset branch to this commit (may create orphaned commits)" relationship="label">
                                <Button
                                    appearance="subtle"
                                    icon={<ArrowSync24Regular />}
                                    onClick={() => setResetDialogOpen(true)}
                                    disabled={isCheckingOut}
                                    size="small"
                                    aria-label="Reset branch to commit"
                                >
                                    {isCheckingOut ? 'Resetting...' : 'Reset'}
                                </Button>
                            </Tooltip>
                        );
                    })()}
                    <Tooltip content="Close file" relationship="label">
                        <Button
                            appearance="subtle"
                            icon={<Dismiss24Regular />}
                            onClick={onClose}
                            aria-label="Close file"
                        />
                    </Tooltip>
                </div>
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

                        {/* Load Additional Files Menu */}
                        <Menu>
                            <MenuTrigger disableButtonEnhancement>
                                <Tooltip content="Load additional files from this commit for joins" relationship="label">
                                    <Button
                                        appearance="subtle"
                                        icon={<Database24Regular />}
                                        disabled={isLoadingAdditionalFile || availableFilesInCommit.length === 0}
                                        size="small"
                                    >
                                        Load Files ({additionalLoadedFiles.size})
                                    </Button>
                                </Tooltip>
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    {availableFilesInCommit.length === 0 ? (
                                        <MenuItem disabled>No other files in this commit</MenuItem>
                                    ) : (
                                        availableFilesInCommit.map((fileRecord) => {
                                            const isLoaded = additionalLoadedFiles.has(fileRecord.file_path);
                                            const tableName = getTableNameFromPath(fileRecord.file_path);
                                            return (
                                                <MenuItem
                                                    key={fileRecord.id}
                                                    onClick={() => !isLoaded && loadAdditionalFile(fileRecord)}
                                                    disabled={isLoaded}
                                                    icon={isLoaded ? <Checkmark24Filled /> : undefined}
                                                >
                                                    {fileRecord.file_path}
                                                    {isLoaded && (
                                                        <Badge 
                                                            appearance="filled" 
                                                            color="success" 
                                                            size="small" 
                                                            style={{ marginLeft: '8px' }}
                                                        >
                                                            loaded as {tableName}
                                                        </Badge>
                                                    )}
                                                </MenuItem>
                                            );
                                        })
                                    )}
                                </MenuList>
                            </MenuPopover>
                        </Menu>

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
                            <Dialog open={commitDialogOpen} onOpenChange={(_, data) => {
                                setCommitDialogOpen(data.open);
                                if (data.open) {
                                    // Reset state when dialog opens
                                    setSaveAsNew(false);
                                    setCustomFileName('');
                                }
                            }}>
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
                                            <div style={{ marginTop: '16px' }}>
                                                <Checkbox
                                                    checked={saveAsNew}
                                                    onChange={(_, data) => {
                                                        setSaveAsNew(!!data.checked);
                                                        if (!data.checked) {
                                                            setCustomFileName('');
                                                        }
                                                    }}
                                                    label="Save as new file"
                                                />
                                            </div>
                                            {saveAsNew && (
                                                <div style={{ marginTop: '12px' }}>
                                                    <Label weight="semibold" style={{ marginBottom: '8px', display: 'block' }}>
                                                        New File Name
                                                    </Label>
                                                    <Input
                                                        value={customFileName}
                                                        onChange={(_, data) => setCustomFileName(data.value)}
                                                        placeholder={`e.g., ${currentFile.file_path.split('/').pop()?.replace(/\.[^.]+$/, '_filtered$&') || 'result.csv'}`}
                                                        appearance="filled-darker"
                                                    />
                                                    <Text size={200} style={{ marginTop: '4px', display: 'block', color: tokens.colorNeutralForeground3 }}>
                                                        File will be saved as: {customFileName || currentFile.file_path}
                                                    </Text>
                                                </div>
                                            )}
                                        </DialogContent>
                                        <DialogActions>
                                            <Button appearance="secondary" onClick={() => setCommitDialogOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button 
                                                appearance="primary" 
                                                onClick={() => handleCommit(commitMessage, saveAsNew, customFileName)}
                                                disabled={isCommitting || (saveAsNew && !customFileName.trim())}
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

            {/* Reset confirmation dialog */}
            <Dialog open={resetDialogOpen} onOpenChange={(_, data) => setResetDialogOpen(data.open)}>
                <DialogSurface>
                    <DialogBody>
                        <DialogTitle>Reset Branch to Commit?</DialogTitle>
                        <DialogContent>
                            {orphanedCommitsCount > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                                    <MessageBar intent="warning">
                                        <MessageBarBody>
                                            <MessageBarTitle>Warning: This will create orphaned commits</MessageBarTitle>
                                            Resetting to this commit will orphan <strong>{orphanedCommitsCount}</strong> commit{orphanedCommitsCount !== 1 ? 's' : ''} 
                                            that are currently reachable from HEAD. These commits will no longer be in the main branch history 
                                            but can still be accessed if needed.
                                        </MessageBarBody>
                                    </MessageBar>
                                    <Text>
                                        Are you sure you want to reset branch <strong>{branchName}</strong> to commit{' '}
                                        <Badge size="small" appearance="tint" color="brand">
                                            {selectedCommitId.substring(0, 7)}
                                        </Badge>?
                                    </Text>
                                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                                        Tip: Consider creating a new branch instead to preserve all commits.
                                    </Text>
                                </div>
                            ) : (
                                <Text>
                                    Are you sure you want to reset branch <strong>{branchName}</strong> to commit{' '}
                                    <Badge size="small" appearance="tint" color="brand">
                                        {selectedCommitId.substring(0, 7)}
                                    </Badge>?
                                </Text>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button appearance="secondary" onClick={() => setResetDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                appearance="primary" 
                                onClick={handleReset}
                                disabled={isCheckingOut}
                            >
                                {isCheckingOut ? 'Resetting...' : 'Reset Branch'}
                            </Button>
                        </DialogActions>
                    </DialogBody>
                </DialogSurface>
            </Dialog>
        </div>
    );
};
