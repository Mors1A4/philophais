const PLACEHOLDER_COVER = "https://placehold.co/400x600";

export async function findBookCover(title: string, author: string): Promise<string> {
  // The Google Books API is currently disabled for this project's API key.
  // To re-enable this functionality, you must go to the Google Cloud Console
  // for project "reader-fe258" and enable the "Google Books API".
  // For now, we will return a placeholder.
  console.warn("Google Books API is not enabled. Using placeholder cover.");
  return Promise.resolve(PLACEHOLDER_COVER);
}
