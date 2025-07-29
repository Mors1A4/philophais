export interface Line {
  type: 'title' | 'subtitle' | 'content' | 'blank' | 'image';
  text: string;
  paragraphId?: string;
  className?: string;
  key: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string; // URL to an image
  content: Line[];
}

    