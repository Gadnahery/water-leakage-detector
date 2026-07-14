import { useConnectionStatus } from '../hooks/useConnectionStatus'

export default function ConnectionBadge({ lastSeenIso }) {
  const { online, secondsAgo } = useConnectionStatus(lastSeenIso)

  const label = !lastSeenIso
    ? 'Waiting for device'
    : online
    ? 'Online'
    : 'Offline'

  return (
    <div className={`connection-badge ${online ? 'is-online' : 'is-offline'}`}>
      <span className="pulse-dot">
        <span className="pulse-ring" />
      </span>
      <span className="connection-text">
        {label}
        {lastSeenIso && (
          <span className="connection-detail"> · last signal {secondsAgo}s ago</span>
        )}
      </span>
    </div>
  )
}
