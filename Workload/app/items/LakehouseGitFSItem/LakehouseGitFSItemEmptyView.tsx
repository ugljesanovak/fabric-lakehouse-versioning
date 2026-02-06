import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DatabaseLink20Regular } from "@fluentui/react-icons";

import { WorkloadClientAPI, NotificationType } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { LakehouseGitFSItemDefinition } from "./LakehouseGitFSItemDefinition";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";
import { callDatahubOpen } from "../../controller/DataHubController";
import { callNotificationOpen } from "../../controller/NotificationController";
import "./LakehouseGitFSItem.scss";

interface LakehouseGitFSItemEmptyViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<LakehouseGitFSItemDefinition>;
  currentDefinition: LakehouseGitFSItemDefinition;
  setCurrentDefinition: (definition: LakehouseGitFSItemDefinition) => void;
  onSaveItem: () => Promise<void>;
  onNavigateToDefaultView: () => void;
}

/**
 * Empty state component - handles lakehouse binding workflow
 * 
 * Two scenarios:
 * 1. isBinded=true: Lakehouse already bound - show info and navigate to default view
 * 2. isBinded=false: No lakehouse bound - show selection button to open DataHub
 * 
 * This component uses the ItemEditorEmptyView control for consistency
 * across all item types.
 */
export function LakehouseGitFSItemEmptyView({
  workloadClient,
  item,
  currentDefinition,
  setCurrentDefinition,
  onSaveItem,
  onNavigateToDefaultView
}: LakehouseGitFSItemEmptyViewProps) {
  const { t } = useTranslation();
  const [isBinding, setIsBinding] = useState(false);

  // If lakehouse is already bound, auto-navigate to default view
  useEffect(() => {
    if (currentDefinition?.isBinded && currentDefinition?.lakehouseId) {
      console.log('Lakehouse already bound, navigating to default view');
      onNavigateToDefaultView();
    }
  }, [currentDefinition?.isBinded, currentDefinition?.lakehouseId, onNavigateToDefaultView]);

  // Handle lakehouse selection via DataHub
  const handleSelectLakehouse = async () => {
    setIsBinding(true);
    try {
      const selectedItem = await callDatahubOpen(
        workloadClient,
        ["Lakehouse"],
        t('LakehouseGitFSItemEmptyView_SelectLakehouse_Description', 'Select a Lakehouse to bind this Version Controlled Lakehouse'),
        false,
        true
      );

      if (selectedItem) {
        // Create updated definition with lakehouse binding
        const updatedDefinition: LakehouseGitFSItemDefinition = {
          ...currentDefinition,
          lakehouseId: selectedItem.id,
          lakehouseWorkspaceId: selectedItem.workspaceId,
          isBinded: true,
          metadata: {
            repositories: [],
            branches: [],
            commits: [],
            files: []
          }
        };

        // Update definition state
        setCurrentDefinition(updatedDefinition);

        // IMPORTANT: Update the item's definition directly before saving
        // This ensures the save uses the updated definition
        if (item) {
          item.definition = updatedDefinition;
        }

        // Save the item with new binding
        await onSaveItem();

        // Navigate to default view
        onNavigateToDefaultView();
      }
    } catch (error) {
      console.error('Failed to select lakehouse:', error);
      callNotificationOpen(
        workloadClient,
        t('LakehouseGitFSItemEmptyView_Binding_Error_Title', 'Binding Failed'),
        t('LakehouseGitFSItemEmptyView_Binding_Error_Message', 'Failed to bind Lakehouse. Please try again.'),
        NotificationType.Error,
        undefined
      );
    } finally {
      setIsBinding(false);
    }
  };

  // Show lakehouse ID if already bound (edge case - shouldn't normally reach here due to useEffect)
  if (currentDefinition?.isBinded && currentDefinition?.lakehouseId) {
    return (
      <ItemEditorEmptyView
        title={t('LakehouseGitFSItemEmptyView_AlreadyBound_Title', 'Lakehouse Already Bound')}
        description={t('LakehouseGitFSItemEmptyView_AlreadyBound_Description', 'Lakehouse ID: {lakehouseId}', { lakehouseId: currentDefinition.lakehouseId })}
        imageSrc="/assets/items/LakehouseGitFSItem/EditorEmpty.svg"
        imageAlt="Empty state illustration"
        tasks={[]}
      />
    );
  }

  // Define onboarding task - select lakehouse
  const tasks: EmptyStateTask[] = [
    {
      id: 'select-lakehouse',
      label: isBinding
        ? t('LakehouseGitFSItemEmptyView_Binding_InProgress', 'Binding...')
        : t('LakehouseGitFSItemEmptyView_SelectButton', 'Select Lakehouse'),
      icon: isBinding ? undefined : <DatabaseLink20Regular />,
      description: t('LakehouseGitFSItemEmptyView_SelectButton_Description', 'Choose a Lakehouse to bind this Version Controlled Lakehouse.'),
      onClick: isBinding ? () => {} : handleSelectLakehouse
    }
  ];

  return (
    <ItemEditorEmptyView
      title={t('LakehouseGitFSItemEmptyView_Title', 'Welcome to Version Controlled Lakehouse!')}
      description={t('LakehouseGitFSItemEmptyView_Description', 'This item must be bound to a Lakehouse before it can be used.')}
      imageSrc="/assets/items/LakehouseGitFSItem/EditorEmpty.svg"
      imageAlt="Empty state illustration"
      tasks={tasks}
    />
  );
}
