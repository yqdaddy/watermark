/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { SavedParamTemplate } from "./types";
import {
  loadSavedParamTemplates,
  saveSavedParamTemplate,
  updateSavedParamTemplate,
  deleteSavedParamTemplate,
  clearAllSavedParamTemplates,
} from "./storage";

interface SavedParamTemplatesContextValue {
  templates: SavedParamTemplate[];
  isLoading: boolean;
  saveTemplate: (template: SavedParamTemplate) => Promise<void>;
  updateTemplate: (template: SavedParamTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SavedParamTemplatesContext = createContext<SavedParamTemplatesContextValue | null>(null);

export function SavedParamTemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<SavedParamTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始加载
  useEffect(() => {
    loadSavedParamTemplates()
      .then((loaded) => {
        setTemplates(loaded);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load saved param templates:", error);
        setIsLoading(false);
      });
  }, []);

  const saveTemplate = useCallback(async (template: SavedParamTemplate) => {
    await saveSavedParamTemplate(template);
    setTemplates((prev) => {
      const updated = prev.filter((t) => t.id !== template.id);
      updated.push(template);
      return updated.sort((a, b) => b.createdAt - a.createdAt);
    });
  }, []);

  const updateTemplate = useCallback(async (template: SavedParamTemplate) => {
    await updateSavedParamTemplate(template);
    setTemplates((prev) =>
      prev.map((t) => (t.id === template.id ? template : t)).sort((a, b) => b.createdAt - a.createdAt),
    );
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await deleteSavedParamTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllSavedParamTemplates();
    setTemplates([]);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadSavedParamTemplates();
      setTemplates(loaded);
    } catch (error) {
      console.error("Failed to refresh saved param templates:", error);
    }
    setIsLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      templates,
      isLoading,
      saveTemplate,
      updateTemplate,
      deleteTemplate,
      clearAll,
      refresh,
    }),
    [templates, isLoading, saveTemplate, updateTemplate, deleteTemplate, clearAll, refresh],
  );

  return <SavedParamTemplatesContext.Provider value={value}>{children}</SavedParamTemplatesContext.Provider>;
}

export function useSavedParamTemplates() {
  const context = useContext(SavedParamTemplatesContext);
  if (!context) {
    throw new Error("useSavedParamTemplates must be used within SavedParamTemplatesProvider");
  }
  return context;
}