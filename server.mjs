import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// 取得目前路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// 🔥 讓 Render 可以讀取 public 裡的 index.html、CSS、JS
app.use(express.static(path.join(__dirname, "public")));

// 🔥 讓「首頁 / 」正確回傳你的 index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// ==============================
// 🔥 AI API：處理 /chat
// ==============================
app.post("/chat", async (req, res) => {
  try {
    const abilityText = req.body.ability;

    if (!abilityText) {
      return res.status(400).json({ error: "缺少 ability 內容" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一位專業特教老師，請根據輸入的能力現況，產生家長與普班老師在六大面向（粗大、精細、認知、語言、社會情緒、生活自理）的建議，輸出成 JSON 格式。"
          },
          {
            role: "user",
            content: abilityText,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data?.choices || !data.choices[0]?.message?.content) {
      return res.status(500).json({ error: "AI 回傳格式錯誤", data });
    }

    // 🔥 AI 回覆是文字，需要轉成 JSON
    let aiJson;
    try {
      aiJson = JSON.parse(data.choices[0].message.content);
    } catch (err) {
      return res.status(500).json({
        error: "AI 回傳內容無法解析成 JSON",
        raw: data.choices[0].message.content,
      });
    }

    res.json(aiJson);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error", detail: error.message });
  }
});


// ==============================
// 🔥 Render 用這行啟動
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
