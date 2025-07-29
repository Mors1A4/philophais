export interface Paragraph {
  type: 'title' | 'subtitle' | 'content' | 'blank';
  text: string;
  className?: string;
  key: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string; // URL to an image
  content: Paragraph[];
}
