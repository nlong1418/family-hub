const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const PORT = process.env.PORT || 3001;

// In-memory store (persists while server runs; upgrade to a DB later if needed)
const store = {
  messages: [],
  todos: [],
  nextTodoId: 1,
};

// ─── Telegram Bot ─────────────────────────────────────────────────────────────

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

function formatTodoList() {
  if (store.todos.length === 0) return "📋 No items on the list yet.";
  return (
    "📋 *To-do list:*\n" +
    store.todos
      .map((t) => `${t.done ? "✅" : "⬜"} ${t.id}. ${t.text}`)
      .join("\n")
  );
}

bot.on("message", (msg) => {
  if (String(msg.chat.id) !== String(GROUP_CHAT_ID)) return;

  const text = msg.text || "";
  const from = msg.from.first_name || "Someone";

  // /add <item>
  if (text.startsWith("/add ")) {
    const itemText = text.slice(5).trim();
    if (!itemText) return;
    const todo = { id: store.nextTodoId++, text: itemText, done: false };
    store.todos.push(todo);
    bot.sendMessage(GROUP_CHAT_ID, `✅ Added: *${itemText}*`, {
      parse_mode: "Markdown",
    });
    return;
  }

  // /done <id>
  if (text.startsWith("/done ")) {
    const id = parseInt(text.slice(6).trim());
    const todo = store.todos.find((t) => t.id === id);
    if (todo) {
      todo.done = true;
      bot.sendMessage(GROUP_CHAT_ID, `✅ Marked done: *${todo.text}*`, {
        parse_mode: "Markdown",
      });
    } else {
      bot.sendMessage(GROUP_CHAT_ID, `❌ No item with ID ${id}`);
    }
    return;
  }

  // /remove <id>
  if (text.startsWith("/remove ")) {
    const id = parseInt(text.slice(8).trim());
    const idx = store.todos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const removed = store.todos.splice(idx, 1)[0];
      bot.sendMessage(GROUP_CHAT_ID, `🗑️ Removed: *${removed.text}*`, {
        parse_mode: "Markdown",
      });
    } else {
      bot.sendMessage(GROUP_CHAT_ID, `❌ No item with ID ${id}`);
    }
    return;
  }

  // /list
  if (text === "/list") {
    bot.sendMessage(GROUP_CHAT_ID, formatTodoList(), {
      parse_mode: "Markdown",
    });
    return;
  }

  // /clear — removes completed items
  if (text === "/clear") {
    const before = store.todos.length;
    store.todos = store.todos.filter((t) => !t.done);
    const removed = before - store.todos.length;
    bot.sendMessage(
      GROUP_CHAT_ID,
      `🧹 Cleared ${removed} completed item${removed !== 1 ? "s" : ""}.`
    );
    return;
  }

  // /help
  if (text === "/help") {
    bot.sendMessage(
      GROUP_CHAT_ID,
      `*Family Hub commands:*\n` +
        `/add <item> — add to to-do list\n` +
        `/done <id> — mark item done\n` +
        `/remove <id> — delete item\n` +
        `/list — show all items\n` +
        `/clear — remove completed items\n\n` +
        `Any other message appears on the family board 📋`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Regular message → add to message board
  if (!text.startsWith("/")) {
    const message = {
      id: Date.now(),
      author: from,
      text,
      timestamp: new Date().toISOString(),
      source: "telegram",
    };
    store.messages.push(message);
    // Keep last 100 messages
    if (store.messages.length > 100) store.messages.shift();
  }
});

// ─── REST API ─────────────────────────────────────────────────────────────────

// GET all data for the dashboard
app.get("/api/data", (req, res) => {
  res.json({
    messages: store.messages.slice(-50),
    todos: store.todos,
  });
});

// POST a message from the dashboard → Telegram group
app.post("/api/messages", (req, res) => {
  const { author, text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "No text" });

  const message = {
    id: Date.now(),
    author: author || "Family Hub",
    text: text.trim(),
    timestamp: new Date().toISOString(),
    source: "dashboard",
  };
  store.messages.push(message);
  if (store.messages.length > 100) store.messages.shift();

  // Mirror to Telegram
  bot.sendMessage(
    GROUP_CHAT_ID,
    `💻 *${message.author}* (from dashboard):\n${message.text}`,
    { parse_mode: "Markdown" }
  );

  res.json(message);
});

// POST a to-do from the dashboard
app.post("/api/todos", (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "No text" });
  const todo = { id: store.nextTodoId++, text: text.trim(), done: false };
  store.todos.push(todo);
  bot.sendMessage(GROUP_CHAT_ID, `💻 Dashboard added: *${todo.text}*`, {
    parse_mode: "Markdown",
  });
  res.json(todo);
});

// PATCH toggle a to-do
app.patch("/api/todos/:id", (req, res) => {
  const todo = store.todos.find((t) => t.id === parseInt(req.params.id));
  if (!todo) return res.status(404).json({ error: "Not found" });
  todo.done = !todo.done;
  res.json(todo);
});

// DELETE a to-do
app.delete("/api/todos/:id", (req, res) => {
  const idx = store.todos.findIndex((t) => t.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  store.todos.splice(idx, 1);
  res.json({ ok: true });
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Family Hub backend running on port ${PORT}`));
