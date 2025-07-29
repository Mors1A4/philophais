export interface Line {
  type: 'title' | 'subtitle' | 'content' | 'blank';
  text: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string; // URL to an image
  content: Line[];
}
