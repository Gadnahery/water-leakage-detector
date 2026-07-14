function formatTime(iso) {
  return new Date(iso).toLocaleString()
}

export default function HistoryTable({ rows }) {
  return (
    <div className="card history-card">
      <h3>Recent History</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Sensor 1</th>
              <th>Sensor 2</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatTime(row.created_at)}</td>
                <td>{Number(row.sensor1_flow).toFixed(2)} L/min</td>
                <td>{Number(row.sensor2_flow).toFixed(2)} L/min</td>
                <td>
                  <span className={`badge ${row.status === 'ABNORMAL' ? 'badge-danger' : 'badge-success'}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
