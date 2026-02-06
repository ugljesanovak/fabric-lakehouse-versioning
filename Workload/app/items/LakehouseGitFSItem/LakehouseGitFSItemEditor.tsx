import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody
} from "@fluentui/react-components";
import { NotificationType } from "@ms-fabric/workload-client";
import {
  Dismiss20Regular,
  Warning20Filled
} from "@fluentui/react-icons";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveWorkloadItem } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditor, useViewNavigation, RegisteredNotification } from "../../components/ItemEditor";
import { OneLakeStorageClient, OneLakeStorageClientItemWrapper } from "../../clients";
import { LakehouseGitFSItemDefinition, Branch } from "./LakehouseGitFSItemDefinition";
import { LakehouseGitFSItemEmptyView } from "./LakehouseGitFSItemEmptyView";
import { LakehouseGitFSItemDefaultView } from "./LakehouseGitFSItemDefaultView";
import { LakehouseGitFSItemRibbon } from "./LakehouseGitFSItemRibbon";
import "./LakehouseGitFSItem.scss";

/**
 * Different views that are available for the LakehouseGitFS item
 */
export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
} as const;


export function LakehouseGitFSItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<LakehouseGitFSItemDefinition>>();
  const [currentDefinition, setCurrentDefinition] = useState<LakehouseGitFSItemDefinition>({});
  const [storageWrapper, setStorageWrapper] = useState<OneLakeStorageClientItemWrapper | null>(null);
  // Set to true if you want to see the messageBar content in the editor
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [viewSetter, setViewSetter] = useState<((view: string) => void) | null>(null);
  
  // Repository and branch selection state (for ribbon)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    console.log('[LakehouseGitFSItemEditor] loadDataFromUrl called', {
      itemObjectId: pageContext.itemObjectId,
      currentItemId: item?.id
    });

    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<LakehouseGitFSItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        LoadedItem = await getWorkloadItem<LakehouseGitFSItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              message: undefined,
            }
          };
        }
        else {
          console.log('LoadedItem definition: ', LoadedItem.definition);
          
          // Migrate old schema to new schema
          // @ts-ignore - old schema had duckdbMetadataPath
          if (LoadedItem.definition.duckdbMetadataPath && !LoadedItem.definition.metadata) {
            console.log('[LakehouseGitFSItemEditor] Migrating old schema - removing duckdbMetadataPath, initializing empty metadata');
            LoadedItem = {
              ...LoadedItem,
              definition: {
                ...LoadedItem.definition,
                // @ts-ignore - remove old property
                duckdbMetadataPath: undefined,
                metadata: {
                  repositories: [],
                  branches: [],
                  commits: [],
                  files: []
                }
              }
            };
          }
          // Ensure metadata exists even if not migrating
          else if (!LoadedItem.definition.metadata) {
            LoadedItem = {
              ...LoadedItem,
              definition: {
                ...LoadedItem.definition,
                metadata: {
                  repositories: [],
                  branches: [],
                  commits: [],
                  files: []
                }
              }
            };
          }
        }

        // Initialize the item
        setItem(LoadedItem);
        
        // Initialize current definition
        setCurrentDefinition(LoadedItem.definition || {});
        
        // Create OneLake storage wrapper if lakehouse is bound
        if (LoadedItem.definition?.isBinded && LoadedItem.definition?.lakehouseId && LoadedItem.definition?.lakehouseWorkspaceId) {
          console.log('[LakehouseGitFSItemEditor] Creating OneLake storage wrapper for lakehouse:', LoadedItem.definition.lakehouseId);
          const oneLakeClient = new OneLakeStorageClient(workloadClient);
          const wrapper = oneLakeClient.createItemWrapper({
            id: LoadedItem.definition.lakehouseId,
            workspaceId: LoadedItem.definition.lakehouseWorkspaceId
          });
          setStorageWrapper(wrapper);
          console.log('[LakehouseGitFSItemEditor] ✅ OneLake storage wrapper created');
        } else {
          setStorageWrapper(null);
        }

      } catch (error) {
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }


  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Update storageWrapper when definition changes (e.g., after binding Lakehouse)
  useEffect(() => {
    if (currentDefinition?.isBinded && currentDefinition?.lakehouseId && currentDefinition?.lakehouseWorkspaceId) {
      console.log('[LakehouseGitFSItemEditor] Definition changed - creating/updating OneLake storage wrapper');
      const oneLakeClient = new OneLakeStorageClient(workloadClient);
      const wrapper = oneLakeClient.createItemWrapper({
        id: currentDefinition.lakehouseId,
        workspaceId: currentDefinition.lakehouseWorkspaceId
      });
      setStorageWrapper(wrapper);
      console.log('[LakehouseGitFSItemEditor] ✅ OneLake storage wrapper updated');
    } else if (!currentDefinition?.isBinded) {
      console.log('[LakehouseGitFSItemEditor] Definition changed - clearing storage wrapper (not binded)');
      setStorageWrapper(null);
    }
  }, [currentDefinition?.isBinded, currentDefinition?.lakehouseId, currentDefinition?.lakehouseWorkspaceId]);

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  async function saveItem() {
    // item.definition is already synced via onDefinitionChange callback
    // Just log it for debugging
    if (item?.definition) {
      console.log('[LakehouseGitFSItemEditor] Saving item with definition:', item.definition);
    }
    
    let successResult;
    let errorMessage = "";

    try {
      successResult = await saveWorkloadItem<LakehouseGitFSItemDefinition>(
        workloadClient,
        item,
      );
    } catch (error) {
      errorMessage = error?.message;
    }

    const wasSaved = Boolean(successResult);

    if (!wasSaved) {
      const failureMessage = errorMessage
        ? `${t("ItemEditor_SaveFailed_Notification_Text", { itemName: item.displayName })} ${errorMessage}.`
        : t("ItemEditor_SaveFailed_Notification_Text", { itemName: item.displayName });
        
      callNotificationOpen(
        props.workloadClient,
        t("ItemEditor_SaveFailed_Notification_Title"),
        failureMessage,
        NotificationType.Error,
        undefined
      );
    }
  }

  // Check if Save should be enabled
  const isSaveEnabled = (currentView: string) => {
    // Always enable save in DEFAULT view (for metadata changes)
    return currentView === EDITOR_VIEW_TYPES.DEFAULT;
  };

  // Wrapper component for empty view that uses navigation hook
  const EmptyViewWrapper = () => {
    const { setCurrentView } = useViewNavigation();
    
    return (
      <LakehouseGitFSItemEmptyView
        workloadClient={workloadClient}
        item={item}
        currentDefinition={currentDefinition}
        setCurrentDefinition={setCurrentDefinition}
        onSaveItem={saveItem}
        onNavigateToDefaultView={() => setCurrentView(EDITOR_VIEW_TYPES.DEFAULT)}
      />
    );
  };

  // Static view definitions - no function wrapper needed!
  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: <EmptyViewWrapper />
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
      <LakehouseGitFSItemDefaultView
        workloadClient={workloadClient}
        item={item}
        currentDefinition={currentDefinition}
        storageWrapper={storageWrapper}
        selectedBranch={selectedBranch}
        onBranchSelect={setSelectedBranch}
        messageValue={currentDefinition.message}
        onMessageChange={(newValue) => {
          const updated = { ...currentDefinition, message: newValue };
          setCurrentDefinition(updated);
          if (item) item.definition = updated;
        }}
        onDefinitionChange={(updater) => {
          setCurrentDefinition(prev => {
            const updated = typeof updater === 'function' ? updater(prev) : updater;
            if (item) item.definition = updated;
            return updated;
          });
        }}
        onSave={saveItem}
      />
    )
    }
  ];

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && viewSetter) {
      // Determine the correct view based on lakehouse binding status
      const correctView = item?.definition?.isBinded ? EDITOR_VIEW_TYPES.DEFAULT : EDITOR_VIEW_TYPES.EMPTY;   
      viewSetter(correctView);
    }
  }, [isLoading, item, viewSetter]);


  // Static notification definitions - like views!
  const notifications: RegisteredNotification[] = [
    {
      name: 'default-warning',
      showInViews: [EDITOR_VIEW_TYPES.DEFAULT], // Only show in DEFAULT view
      component: showWarning ? (
        <MessageBar intent="warning" icon={<Warning20Filled />}>
          <MessageBarBody>
            {t('GettingStarted_Warning', 'You can delete or modify the content on this page at any time.')}
          </MessageBarBody>
          <MessageBarActions
            containerAction={
              <Button
                appearance="transparent"
                icon={<Dismiss20Regular />}
                aria-label={t('MessageBar_Dismiss', 'Dismiss')}
                onClick={() => setShowWarning(false)}
              />
            }
          />
        </MessageBar>
      ) : null
    }
  ];

  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage={t("LakehouseGitFSItemEditor_Loading", "Loading item...")}
      ribbon={(context) => (
        <LakehouseGitFSItemRibbon
          {...props}
          viewContext={context}
          isSaveButtonEnabled={isSaveEnabled(context.currentView)}
          saveItemCallback={saveItem}
          openSettingsCallback={handleOpenSettings}
          currentDefinition={currentDefinition}
          selectedRepository={null}
          selectedBranch={selectedBranch}
          onBranchChange={setSelectedBranch}
        />
      )}
      messageBar={notifications}
      views={views}
      viewSetter={(setCurrentView) => {
        // Store the setCurrentView function so we can use it after loading
        if (!viewSetter) {
          setViewSetter(() => setCurrentView);
        }
      }}
    />
  );
}
