const PLACEHOLDER_COVER = "https://placehold.co/400x600";

export async function findBookCover(title: string, author: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("Google Books API key (NEXT_PUBLIC_GEMINI_API_KEY) not found. Using placeholder cover.");
    return PLACEHOLDER_COVER;
  }

  const query = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}`;
  const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  try {
    const response = await fetch(proxiedUrl);
    if (!response.ok) {
       // Try to get more specific error info from the response body
      let errorBody = "No additional error information from API.";
      try {
        errorBody = await response.text();
      } catch (e) {
        // Ignore if we can't read the body
      }
      throw new Error(`Google Books API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
    }
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo.imageLinks;
      
      if (imageLinks) {
        // Start with the best available link and ensure it's HTTPS
        let coverUrl = (imageLinks.extraLarge || imageLinks.large || imageLinks.thumbnail || imageLinks.smallThumbnail).replace(/^http:/, 'https:');
        
        // Attempt to get an even higher resolution by modifying the URL
        if (coverUrl.includes('zoom=')) {
            const highResUrl = coverUrl.replace(/(&|\?)zoom=\d+/, '$1zoom=3');
            return highResUrl;
        }
        
        return coverUrl;
      }
    }
    
    return PLACEHOLDER_COVER;
  } catch (error) {
    console.error("Error fetching book cover:", error);
    // Re-throwing the error so the calling function knows something went wrong.
    // The calling function will then fall back to the placeholder.
    throw error;
  }
}
