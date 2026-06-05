import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:3001";

const FAMILY_MEMBERS = ["Mom", "Dad", "Me"];

const COLORS = {
  Mom: "#e8756a",
  Dad: "#5b8dd9",
  Me: "#6cb87a",
  default: "#9b8ec4",
};

function memberColor(name) {
  return COLORS[name] || COLORS.default;
}

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Calendar ────────────────────────────────────────────────────────────────

function Calendar({ googleCalendarId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([
    { id: 1, title: "Soccer practice", date: "2026-06-04", color: "#5b8dd9", time: "4:00 PM" },
    { id: 2, title: "Family dinner", date: "2026-06-07", color: "#6cb87a", time: "6:00 PM" },
    { id: 3, title: "Dentist", date: "2026-06-11", color: "#e8756a", time: "10:30 AM" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", color: "#5b8dd9" });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const dayEvents = (d) => events.filter((e) => e.date === dateStr(d));

  const todayEvents = events
    .filter((e) => {
      const ed = new Date(e.date);
      return (
        ed.getFullYear() === today.getFullYear() &&
        ed.getMonth() === today.getMonth() &&
        ed.getDate() === today.getDate()
      );
    })
    .concat(
      events.filter((e) => {
        const ed = new Date(e.date);
        return ed > today;
      }).slice(0, 3)
    )
    .slice(0, 5);

  function addEvent() {
    if (!newEvent.title || !newEvent.date) return;
    setEvents([...events, { ...newEvent, id: Date.now() }]);
    setNewEvent({ title: "", date: "", time: "", color: "#5b8dd9" });
    setShowAdd(false);
  }

  return (
    <div className="panel calendar-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-icon">📅</span>
          <span>Calendar</span>
        </div>
        <div className="cal-nav">
          <button
            className="nav-btn"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            ‹
          </button>
          <span className="month-label">
            {monthName} {year}
          </span>
          <button
            className="nav-btn"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            ›
          </button>
        </div>
        <button className="add-btn" onClick={() => setShowAdd(!showAdd)}>
          + Add
        </button>
      </div>

      {showAdd && (
        <div className="add-form">
          <input
            placeholder="Event title"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <input
            type="date"
            value={newEvent.date}
            onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
          />
          <input
            type="time"
            value={newEvent.time}
            onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
          />
          <select
            value={newEvent.color}
            onChange={(e) => setNewEvent({ ...newEvent, color: e.target.value })}
          >
            <option value="#5b8dd9">Blue — Dad</option>
            <option value="#e8756a">Red — Mom</option>
            <option value="#6cb87a">Green — Me</option>
            <option value="#9b8ec4">Purple — Family</option>
          </select>
          <div className="form-actions">
            <button className="save-btn" onClick={addEvent}>Save</button>
            <button className="cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="cal-grid">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="cal-label">{d}</div>
        ))}
        {cells.map((d, i) => {
          const isToday =
            d &&
            today.getDate() === d &&
            today.getMonth() === month &&
            today.getFullYear() === year;
          const evs = d ? dayEvents(d) : [];
          return (
            <div key={i} className={`cal-cell ${isToday ? "today" : ""} ${!d ? "empty" : ""}`}>
              {d && <span className="day-num">{d}</span>}
              {evs.slice(0, 2).map((ev) => (
                <span key={ev.id} className="ev-dot" style={{ background: ev.color }} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="upcoming">
        <div className="upcoming-title">Upcoming</div>
        {todayEvents.length === 0 && (
          <div className="empty-state">No upcoming events</div>
        )}
        {todayEvents.map((ev) => (
          <div key={ev.id} className="event-row">
            <span className="ev-bar" style={{ background: ev.color }} />
            <span className="ev-name">{ev.title}</span>
            {ev.time && <span className="ev-time">{ev.time}</span>}
          </div>
        ))}
      </div>

      {googleCalendarId && (
        <a
          className="gcal-link"
          href={`https://calendar.google.com/calendar/r`}
          target="_blank"
          rel="noreferrer"
        >
          Open Google Calendar ↗
        </a>
      )}
    </div>
  );
}

// ─── To-Do List ───────────────────────────────────────────────────────────────

function TodoList({ todos, onAdd, onToggle, onDelete }) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput("");
  }

  const active = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <div className="panel todo-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-icon">✅</span>
          <span>To-do list</span>
        </div>
        <span className="badge">{active.length} left</span>
      </div>

      <div className="todo-input-row">
        <input
          placeholder="Add an item… or use /add in Telegram"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="add-btn" onClick={handleAdd}>+</button>
      </div>

      <div className="todo-list">
        {active.map((t) => (
          <div key={t.id} className="todo-item">
            <button className="check-btn" onClick={() => onToggle(t.id)}>
              <span className="check-circle" />
            </button>
            <span className="todo-text">{t.text}</span>
            <button className="del-btn" onClick={() => onDelete(t.id)}>×</button>
          </div>
        ))}

        {done.length > 0 && (
          <>
            <div className="done-divider">Completed</div>
            {done.map((t) => (
              <div key={t.id} className="todo-item done">
                <button className="check-btn done" onClick={() => onToggle(t.id)}>
                  <span className="check-circle done">✓</span>
                </button>
                <span className="todo-text done">{t.text}</span>
                <button className="del-btn" onClick={() => onDelete(t.id)}>×</button>
              </div>
            ))}
          </>
        )}

        {todos.length === 0 && (
          <div className="empty-state">
            All clear! Add items here or send<br />
            <code>/add Buy milk</code> in Telegram
          </div>
        )}
      </div>

      <div className="telegram-hint">
        <span className="tg-icon">✈</span>
        Telegram: /add · /done · /remove · /list · /clear
      </div>
    </div>
  );
}

// ─── Message Board ────────────────────────────────────────────────────────────

function MessageBoard({ messages, onSend }) {
  const [text, setText] = useState("");
  const [author, setAuthor] = useState(FAMILY_MEMBERS[0]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!text.trim()) return;
    onSend(author, text.trim());
    setText("");
  }

  return (
    <div className="panel msg-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-icon">💬</span>
          <span>Family board</span>
        </div>
        <span className="tg-badge">↔ Telegram</span>
      </div>

      <div className="msg-list">
        {messages.length === 0 && (
          <div className="empty-state">
            No messages yet. Say hi! 👋
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg-bubble ${m.source === "telegram" ? "from-tg" : ""}`}>
            <div className="msg-meta">
              <span
                className="msg-avatar"
                style={{ background: memberColor(m.author) }}
              >
                {initials(m.author)}
              </span>
              <span className="msg-author">{m.author}</span>
              {m.source === "telegram" && <span className="tg-tag">TG</span>}
              <span className="msg-time">{timeAgo(m.timestamp)}</span>
            </div>
            <div className="msg-text">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="msg-input-row">
        <select
          className="author-select"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          style={{ borderLeft: `3px solid ${memberColor(author)}` }}
        >
          {FAMILY_MEMBERS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="send-btn" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [todos, setTodos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/data`);
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      setTodos(data.todos);
      setMessages(data.messages);
      setConnected(true);
      setLastSync(new Date());
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleAddTodo(text) {
    try {
      const res = await fetch(`${API}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const todo = await res.json();
      setTodos((prev) => [...prev, todo]);
    } catch {
      setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);
    }
  }

  async function handleToggleTodo(id) {
    try {
      const res = await fetch(`${API}/api/todos/${id}`, { method: "PATCH" });
      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      );
    }
  }

  async function handleDeleteTodo(id) {
    try {
      await fetch(`${API}/api/todos/${id}`, { method: "DELETE" });
    } catch {}
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSendMessage(author, text) {
    const msg = {
      id: Date.now(),
      author,
      text,
      timestamp: new Date().toISOString(),
      source: "dashboard",
    };
    setMessages((prev) => [...prev, msg]);
    try {
      await fetch(`${API}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text }),
      });
    } catch {}
  }

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="app-title">Family Hub</h1>
          <span className="greeting">{greeting} 👋</span>
        </div>
        <div className="topbar-tabs">
          {["all", "calendar", "todos", "board"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {{ all: "All", calendar: "Calendar", todos: "To-dos", board: "Board" }[tab]}
            </button>
          ))}
        </div>
        <div className="topbar-right">
          <span className={`status-dot ${connected ? "online" : "offline"}`} />
          <span className="status-text">
            {connected ? (lastSync ? `Synced ${timeAgo(lastSync.toISOString())}` : "Connected") : "Offline"}
          </span>
        </div>
      </header>

      <main className={`main layout-${activeTab}`}>
        {(activeTab === "all" || activeTab === "calendar") && (
          <Calendar googleCalendarId={process.env.REACT_APP_GOOGLE_CALENDAR_ID} />
        )}
        {(activeTab === "all" || activeTab === "todos") && (
          <TodoList
            todos={todos}
            onAdd={handleAddTodo}
            onToggle={handleToggleTodo}
            onDelete={handleDeleteTodo}
          />
        )}
        {(activeTab === "all" || activeTab === "board") && (
          <MessageBoard messages={messages} onSend={handleSendMessage} />
        )}
      </main>
    </div>
  );
}
