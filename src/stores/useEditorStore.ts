import { create } from "zustand";

export interface SectionConfig {
  [key: string]: any;
}

export interface Section {
  id: string;
  section_type: string;
  order: number;
  config: SectionConfig;
  is_visible: boolean;
}

export interface PageData {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  pixel_meta_id: string | null;
  pixel_google_id: string | null;
  html_content: string | null;
  custom_domain: string | null;
  custom_css: string | null;
}

interface EditorState {
  // Data
  page: PageData | null;
  sections: Section[];
  selectedSectionId: string | null;
  editMode: "sections" | "html";
  showSettings: boolean;
  saving: boolean;
  loading: boolean;
  dragOverIndex: number | null;
  canvasDevice: "desktop" | "tablet" | "mobile";
  inlineEditingField: { sectionId: string; field: string } | null;

  // Actions
  setPage: (page: PageData) => void;
  updatePage: (partial: Partial<PageData>) => void;
  setSections: (sections: Section[]) => void;
  selectSection: (id: string | null) => void;
  updateSectionConfig: (id: string, key: string, value: any) => void;
  updateSectionFullConfig: (id: string, config: SectionConfig) => void;
  moveSection: (fromIndex: number, toIndex: number) => void;
  addSection: (section: Section) => void;
  removeSection: (id: string) => void;
  toggleVisibility: (id: string) => void;
  setEditMode: (mode: "sections" | "html") => void;
  setShowSettings: (show: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLoading: (loading: boolean) => void;
  setDragOverIndex: (index: number | null) => void;
  setCanvasDevice: (device: "desktop" | "tablet" | "mobile") => void;
  setInlineEditing: (field: { sectionId: string; field: string } | null) => void;
  reset: () => void;
}

const initialState = {
  page: null as PageData | null,
  sections: [] as Section[],
  selectedSectionId: null as string | null,
  editMode: "sections" as "sections" | "html",
  showSettings: false,
  saving: false,
  loading: true,
  dragOverIndex: null as number | null,
  canvasDevice: "desktop" as "desktop" | "tablet" | "mobile",
  inlineEditingField: null as { sectionId: string; field: string } | null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setPage: (page) => set({ page }),
  updatePage: (partial) => set((s) => ({ page: s.page ? { ...s.page, ...partial } : null })),
  setSections: (sections) => set({ sections }),
  selectSection: (id) => set({ selectedSectionId: id, inlineEditingField: null }),

  updateSectionConfig: (id, key, value) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, config: { ...sec.config, [key]: value } } : sec
      ),
    })),

  updateSectionFullConfig: (id, config) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, config } : sec
      ),
    })),

  moveSection: (fromIndex, toIndex) =>
    set((s) => {
      const newSections = [...s.sections];
      const [moved] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, moved);
      return { sections: newSections.map((sec, i) => ({ ...sec, order: i })), dragOverIndex: null };
    }),

  addSection: (section) =>
    set((s) => ({
      sections: [...s.sections, section],
      selectedSectionId: section.id,
    })),

  removeSection: (id) =>
    set((s) => ({
      sections: s.sections.filter((sec) => sec.id !== id),
      selectedSectionId: s.selectedSectionId === id ? null : s.selectedSectionId,
    })),

  toggleVisibility: (id) =>
    set((s) => ({
      sections: s.sections.map((sec) =>
        sec.id === id ? { ...sec, is_visible: !sec.is_visible } : sec
      ),
    })),

  setEditMode: (editMode) => set({ editMode }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setSaving: (saving) => set({ saving }),
  setLoading: (loading) => set({ loading }),
  setDragOverIndex: (dragOverIndex) => set({ dragOverIndex }),
  setCanvasDevice: (canvasDevice) => set({ canvasDevice }),
  setInlineEditing: (inlineEditingField) => set({ inlineEditingField }),
  reset: () => set(initialState),
}));
