import { create } from 'zustand'

const useAppStore = create((set, get) => ({
  appState: 'idle',
  recordingStatus: 'inactive',
  audioBlob: null,
  rawTranscript: '',
  editedTranscript: '',
  partialTranscript: '',
  exportStatus: 'idle',
  audioLevel: 0,
  permissionState: 'prompt',
  transcriptionError: null,

  sidebarOpen: false,
  activePanel: null,
  userProfile: null,
  historyItems: [],
  historyLoading: false,
  confirmDialog: null,
  hasUnsavedChanges: false,

  canRecord: () => get().appState === 'idle',
  canTranscribe: () => get().appState === 'recording' && get().audioBlob !== null,
  canEdit: () => get().appState === 'transcribing' || get().appState === 'editing',
  canExport: () => get().appState === 'editing' && get().editedTranscript.trim().length > 0,
  canReset: () => get().appState !== 'idle',
  isActive: () => get().appState !== 'idle',

  setRecordingStatus: (status) => set({ recordingStatus: status }),
  setAppState: (state) => set({ appState: state }),
  setAudioBlob: (blob) => set({ audioBlob: blob }),
  setAudioLevel: (level) => set({ audioLevel: level }),
  setPermissionState: (state) => set({ permissionState: state }),
  setTranscriptionError: (err) => set({ transcriptionError: err }),

  setPartialTranscript: (text) => set({ partialTranscript: text }),

  setTranscript: (text) => set({
    rawTranscript: text,
    editedTranscript: text,
    partialTranscript: '',
    appState: 'editing',
  }),

  updateTranscript: (text) => set({ editedTranscript: text, hasUnsavedChanges: true }),

  resetTranscript: () => {
    const { rawTranscript } = get()
    set({ editedTranscript: rawTranscript })
  },

  setExportStatus: (status) => set({ exportStatus: status }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  setActivePanel: (panel) => set({ activePanel: panel, sidebarOpen: false }),

  setUserProfile: (profile) => set({ userProfile: profile }),

  setHistoryItems: (items) => set((state) => ({
    historyItems: typeof items === 'function' ? items(state.historyItems) : items,
  })),
  setHistoryLoading: (loading) => set({ historyLoading: loading }),

  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
  clearConfirmDialog: () => set({ confirmDialog: null }),

  setHasUnsavedChanges: (val) => set({ hasUnsavedChanges: val }),

  reset: () => set({
    appState: 'idle',
    recordingStatus: 'inactive',
    audioBlob: null,
    rawTranscript: '',
    editedTranscript: '',
    partialTranscript: '',
    exportStatus: 'idle',
    audioLevel: 0,
    permissionState: 'prompt',
    transcriptionError: null,
    hasUnsavedChanges: false,
  }),
}))

export default useAppStore
