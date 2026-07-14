import { Droplets } from 'lucide-react'

export default function SensorCard({ label, value, flagged }) {
  const hasValue = value !== null && value !== undefined

  return (
    <div className={`card sensor-card ${flagged ? 'flagged' : ''}`}>
      <div className="icon-badge">
        <Droplets size={22} />
      </div>
      <div>
        <h3 className="sensor-card-label">{label}</h3>
        <p className="flow-value">
          {hasValue ? Number(value).toFixed(2) : '--'} <span className="unit">L/min</span>
        </p>
      </div>
    </div>
  )
}
