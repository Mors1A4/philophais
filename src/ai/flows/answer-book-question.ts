'use server';

/**
 * @fileOverview A question answering AI agent for providing answers to questions about a specific book page.
 *
 * - answerBookQuestion - A function that handles the question answering process for a given book page.
 * - AnswerBookQuestionInput - The input type for the answerBookQuestion function.
 * - AnswerBookQuestionOutput - The return type for the answerBookQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerBookQuestionInputSchema = z.object({
  bookName: z.string().describe('The name of the book.'),
  pageContent: z.string().describe('The content of the current page.'),
  question: z.string().describe('The user question about the page content.'),
});
export type AnswerBookQuestionInput = z.infer<typeof AnswerBookQuestionInputSchema>;

const AnswerBookQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the user question.'),
});
export type AnswerBookQuestionOutput = z.infer<typeof AnswerBookQuestionOutputSchema>;

export async function answerBookQuestion(input: AnswerBookQuestionInput): Promise<AnswerBookQuestionOutput> {
  return answerBookQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerBookQuestionPrompt',
  input: {schema: AnswerBookQuestionInputSchema},
  output: {schema: AnswerBookQuestionOutputSchema},
  prompt: `You are a helpful AI assistant designed to answer questions about books.

  Book Name: {{{bookName}}}
  Page Content: {{{pageContent}}}

  User Question: {{{question}}}

  Answer the user's question concisely, using the provided page content as context.`,
});

const answerBookQuestionFlow = ai.defineFlow(
  {
    name: 'answerBookQuestionFlow',
    inputSchema: AnswerBookQuestionInputSchema,
    outputSchema: AnswerBookQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
