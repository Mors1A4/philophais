import imageSize from 'image-size';

async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    try {
        const response = await fetch(url);
        // Add a check for response status
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            return null;
        }
        const buffer = await response.arrayBuffer();
        const dimensions = imageSize(Buffer.from(buffer));
        if (dimensions.width && dimensions.height) {
            return { width: dimensions.width, height: dimensions.height };
        }
        return null;
    } catch (error) {
        console.error("Error getting image dimensions:", error);
        return null;
    }
}

export async function findBookCover(
  title: string,
  author: string
): Promise<string> {
  const query = `intitle:${encodeURIComponent(
    title
  )}%20inauthor:${encodeURIComponent(author)}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const imageLinks = item.volumeInfo.imageLinks;
        if (imageLinks) {
          // Prioritize higher resolution images first
          const coverUrl =
            imageLinks.extraLarge ||
            imageLinks.large ||
            imageLinks.medium ||
            imageLinks.small ||
            imageLinks.thumbnail ||
            imageLinks.smallThumbnail;

          if (coverUrl) {
            const sanitizedUrl = coverUrl.replace("http://", "https://").replace(/&zoom=\d/, "&zoom=0");
            const dimensions = await getImageDimensions(sanitizedUrl);
            
            if (dimensions && dimensions.width > 0) {
              const aspectRatio = dimensions.height / dimensions.width;
              if (aspectRatio > 1.2 && aspectRatio < 2.0) {
                // Found a good cover, return it immediately.
                return sanitizedUrl;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error fetching book cover from Google Books:", error);
  }

  // If no suitable cover is found after checking all books, return an empty string.
  // This will allow the calling function to fall back to the Gutenberg cover.
  return "";
}
