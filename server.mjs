import express from "express";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// ---------- OpenAI 設定 ----------
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- 靜態檔案設定（讓首頁顯示 index.html） ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 讓瀏覽器可以拿到同資料夾裡的 index.html / js / css
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------- AI 產生教學建議 API ----------
app.post("/generate-suggestions", async (req, res) => {
  try {
    const { abilityText } = req.body;

    if (!abilityText || typeof abilityText !== "string") {
      return res.status(400).json({ error: "abilityText is required" });
    }

    const prompt = `
你是一名在台灣國小任教的資深特教老師。
請根據以下孩子的「能力現況描述」，幫我產生教學／教養建議。

請務必用「純 JSON」格式回答，不要加任何說明文字、前後標註。
JSON 格式範例如下（實際內容請你換成適當建議）：

{
  "parent": {
    "gross": ["...", "..."],
    "fine": ["...", "..."],
    "cognition": ["...", "..."],
    "language": ["...", "..."],
    "social": ["...", "..."],
    "daily": ["...", "..."]
  },
  "teacher": {
    "gross": ["...", "..."],
    "fine": ["...", "..."],
    "cognition": ["...", "..."],
    "language": ["...", "..."],
    "social": ["...", "..."],
    "daily": ["...", "..."]
  }
}

六大向度：
1. 粗大動作 (gross)
2. 精細動作 (fine)
3. 認知 (cognition)
4. 語言 (language)
5. 社會情緒 (social)
6. 生活自理 (daily)

請依照孩子的能力現況，為「家長」與「普班老師」分別提供每個向度 1–3 點具體、可操作的建議，語氣溫暖、鼓勵。

孩子能力現況如下：
${abilityText}
    `.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位台灣國小特教老師，回答時請完全遵守使用者要求的 JSON 格式。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    let text = completion.choices[0].message.content.trim();

    // 有時模型會包 ```json ... ```，這裡先把它清掉
    text = text.replace(/^```json/i, "")
               .replace(/^```/, "")
               .replace(/```$/, "")
               .trim();

    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error("解析 JSON 失敗，原始輸出：", text);
      return res.status(500).json({
        error: "模型輸出的 JSON 解析失敗，請稍後再試",
        raw: text,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// ---------- 啟動伺服器 ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
