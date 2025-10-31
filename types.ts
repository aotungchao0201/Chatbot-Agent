export interface GroundingSource {
    uri: string;
    title: string;
}

export type CanvasContentType = {
  type: 'html' | 'markdown';
  content: string;
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string; 
  type: 'text' | 'canvas-card' | 'search-thinking' | 'search-result';
  image?: {
    data: string;
    mimeType: string;
  };

  // Fields for 'canvas-card' type
  canvasTitle?: string;
  canvasContent?: CanvasContentType;
  plan?: string;
  completion?: string;

  // Fields for search types
  query?: string;
  sources?: GroundingSource[];
  onVisualize?: (content: string) => void;
}

export type ChatResponse =
  | { type: 'text'; content: string }
  | { type: 'canvas'; prompt: string }
  | { type: 'search'; query: string };