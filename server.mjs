import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// 讓 __dirname 在 ES module 中可用
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⭐ 1️⃣ 讓 Render / 網站能正常顯示你的 index.html
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ⭐ 2️⃣ AI 彙整 API
app.post("/chat", async (req, res) => {
  try {
    const ability = req.body.ability;

    if (!ability) {
      return res.status(400).json({ error: "缺少 ability 欄位" });
    }

    const prompt = `
以下是孩子的能力現況：
${ability}

請依下列格式輸出 JSON：
{
  "parent": {
    "gross": [...],
    "fine": [...],
    "cognition": [...],
    "language": [...],
    "social": [...],
    "daily": [...]
  },
  "teacher": {
    "gross": [...],
    "fine": [...],
    "cognition": [...],
    "language": [...],
    "social": [...],
    "daily": [...]
  }
}

不要多餘說明，不要額外文字，只能輸出 JSON。
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是一位特教專家，負責將能力現況轉成六大向度的建議。" },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "{}";

    // 解析 AI 回傳的 JSON
    let jsonResult = {};
    try {
      jsonResult = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ error: "AI 回傳格式錯誤", raw: text });
    }

    res.json(jsonResult);
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ⭐ 3️⃣ Render 專用 PORT 啟動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
