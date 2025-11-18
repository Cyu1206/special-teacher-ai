import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// -----------------------------------------
// AI 產生六大面向建議 API
// -----------------------------------------
app.post("/ai", async (req, res) => {
  try {
    const abilityText = req.body.text;

    if (!abilityText || abilityText.trim() === "") {
      return res.status(400).json({ error: "缺少能力描述內容" });
    }

    // 向 OpenAI 送出請求
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
              "你是特教老師，請依照輸入的孩子能力現況，輸出六大面向的建議（粗大動作、精細動作、認知、語言、社會情緒、生活自理），" +
              "並分成兩組：parent（給家長）、teacher（給普班老師）。" +
              "請用 JSON 格式輸出，不要多餘敘述。例如：{" +
              '"parent":{"gross":["建議1"],"fine":["建議2"],...}, "teacher":{...}}'
          },
          { role: "user", content: abilityText },
        ],
      }),
    });

    const data = await response.json();

    // 檢查 AI 是否有回應
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "OpenAI 回應格式錯誤", raw: data });
    }

    let aiText = data.choices[0].message.content.trim();

    // 嘗試把 AI 的文字解析成 JSON
    let jsonResult;

    try {
      jsonResult = JSON.parse(aiText);
    } catch (e) {
      // AI 可能在外面包了「```json ... ```」
      aiText = aiText.replace(/```json/g, "").replace(/```/g, "");
      jsonResult = JSON.parse(aiText);
    }

    // 回傳給前端
    res.json(jsonResult);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "伺服器錯誤，AI 產生建議失敗", detail: error.message });
  }
});

// -----------------------------------------
// Render 啟動設定
// -----------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
