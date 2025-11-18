import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

// 提供 public 底下的 index.html
app.use(express.static("public"));

/*
  AI 產生建議（前端呼叫 /chat）
*/
app.post("/chat", async (req, res) => {
  try {
    const inputText = req.body.message;
    console.log("收到訊息：", inputText);

    if (!inputText || inputText.trim() === "") {
      return res.status(400).json({ error: "請提供能力描述文字" });
    }

    const prompt = `
你是一位專業特教老師。根據以下學生能力現況，請依照以下 JSON 結構產生建議：

{
  "parent": {
    "gross": [],
    "fine": [],
    "cognition": [],
    "language": [],
    "social": [],
    "daily": []
  },
  "teacher": {
    "gross": [],
    "fine": [],
    "cognition": [],
    "language": [],
    "social": [],
    "daily": []
  }
}

請務必產生完整 JSON，不要有説明文字。
學生能力現況：${inputText}
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是特教老師 DAN。" },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    console.log("AI 回應：", data);

    const reply = data.choices?.[0]?.message?.content || "{}";

    // 回傳給前端
    res.json({ reply });

  } catch (err) {
    console.error("AI 產生錯誤：", err);
    res.status(500).json({ error: "Server internal error" });
  }
});

// Render 啟動用
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
