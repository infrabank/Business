'use client'

interface ParameterControlsProps {
  temperature: number
  maxTokens: number
  onTemperatureChange: (t: number) => void
  onMaxTokensChange: (n: number) => void
}

export function ParameterControls({
  temperature,
  maxTokens,
  onTemperatureChange,
  onMaxTokensChange,
}: ParameterControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Temperature</label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="h-1.5 w-24 cursor-pointer accent-indigo-500"
        />
        <span className="w-8 text-center text-xs font-mono text-slate-600">
          {temperature.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500">Max Tokens</label>
        <input
          type="number"
          min={1}
          max={4096}
          value={maxTokens}
          onChange={(e) => onMaxTokensChange(Math.min(4096, Math.max(1, Number(e.target.value) || 1024)))}
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs font-mono text-slate-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>
    </div>
  )
}
