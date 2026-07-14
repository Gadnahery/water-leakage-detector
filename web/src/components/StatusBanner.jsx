import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function StatusBanner({ isAbnormal }) {
  return (
    <div className={`status-banner ${isAbnormal ? 'abnormal' : 'normal'}`}>
      {isAbnormal ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
      <div>
        <p className="status-title">
          {isAbnormal ? 'Water Leakage Detected' : 'System Normal'}
        </p>
        <p className="status-subtitle">
          {isAbnormal
            ? 'Sensor readings diverged — inspect the line between the two sensors.'
            : 'Both flow sensors are reporting matching readings.'}
        </p>
      </div>
    </div>
  )
}
