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
      throw new Error(`Google Books API request failed: ${response.statusText}`);
    }
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const book = data.items[0];
      const imageLinks = book.volumeInfo.imageLinks;
      
      if (imageLinks) {
        // Start with the best available link
        let coverUrl = (imageLinks.extraLarge || imageLinks.large || imageLinks.thumbnail || imageLinks.smallThumbnail).replace(/^http:/, 'https:');
        
        // Attempt to get an even higher resolution by modifying the URL
        if (coverUrl.includes('zoom=')) {
            // Replace zoom parameter for a higher resolution one
            const highResUrl = coverUrl.replace(/(&|\?)zoom=\d+/, '$1zoom=3');
            // We can check if this image exists, but for simplicity, we'll just request it.
            // Most browsers will handle a 404 gracefully for an img src.
            return highResUrl;
        }
        
        return coverUrl;
      }
    }
    
    return PLACEHOLDER_COVER;
  } catch (error) {
    console.error("Error fetching book cover:", error);
    return PLACEHOLDER_COVER;
  }
}
