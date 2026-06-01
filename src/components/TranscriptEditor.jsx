function TranscriptEditor({ transcript, setTranscript }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold text-white">Transcript</h3>
        <p className="mt-2 text-sm text-slate-400">
          Review and edit your converted speech before creating a final PDF or slide deck.
        </p>
      </div>

      <textarea
        value={transcript}
        onChange={event => setTranscript(event.target.value)}
        placeholder="Your transcript appears here after recording..."
        className="min-h-[120px] sm:min-h-[160px] md:min-h-[220px] w-full rounded-3xl border border-white/10 bg-black/40 px-5 py-5 text-sm text-slate-100 outline-none transition focus:border-white/30 focus:ring-2 focus:ring-white/10"
      />
    </div>
  )
}

export default TranscriptEditor
