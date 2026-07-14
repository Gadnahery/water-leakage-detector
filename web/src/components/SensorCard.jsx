import { Droplets } from 'lucide-react'

export default function SensorCard({ label, value, flagged }) {
  return (
    <div className={`card sensor-card ${flagged ? 'flagged' : ''}`}>
      <div className="sensor-card-icon">
        <Droplets size={22} />
      </div>
      <div>
        <h3 className="sensor-card-label">{label}</h3>
        <p className="flow-value">
          {Number(value).toFixed(2)} <span className="unit">L/min</span>
        </p>
      </div>
    </div>
  )
}
