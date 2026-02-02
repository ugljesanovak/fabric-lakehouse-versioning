import React from "react";
import { PageProps } from '../../App';
import { 
  Ribbon, 
  RibbonAction,
  RibbonActionButton,
  createSaveAction,
  createSettingsAction
} from '../../components/ItemEditor';
import { ViewContext } from '../../components';
import { Database24Regular } from '@fluentui/react-icons';
import { navigateToItem } from '../../controller/NavigationController';
import { LakehouseGitFSItemDefinition, Repository, Branch } from './LakehouseGitFSItemDefinition';
import { useTranslation } from 'react-i18next';
import { callNotificationOpen } from '../../controller/NotificationController';
import { NotificationType } from '@ms-fabric/workload-client';

/**
 * Props interface for the LakehouseGitFS Ribbon component
 */
export interface LakehouseGitFSItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  currentDefinition: LakehouseGitFSItemDefinition;
  selectedRepository: Repository | null;
  selectedBranch: Branch | null;
  onBranchChange: (branch: Branch | null) => void;
}

/**
 * LakehouseGitFSItemRibbon - Demonstrates the recommended ribbon pattern
 * 
 * This demonstrates the recommended pattern for creating consistent ribbons
 * across all item editors in the Fabric Extensibility Toolkit.
 * 
 * Key Features:
 * - Uses Ribbon with clean API pattern
 * - Uses action factories with automatic internationalization
 * - Defines homeToolbarActions (mandatory Home tab actions)
 * - Demonstrates additional toolbars with Test tab
 * - Shows how to add custom actions
 * - Maintains accessibility with built-in Tooltip + ToolbarButton pattern
 * - Follows Fabric design guidelines
 */
export function LakehouseGitFSItemRibbon(props: LakehouseGitFSItemRibbonProps) {
  const { viewContext, currentDefinition } = props;
  const { t } = useTranslation();
  
  // Save action that saves item definition (including metadata)
  const saveAction = createSaveAction(
    async () => {
      try {
        await props.saveItemCallback();
      } catch (error) {
        callNotificationOpen(
          props.workloadClient,
          t('LakehouseGitFS_Save_Error_Title', 'Save Failed'),
          t('LakehouseGitFS_Save_Error_Message', 'Failed to save item definition.'),
          NotificationType.Error,
          undefined
        );
      }
    },
    !props.isSaveButtonEnabled
  );
  
  const settingsAction = createSettingsAction(
    props.openSettingsCallback
  );
  
  // Open Lakehouse action
  const openLakehouseAction: RibbonAction = {
    key: 'open-lakehouse',
    icon: Database24Regular,
    label: t('LakehouseGitFS_Ribbon_OpenLakehouse_Label', 'Open Lakehouse'),
    onClick: async () => {
      if (currentDefinition?.lakehouseId && currentDefinition?.lakehouseWorkspaceId) {
        await navigateToItem(props.workloadClient, {
          id: currentDefinition.lakehouseId,
          workspaceId: currentDefinition.lakehouseWorkspaceId,
          type: 'Lakehouse',
          displayName: '',
          description: ''
        });
      }
    },
    testId: 'ribbon-open-lakehouse-btn',
    tooltip: t('LakehouseGitFS_Ribbon_OpenLakehouse_Tooltip', 'Open the bound Lakehouse'),
    disabled: !currentDefinition?.lakehouseId
  };
  

  const ribbonActions: RibbonActionButton[] = [
    // TODO: Add branch selector as custom content when Ribbon supports it
    // Uncoment when you want to see how the action looks
    // SAMPLE RIBBON ACTION
    /*{
      key: 'share-item',
      icon: Share24Regular,
      label: t("ItemEditor_Ribbon_Share_Label", "Share"),
      onClick: async () => {
        // Sample share functionality
        console.log("Share action clicked!");       
      },
      testId: 'ribbon-share-btn',
      tooltip: t("ItemEditor_Ribbon_Share_Tooltip", "Share this item with others")
    }*/
  ]

  // Define home toolbar actions - these appear on the mandatory Home toolbar
  const homeToolbarActions: RibbonAction[] = [
    saveAction,
    openLakehouseAction,
    settingsAction,

    // CUSTOM ACTION EXAMPLE: Getting Started navigation
    // This demonstrates how to create custom actions for view navigation
    /*{
      key: 'getting-started',
      icon: Rocket24Regular,
      label: t("ItemEditor_Ribbon_GettingStarted_Label", "Getting Started"),
      onClick: () => {
        console.log("Open getting started!")
      },
      testId: 'ribbon-getting-started-btn',
    }*/
  ];

  
  return (
    <Ribbon 
      homeToolbarActions={homeToolbarActions} 
      // ADDITIONAL TOOLBAR EXAMPLE
      // This demonstrates how you can add an addtional toolbar
      additionalToolbars={[
        //Uncomment when you want to see how a 2nd toolbar looks
        /*{
          key: 'edit',
          label: "Edit",
          actions: [
                    settingsAction
                  ]
        }*/
      ]}
      rightActionButtons={ribbonActions} // Added sample share action
      viewContext={viewContext}
    />
  );
}
