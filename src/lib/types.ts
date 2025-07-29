import { z } from "zod";

export interface Paragraph {
  type: 'title' | 'subtitle' | 'content' | 'blank';
  text: string;
  className?: string;
  key: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string; // URL to an image
  content: Paragraph[];
}

// Schema for the AI question answering flow
export const AnswerQuestionInputSchema = z.object({
  question: z.string().describe("The user's question."),
  pageContent: z.string().describe("The content of the current book page."),
  chatHistory: z.string().optional().describe("The history of the conversation so far, for context."),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

export const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe("The answer to the question."),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;
