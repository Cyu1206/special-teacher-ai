import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

// 必要：取得真實路徑（Render 才找得到 public/index.html）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve();

// 建立 express
const app = express();
app.use(express.json());

// ⭐ 讓 Render / browser 可以拿到前端頁面 public/index.html
app.use(express.static(path.join(__dirname, "public")));

// API：聊天
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是我的助手 DAN。" },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server Error" });
  }
});

// ⭐ Render 指定 Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
