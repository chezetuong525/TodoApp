import { useState, useRef, useEffect } from 'react'
import { useToggle } from '../hooks/useToggle'
import './TodoApp.css'
import CompletedHistory from './CompletedHistory'

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

const loadSavedState = () => {
  if (typeof window === 'undefined') {
    return {
      todos: [],
      completedHistory: [],
      notificationLog: [],
    }
  }

  try {
    const saved = localStorage.getItem('todoAppState')
    if (!saved) {
      return {
        todos: [],
        completedHistory: [],
        notificationLog: [],
      }
    }

    const { todos: savedTodos, completedHistory: savedHistory, notificationLog: savedLog } = JSON.parse(saved)

    return {
      todos: Array.isArray(savedTodos) ? savedTodos : [],
      completedHistory: Array.isArray(savedHistory) ? savedHistory : [],
      notificationLog: Array.isArray(savedLog) ? savedLog : [],
    }
  } catch (error) {
    console.warn('Không thể đọc localStorage:', error)
    return {
      todos: [],
      completedHistory: [],
      notificationLog: [],
    }
  }
}

export default function TodoApp() {
  const savedState = loadSavedState()
  const [todos, setTodos] = useState(savedState.todos)
  const [text, setText] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [showCompleted, toggleShowCompleted] = useToggle(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showNotificationLog, setShowNotificationLog] = useState(false)
  const [notification, setNotification] = useState(null)
  const [notificationLog, setNotificationLog] = useState(savedState.notificationLog)
  const [completedHistory, setCompletedHistory] = useState(savedState.completedHistory)
  const removalTimers = useRef({})

  useEffect(() => {
    localStorage.setItem(
      'todoAppState',
      JSON.stringify({ todos, completedHistory, notificationLog })
    )
  }, [todos, completedHistory, notificationLog])

  const addTodo = () => {
    const trimmed = text.trim()
    if (!trimmed) return

    setTodos(prev => [
      ...prev,
      {
        id: Date.now(),
        text: trimmed,
        completed: false,
        isRemoving: false,
        reminderAt: reminderTime || null,
        completedAt: null,
      },
    ])

    const reminderLabel = reminderTime
      ? ` với nhắc lúc ${formatDateTime(reminderTime)}`
      : ''

    showNotification(`"${trimmed}" đã được thêm${reminderLabel}`)
    setText('')
    setReminderTime('')
  }

  const showNotification = (message, duration = 1500) => {
    const entry = { message, time: formatDateTime(new Date()) }
    setNotification({ message, isVisible: true })
    setNotificationLog(prev => [entry, ...prev])
    setTimeout(() => {
      setNotification(null)
    }, duration)
  }

  const toggleCompleted = id => {
    const completedAt = formatDateTime(new Date())

    setTodos(prev =>
      prev.map(todo => {
        if (todo.id === id) {
          const nextCompleted = !todo.completed
          if (nextCompleted) {
            showNotification(`"${todo.text}" đã hoàn thành lúc ${completedAt}`)

            if (removalTimers.current[id]) {
              clearTimeout(removalTimers.current[id])
            }

            removalTimers.current[id] = setTimeout(() => {
              setTodos(currentTodos => {
                const target = currentTodos.find(t => t.id === id)
                if (!target || !target.completed) {
                  delete removalTimers.current[id]
                  return currentTodos
                }
                return currentTodos.map(t =>
                  t.id === id ? { ...t, isRemoving: true } : t
                )
              })

              removalTimers.current[id] = setTimeout(() => {
                setTodos(currentTodos => {
                  const target = currentTodos.find(t => t.id === id)
                  if (target && target.completed) {
                    setCompletedHistory(prev => [
                      { ...target, completedAt },
                      ...prev.filter(item => item.id !== id),
                    ])
                  }
                  delete removalTimers.current[id]
                  return currentTodos.filter(t => t.id !== id)
                })
              }, 500)
            }, 3000)
          } else {
            if (removalTimers.current[id]) {
              clearTimeout(removalTimers.current[id])
              delete removalTimers.current[id]
            }
            showNotification(`"${todo.text}" đã được gỡ hoàn thành`)
          }

          return {
            ...todo,
            completed: nextCompleted,
            completedAt: nextCompleted ? completedAt : todo.completedAt,
            isRemoving: false,
          }
        }
        return todo
      })
    )
  }

  const restoreTodo = id => {
    const historyItem = completedHistory.find(item => item.id === id)
    if (!historyItem) return

    setTodos(prev => [
      {
        ...historyItem,
        completed: false,
        completedAt: null,
        isRemoving: false,
      },
      ...prev,
    ])

    setCompletedHistory(prev => prev.filter(item => item.id !== id))
    showNotification(`"${historyItem.text}" đã được hoàn tác về lại danh sách`)
  }

  const removeTodo = id => {
    if (removalTimers.current[id]) {
      clearTimeout(removalTimers.current[id])
      delete removalTimers.current[id]
    }
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }

  return (
    <div className="todo-app">
      <div className="todo-header">
        <h1>Todo App</h1>
        <button
          type="button"
          className="notification-log-button"
          onClick={() => setShowNotificationLog(prev => !prev)}
          title="Lịch sử thông báo"
        >
          🔔
          {notificationLog.length > 0 && (
            <span className="notification-badge">{notificationLog.length}</span>
          )}
        </button>
      </div>

      {showNotificationLog && (
        <div className="notification-log-panel">
          <div className="notification-log-header">
            <span>Lịch sử thông báo</span>
            <button
              type="button"
              className="history-close"
              onClick={() => setShowNotificationLog(false)}
            >
              Đóng
            </button>
          </div>
          {notificationLog.length > 0 ? (
            <ul className="notification-log-list">
              {notificationLog.map((entry, index) => (
                <li key={`${entry.time}-${index}`} className="notification-log-item">
                  <div>{entry.message}</div>
                  <small>{entry.time}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Chưa có thông báo.</p>
          )}
        </div>
      )}

      <div className="todo-input">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && addTodo()}
          placeholder="Thêm công việc..."
        />
        <input
          type="datetime-local"
          value={reminderTime}
          onChange={e => setReminderTime(e.target.value)}
          aria-label="Thời gian nhắc"
        />
        <button type="button" onClick={addTodo}>
          Thêm
        </button>
      </div>

      <label className="todo-filter">
        <input
          type="checkbox"
          checked={showCompleted}
          onChange={toggleShowCompleted}
        />
        Hiển thị công việc đã hoàn thành
      </label>

      <button
        type="button"
        className="history-toggle"
        onClick={() => setShowHistory(prev => !prev)}
      >
        {showHistory ? 'Đóng lịch sử hoàn thành' : 'Xem lịch sử hoàn thành'}
      </button>

      {showHistory && (
        <CompletedHistory
          history={completedHistory}
          onClose={() => setShowHistory(false)}
          onUndo={restoreTodo}
        />
      )}

      <ul className="todo-list">
        {todos
          .filter(todo => showCompleted || !todo.completed)
          .map(todo => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''} ${
                todo.isRemoving ? 'removing' : ''
              }`}
            >
              <div>
                <span>{todo.text}</span>
                {todo.reminderAt && (
                  <small>Nhắc: {formatDateTime(todo.reminderAt)}</small>
                )}
                {todo.completedAt && todo.completed && (
                  <small>Hoàn thành: {todo.completedAt}</small>
                )}
              </div>
              <div className="todo-buttons">
                <button type="button" onClick={() => toggleCompleted(todo.id)}>
                  {todo.completed ? 'Bỏ hoàn thành' : 'Hoàn thành'}
                </button>
                <button type="button" onClick={() => removeTodo(todo.id)}>
                  Xóa
                </button>
              </div>
            </li>
          ))}
      </ul>

      {notification && (
        <div className="notification">
          <div className="notification-content">{notification.message}</div>
          <div className="notification-progress"></div>
        </div>
      )}
    </div>
  )
}