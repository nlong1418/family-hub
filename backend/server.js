const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PORT = process.env.PORT || 3001;

// ─── Supabase helpers ─────────────────────────────────────────────────────────

const sbHeaders = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

async function sbGet(table, query = "") {
  const res = await fetch(`${SUPABASE_URL}${table}${query}`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase GET ${table} failed: ${await res.text()}`);
  return res.json();
}

async function sbPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}${table}`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase POST ${table} failed: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function sbPatch(table, query, body) {
  const res = await fetch(`${SUPABASE_URL}${table}${query}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table} failed: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function sbDelete(table, query) {
  const res = await fetch(`${SUPABASE_URL}${table}${query}`, {
    method: "DELETE",
    headers: { ...sbHeaders, "Prefer": "return=minimal" },
  });
  if (!res.ok) throw new Error(`Supabase DELETE ${table} failed: ${await res.text()}`);
  return { ok: true };
}

async function formatTodoList() {
  const todos = await sbGet("/todos", "?order=id.asc");
  if (!todos.length) return "📋 No items on the list yet.";
  return (
    "📋 *To-do list:*\n" +
    todos.map((t) => `${t.done ? "✅" : "⬜"} ${t.id}. ${t.text}`).join("\n")
  );
}

// ─── Telegram Bot ─────────────────────────────────────────────────────────────

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.on("message", async (msg) => {
  if (String(msg.chat.id) !== String(GROUP_CHAT_ID)) return;

  const text = msg.text || "";
  const from = msg.from.first_name || "Someone";

  try {
    // /add <item>
    if (text.startsWith("/add ")) {
      const itemText = text.slice(5).trim();
      if (!itemText) return;
      await sbPost("/todos", { id: Date.now(), text: itemText, done: false });
      bot.sendMessage(GROUP_CHAT_ID, `✅ Added: *${itemText}*`, { parse_mode: "Markdown" });
      return;
    }

    // /done <id>
    if (text.startsWith("/done ")) {
      const id = parseInt(text.slice(6).trim());
      const todos = await sbGet("/todos", `?id=eq.${id}`);
      if (todos.length) {
        await sbPatch("/todos", `?id=eq.${id}`, { done: true });
        bot.sendMessage(GROUP_CHAT_ID, `✅ Marked done: *${todos[0].text}*`, { parse_mode: "Markdown" });
      } else {
        bot.sendMessage(GROUP_CHAT_ID, `❌ No item with ID ${id}`);
      }
      return;
    }

    // /remove <id>
    if (text.startsWith("/remove ")) {
      const id = parseInt(text.slice(8).trim());
      const todos = await sbGet("/todos", `?id=eq.${id}`);
      if (todos.length) {
        await sbDelete("/todos", `?id=eq.${id}`);
        bot.sendMessage(GROUP_CHAT_ID, `🗑️ Removed: *${todos[0].text}*`, { parse_mode: "Markdown" });
      } else {
        bot.sendMessage(GROUP_CHAT_ID, `❌ No item with ID ${id}`);
      }
      return;
    }

    // /list
    if (text === "/list") {
      const list = await formatTodoList();
      bot.sendMessage(GROUP_CHAT_ID, list, { parse_mode: "Markdown" });
      return;
    }

    // /clear — removes completed items
    if (text === "/clear") {
      const before = await sbGet("/todos", "");
      await sbDelete("/todos", "?done=eq.true");
      const after = await sbGet("/todos", "");
      const removed = before.length - after.length;
      bot.sendMessage(GROUP_CHAT_ID, `🧹 Cleared ${removed} completed item${removed !== 1 ? "s" : ""}.`);
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

    // Regular message → save to message board
    if (!text.startsWith("/")) {
      await sbPost("/messages", {
        id: Date.now(),
        author: from,
        text,
        timestamp: new Date().toISOString(),
        source: "telegram",
      });
    }
  } catch (err) {
    console.error("Bot error:", err.message);
  }
});

// ─── REST API ─────────────────────────────────────────────────────────────────

// GET all data for the dashboard
app.get("/api/data", async (req, res) => {
  try {
    const [messages, todos] = await Promise.all([
      sbGet("/messages", "?order=timestamp.asc&limit=50"),
      sbGet("/todos", "?order=id.asc"),
    ]);
    res.json({ messages, todos });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// POST a message from the dashboard → Telegram group
app.post("/api/messages", async (req, res) => {
  const { author, text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "No text" });
  try {
    const message = await sbPost("/messages", {
      id: Date.now(),
      author: author || "Family Hub",
      text: text.trim(),
      timestamp: new Date().toISOString(),
      source: "dashboard",
    });
    bot.sendMessage(
      GROUP_CHAT_ID,
      `💻 *${message.author}* (from dashboard):\n${message.text}`,
      { parse_mode: "Markdown" }
    );
    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// POST a to-do from the dashboard
app.post("/api/todos", async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "No text" });
  try {
    const todo = await sbPost("/todos", { id: Date.now(), text: text.trim(), done: false });
    bot.sendMessage(GROUP_CHAT_ID, `💻 Dashboard added: *${todo.text}*`, { parse_mode: "Markdown" });
    res.json(todo);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH toggle a to-do
app.patch("/api/todos/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const todos = await sbGet("/todos", `?id=eq.${id}`);
    if (!todos.length) return res.status(404).json({ error: "Not found" });
    const updated = await sbPatch("/todos", `?id=eq.${id}`, { done: !todos[0].done });
    res.json(updated);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE a to-do
app.delete("/api/todos/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await sbDelete("/todos", `?id=eq.${id}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Family Hub backend running on port ${PORT}`));
