"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { answerBookQuestion } from "@/ai/flows/answer-book-question";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface AIAssistantProps {
  bookName: string;
  pageContent: string;
}

export function AIAssistant({ bookName, pageContent }: AIAssistantProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const result = await answerBookQuestion({
        bookName,
        pageContent,
        question,
      });
      setAnswer(result.answer);
    } catch (error) {
      console.error("Error getting answer from AI:", error);
      toast({
        variant: "destructive",
        title: "AI Error",
        description: "Could not get an answer. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      {answer && !isLoading && (
        <Card className="mb-4 bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-lg">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Assistant's Answer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {answer}
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the current page..."
          className="pr-24 min-h-[52px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-2 top-1/2 -translate-y-1/2 font-headline"
          disabled={isLoading || !question.trim()}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
             <CornerDownLeft className="mr-2 h-4 w-4" />
          )}
          Ask
        </Button>
      </form>
    </div>
  );
}
