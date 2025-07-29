'use server';
/**
 * @fileOverview A Q&A AI agent for answering questions about book content.
 * 
 * - answerQuestion - A function that handles the question answering process.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AnswerQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s question.'),
  pageContent: z.string().describe('The content of the current book page.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

export const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  return qAndAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'qAndAPrompt',
  input: {schema: AnswerQuestionInputSchema},
  output: {schema: AnswerQuestionOutputSchema},
  prompt: `You are an expert reading assistant. Your task is to answer the user's question based ONLY on the provided page content. If the answer cannot be found in the text, state that clearly.

Page Content:
---
{{{pageContent}}}
---

Question:
{{{question}}}
`,
});

const qAndAFlow = ai.defineFlow(
  {
    name: 'qAndAFlow',
    inputSchema: AnswerQuestionInputSchema,
    outputSchema: AnswerQuestionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
