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

  updateTranscript: (text) => set({ editedTranscript: text }),

  resetTranscript: () => {
    const { rawTranscript } = get()
    set({ editedTranscript: rawTranscript })
  },

  setExportStatus: (status) => set({ exportStatus: status }),

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
  }),
}))

export default useAppStore
