import type { AnswerQuestionInput, AnswerQuestionOutput } from "./types";

const envMeta = (typeof import.meta !== "undefined" ? (import.meta as any).env : {}) || {};
const GEMINI_API_KEY =
  envMeta.VITE_GEMINI_API_KEY ||
  envMeta.NEXT_PUBLIC_GEMINI_API_KEY ||
  "AIzaSyCIJQZ9eeZcYsS2Iyxbwpym5hUZ7oQwt3I";

export async function askGeminiQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  const prompt = `You are a helpful reading companion and literary analyst discussing the book "${input.bookTitle}" by ${input.bookAuthor}.
Answer the user's question clearly and insightfully, grounded primarily on the page excerpt provided below and any preceding conversation history.

${input.chatHistory ? `Previous Conversation:\n${input.chatHistory}\n` : ""}

Page Content:
---
${input.pageContent}
---

User's Question:
${input.question}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn("Gemini API error:", errText);
      throw new Error(`Gemini API returned status ${res.status}`);
    }

    const data = await res.json();
    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I was unable to analyze this excerpt. Please try again.";

    return { answer };
  } catch (err) {
    console.error("Gemini assistant error:", err);
    return {
      answer:
        "The AI companion is currently operating in offline mode. Your notes, bookmarks, and highlights remain fully saved and available on this device.",
    };
  }
}
