import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

// 使用環境變數中的 OPENAI_API_KEY
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 後端也保留一份我們期望的結構（給 AI 當說明用）
const schemaExample = {
  parent: {
    gross: ["給家長的粗大動作建議 1", "建議 2"],
    fine: ["給家長的精細動作建議"],
    cognition: [],
    language: [],
    social: [],
    daily: []
  },
  teacher: {
    gross: ["給普班老師的粗大動作建議"],
    fine: [],
    cognition: [],
    language: [],
    social: [],
    daily: []
  }
};

app.post("/generate-suggestions", async (req, res) => {
  try {
    const { abilityText } = req.body;

    if (!abilityText || typeof abilityText !== "string") {
      return res.status(400).json({ error: "abilityText is required" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "你是一名台灣的資深特教老師。請根據孩子的能力現況，分別給『家長』與『普班老師』具體、可操作的建議。" +
            "回覆時只能輸出一段純 JSON，不可以有任何多餘文字、說明或註解。"
        },
        {
          role: "user",
          content: `
請依照以下 JSON 格式產生建議（注意：一定要是合法 JSON，鍵名與結構不能改）：

${JSON.stringify(schemaExample, null, 2)}

說明：
- parent：給家長的建議
- teacher：給普班老師的建議
- 六大向度鍵名固定為：gross, fine, cognition, language, social, daily
- 每個欄位是一個「字串陣列」，每個字串是一條具體建議。
- 建議請用自然的台灣用語，句子簡短扼要（不用加項目符號）。

孩子能力現況如下：
${abilityText}
          `
        }
      ]
    });

    const raw = completion.choices[0].message.content;
    console.log("模型原始輸出：", raw);

    let result;
    try {
      result = JSON.parse(raw);
    } catch (e) {
      console.error("JSON 解析失敗：", e);
      return res.status(500).json({ error: "模型輸出不是合法 JSON" });
    }

    // 簡單檢查結構
    if (
      !result ||
      !result.parent ||
      !result.teacher ||
      !result.parent.gross ||
      !result.teacher.gross
    ) {
      console.error("模型輸出的 JSON 結構不完整：", result);
      return res.status(500).json({ error: "模型輸出的 JSON 結構不符合預期" });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// 啟動伺服器
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
