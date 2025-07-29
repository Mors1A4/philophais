'use server';

/**
 * @fileOverview Summarizes a page of a book using Gemini, providing context from the book's name and page content.
 *
 * - summarizePage - A function that takes the book name, page number, page content, and user query to generate a summary.
 * - SummarizePageInput - The input type for the summarizePage function.
 * - SummarizePageOutput - The return type for the summarizePage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizePageInputSchema = z.object({
  bookName: z.string().describe('The name of the book.'),
  pageNumber: z.number().describe('The current page number in the book.'),
  pageContent: z.string().describe('The text content of the current page.'),
  query: z.string().describe('The user query or question about the page.'),
});
export type SummarizePageInput = z.infer<typeof SummarizePageInputSchema>;

const SummarizePageOutputSchema = z.object({
  summary: z.string().describe('A summary of the page content based on the user query.'),
});
export type SummarizePageOutput = z.infer<typeof SummarizePageOutputSchema>;

export async function summarizePage(input: SummarizePageInput): Promise<SummarizePageOutput> {
  return summarizePageFlow(input);
}

const summarizePagePrompt = ai.definePrompt({
  name: 'summarizePagePrompt',
  input: {schema: SummarizePageInputSchema},
  output: {schema: SummarizePageOutputSchema},
  prompt: `You are a helpful AI assistant designed to summarize pages of books based on user questions.

  Book Name: {{{bookName}}}
  Page Number: {{{pageNumber}}}
  Page Content: {{{pageContent}}}
  User Query: {{{query}}}

  Please provide a concise summary of the page content that addresses the user's query.`,
});

const summarizePageFlow = ai.defineFlow(
  {
    name: 'summarizePageFlow',
    inputSchema: SummarizePageInputSchema,
    outputSchema: SummarizePageOutputSchema,
  },
  async input => {
    const {output} = await summarizePagePrompt(input);
    return output!;
  }
);
