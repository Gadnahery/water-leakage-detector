import { AlertTriangle, CheckCircle2, RadioTower } from 'lucide-react'

export default function StatusBanner({ isAbnormal, hasData, loading }) {
  if (!hasData) {
    return (
      <div className="status-banner neutral">
        <div className="icon-badge icon-badge-inline">
          <RadioTower size={20} />
        </div>
        <div>
          <p className="status-title">{loading ? 'Connecting…' : 'Waiting for Device'}</p>
          <p className="status-subtitle">
            No readings received yet. The banner will update as soon as data arrives.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`status-banner ${isAbnormal ? 'abnormal' : 'normal'}`}>
      <div className="icon-badge icon-badge-inline">
        {isAbnormal ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
      </div>
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
