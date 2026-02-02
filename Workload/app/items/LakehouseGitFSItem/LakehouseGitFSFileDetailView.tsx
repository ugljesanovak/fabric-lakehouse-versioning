import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  Body1,
  Caption1,
  tokens,
  Badge,
  Divider,
} from "@fluentui/react-components";
import {
  Document20Regular,
  HistoryRegular,
} from "@fluentui/react-icons";
import { FileRecord, GitMetadata } from "./LakehouseGitFSItemDefinition";
import { ItemEditorDetailView } from "../../components/ItemEditor";

interface LakehouseGitFSFileDetailViewProps {
  file: FileRecord;
  metadata: GitMetadata;
}

export const LakehouseGitFSFileDetailView: React.FC<LakehouseGitFSFileDetailViewProps> = ({ file, metadata }) => {
  const { t } = useTranslation();
  
  const fileName = file.file_path.split('/').pop() || file.file_path;
  
  // Get all commits that modified this file
  const fileHistory = metadata.files
    .filter(f => f.file_path === file.file_path)
    .map(f => ({
      file: f,
      commit: metadata.commits.find(c => c.id === f.commit_id)
    }))
    .filter(item => item.commit)
    .sort((a, b) => 
      new Date(b.commit!.created_at).getTime() - new Date(a.commit!.created_at).getTime()
    );

  const currentCommit = metadata.commits.find(c => c.id === file.commit_id);

  return (
    <ItemEditorDetailView
      center={{
        content: (
          <div>
            {/* File Header */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Document20Regular style={{ fontSize: '24px' }} />
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{fileName}</h2>
              </div>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                {file.file_path}
              </Caption1>
            </div>

            {/* File Information Card */}
            <Card style={{ marginBottom: '24px' }}>
              <CardHeader
                header={<Body1 style={{ fontWeight: 600 }}>{t('LakehouseGitFS_FileInfo_Label', 'File Information')}</Body1>}
              />
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Caption1>{t('LakehouseGitFS_FilePath_Label', 'Path')}:</Caption1>
                  <Body1>{file.file_path}</Body1>
                </div>
                <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Caption1>{t('LakehouseGitFS_FileSize_Label', 'Size')}:</Caption1>
            <Body1>
              {file.size_bytes 
                ? `${(file.size_bytes / 1024).toFixed(2)} KB` 
                : t('LakehouseGitFS_Unknown_Label', 'Unknown')
              }
            </Body1>
          </div>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Caption1>{t('LakehouseGitFS_FileType_Label', 'Type')}:</Caption1>
            <Body1>
              {file.is_reference 
                ? t('LakehouseGitFS_Reference_Label', 'Reference') 
                : t('LakehouseGitFS_Copied_Label', 'Copied')
              }
            </Body1>
          </div>
          <Divider />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Caption1>{t('LakehouseGitFS_PhysicalLocation_Label', 'Physical Location')}:</Caption1>
            <Body1 style={{ fontSize: '12px', fontFamily: 'monospace', textAlign: 'right', maxWidth: '60%' }}>
              {file.physical_location}
            </Body1>
          </div>
        </div>
      </Card>

      {/* Current Commit Card */}
      {currentCommit && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader
            header={<Body1 style={{ fontWeight: 600 }}>{t('LakehouseGitFS_CurrentCommit_Label', 'Current Commit')}</Body1>}
          />
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Badge 
                appearance="filled" 
                color="brand"
                style={{ fontFamily: 'monospace', fontSize: '11px' }}
              >
                {currentCommit.id.substring(0, 7)}
              </Badge>
              <Body1>{currentCommit.message || t('LakehouseGitFS_NoMessage_Label', 'No message')}</Body1>
            </div>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              {currentCommit.author} · {new Date(currentCommit.created_at).toLocaleString()}
            </Caption1>
          </div>
        </Card>
      )}

      {/* Commit History/Lineage */}
      <Card>
        <CardHeader
          header={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HistoryRegular />
              <Body1 style={{ fontWeight: 600 }}>
                {t('LakehouseGitFS_CommitHistory_Label', 'Commit History')}
              </Body1>
              <Badge appearance="tint" size="small">{fileHistory.length}</Badge>
            </div>
          }
        />
        <div style={{ padding: '12px 16px' }}>
          {fileHistory.length === 0 ? (
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              {t('LakehouseGitFS_NoHistory_Message', 'No commit history available')}
            </Caption1>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {fileHistory.map((item, idx) => (
                <div key={item.file.id} style={{ display: 'flex', gap: '12px' }}>
                  {/* Timeline indicator */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    minWidth: '24px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? tokens.colorBrandBackground : tokens.colorNeutralBackground4,
                      border: `2px solid ${idx === 0 ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground3}`
                    }} />
                    {idx < fileHistory.length - 1 && (
                      <div style={{
                        width: '2px',
                        flex: 1,
                        minHeight: '40px',
                        backgroundColor: tokens.colorNeutralBackground4
                      }} />
                    )}
                  </div>
                  
                  {/* Commit details */}
                  <div style={{ flex: 1, paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Badge 
                        appearance={idx === 0 ? "filled" : "outline"}
                        color={idx === 0 ? "brand" : "subtle"}
                        style={{ fontFamily: 'monospace', fontSize: '10px' }}
                      >
                        {item.commit!.id.substring(0, 7)}
                      </Badge>
                      <Body1 style={{ fontSize: '14px' }}>
                        {item.commit!.message || t('LakehouseGitFS_NoMessage_Label', 'No message')}
                      </Body1>
                    </div>
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                      {item.commit!.author} · {new Date(item.commit!.created_at).toLocaleString()}
                    </Caption1>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
          </div>
        )
      }}
    />
  );
};
