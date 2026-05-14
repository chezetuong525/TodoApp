const formatDateTime = value => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CompletedHistory({ history, onClose, onUndo }) {
  return (
    <div className="completed-history">
      <div className="history-header">
        <h2>Lịch sử công việc đã hoàn thành</h2>
        <button type="button" onClick={onClose} className="history-close">
          Đóng
        </button>
      </div>

      {history.length > 0 ? (
        <ul className="history-list">
          {history.map(item => (
            <li key={item.id} className="history-item">
              <div>
                <span>{item.text}</span>
                <small>
                  Hoàn thành: {item.completedAt}
                  {item.reminderAt && (
                    <> · Nhắc: {formatDateTime(item.reminderAt)}</>
                  )}
                </small>
              </div>
              <button
                type="button"
                className="undo-button"
                onClick={() => onUndo(item.id)}
              >
                Hoàn tác
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Chưa có công việc hoàn thành.</p>
      )}
    </div>
  )
}
