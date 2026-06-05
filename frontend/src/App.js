import React, { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:3001";

const FAMILY_MEMBERS = ["Natalie", "Nels", "Hub"];

const COLORS = {
  Natalie: "#e8756a",
  Nels: "#5b8dd9",
  Hub: "#6cb87a",
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

const GCAL_SRC = "https://calendar.google.com/calendar/embed?src=h7olgo6odieqv03edrk26hc2b4%40group.calendar.google.com&ctz=America%2FLos_Angeles";

function Calendar() {
  return (
    <div className="panel calendar-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="title-icon">📅</span>
          <span>Calendar</span>
        </div>
        <a
          className="gcal-link-btn"
          href="https://calendar.google.com/calendar/r"
          target="_blank"
          rel="noreferrer"
        >
          Open ↗
        </a>
      </div>
      <div className="gcal-embed-wrapper">
        <iframe
          src={GCAL_SRC}
          style={{ border: 0 }}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          title="Family Calendar"
        />
      </div>
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
          <Calendar />
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
