'use server';
/**
 * @fileOverview A Q&A AI agent for answering questions about book content.
 * 
 * - answerQuestion - A function that handles the question answering process.
 */

import {ai} from '@/ai/genkit';
import { AnswerQuestionInputSchema, AnswerQuestionOutputSchema, type AnswerQuestionInput, type AnswerQuestionOutput } from '@/lib/types';

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
