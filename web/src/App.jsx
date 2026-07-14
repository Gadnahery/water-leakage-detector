import { useEffect, useState } from 'react'
import { Waves } from 'lucide-react'
import { supabase } from './supabaseClient'
import { useTheme } from './hooks/useTheme'
import { useLeakAlert } from './hooks/useLeakAlert'
import ThemeToggle from './components/ThemeToggle'
import ConnectionBadge from './components/ConnectionBadge'
import SensorCard from './components/SensorCard'
import StatusBanner from './components/StatusBanner'
import HistoryTable from './components/HistoryTable'
import './App.css'

const TABLE = 'sensor_readings'
const HISTORY_LIMIT = 20

function App() {
  const { theme, toggleTheme } = useTheme()
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [connError, setConnError] = useState(null)

  const isAbnormal = latest?.status === 'ABNORMAL'
  useLeakAlert(
    isAbnormal,
    latest &&
      `Sensor 1: ${Number(latest.sensor1_flow).toFixed(2)} L/min, Sensor 2: ${Number(
        latest.sensor2_flow
      ).toFixed(2)} L/min`
  )

  useEffect(() => {
    let isMounted = true

    async function loadInitial() {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT)

      if (!isMounted) return
      if (error) {
        setConnError(error.message)
      } else {
        setHistory(data)
        setLatest(data[0] ?? null)
      }
      setLoading(false)
    }

    loadInitial()

    const channel = supabase
      .channel('sensor_readings_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE },
        (payload) => {
          setLatest(payload.new)
          setHistory((prev) => [payload.new, ...prev].slice(0, HISTORY_LIMIT))
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <div className="header-logo">
            <Waves size={22} />
          </div>
          <div>
            <h1>Water Leakage Detector</h1>
            <p className="subtitle">Live readings from {latest?.device_id ?? 'device'}</p>
          </div>
        </div>
        <div className="header-actions">
          <ConnectionBadge lastSeenIso={latest?.created_at} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {connError && <p className="error-text">Failed to load data: {connError}</p>}

      <StatusBanner isAbnormal={isAbnormal} hasData={!!latest} loading={loading} />

      <div className="sensor-grid">
        <SensorCard label="Sensor 1" value={latest?.sensor1_flow} flagged={isAbnormal} />
        <SensorCard label="Sensor 2" value={latest?.sensor2_flow} flagged={isAbnormal} />
      </div>

      <p className="last-updated">
        {latest
          ? `Last updated: ${new Date(latest.created_at).toLocaleString()}`
          : 'Waiting for the device to report in…'}
      </p>

      <HistoryTable rows={history} />
    </div>
  )
}

export default App
