const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const PLACEHOLDER_COVER = "https://placehold.co/400x600";

export async function findBookCover(title: string, author: string): Promise<string> {
  if (!API_KEY) {
    console.warn("Google Books API key (NEXT_PUBLIC_GEMINI_API_KEY) not found. Using placeholder cover.");
    return PLACEHOLDER_COVER;
  }

  const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Books API request failed: ${response.statusText}`);
    }
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo.imageLinks;
      if (imageLinks) {
        // Prefer larger images, replace http with https
        const coverUrl = (imageLinks.extraLarge || imageLinks.large || imageLinks.thumbnail || imageLinks.smallThumbnail).replace(/^http:/, 'https:');
        return coverUrl;
      }
    }
    
    return PLACEHOLDER_COVER;
  } catch (error) {
    console.error("Error fetching book cover:", error);
    return PLACEHOLDER_COVER;
  }
}
