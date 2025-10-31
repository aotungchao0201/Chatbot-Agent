import React, { useState, useCallback, useEffect } from 'react';
import { CopyIcon, CheckIcon, CodeIcon, EyeIcon, CloseIcon, DownloadIcon } from './icons';
import { CanvasContentType } from '../types';

// Make KaTeX and marked available globally from CDN
declare const marked: {
  parse(markdown: string): string;
};
declare const renderMathInElement: (element: HTMLElement, options: object) => void;

type ViewMode = 'preview' | 'code';

interface CanvasProps {
  canvasContent: CanvasContentType | null;
  isLoading: boolean;
  onClose: () => void;
}

const Canvas: React.FC<CanvasProps> = ({ canvasContent, isLoading, onClose }) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const hasContent = canvasContent && canvasContent.content.trim().length > 0;

  useEffect(() => {
    // When loading starts, switch to code view to show streaming
    if (isLoading) {
      setViewMode('code');
    }
  }, [isLoading]);

  const createMarkdownPreviewHtml = (markdownContent: string): string => {
      const htmlBody = marked.parse(markdownContent);
      return `
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" integrity="sha384-n8MVd4RsNIU0KOVEMcAgsUFkSSNmAoTBIvdSgMqSzCnHTUrvsCZ9KVUG+psNhCz7" crossorigin="anonymous">
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    padding: 1.5rem; 
                    background-color: #ffffff;
                    color: #111827;
                }
                pre { background-color: #1f2937; color: #f3f4f6; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
                code { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; }
                img, svg { max-width: 100%; height: auto; display: block; margin: 1rem 0; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #d1d5db; padding: 0.75rem; text-align: left; }
                th { background-color: #f3f4f6; }
            </style>
        </head>
        <body>
            ${htmlBody}
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" integrity="sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzBChUزمxganTQSvOUvKqLXudfbZFUxzPw" crossorigin="anonymous"></script>
            <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" integrity="sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05" crossorigin="anonymous"></script>
            <script>
                document.addEventListener("DOMContentLoaded", function() {
                    renderMathInElement(document.body, { 
                        delimiters: [ 
                            {left: '$$', right: '$$', display: true}, 
                            {left: '$', right: '$', display: false} 
                        ] 
                    });
                });
            </script>
        </body>
        </html>
    `;
  };
  

  const handleCopy = useCallback(() => {
    if (hasContent && canvasContent) {
      navigator.clipboard.writeText(canvasContent.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [canvasContent, hasContent]);
  
  const handleExport = useCallback(() => {
    if (hasContent && canvasContent) {
        const fileExtension = canvasContent.type === 'html' ? 'html' : 'md';
        const mimeType = canvasContent.type === 'html' ? 'text/html' : 'text/markdown';
        
        const blob = new Blob([canvasContent.content], { type: `${mimeType};charset=utf-8` });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `canvas_export.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  }, [canvasContent, hasContent]);


  const renderContent = () => {
    if (!hasContent) {
      if (isLoading) {
        return (
          <div className="flex items-center justify-center w-full h-full">
            <div className="text-center text-gray-400">
                <svg className="animate-spin mx-auto h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-3 font-semibold">Đang tạo nội dung...</p>
            </div>
          </div>
        );
      }
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center text-gray-500">
              <CodeIcon className="mx-auto h-12 w-12"/>
              <p className="mt-2 font-semibold">Trình thông dịch Canvas</p>
              <p className="text-sm">Nội dung bạn tạo sẽ xuất hiện ở đây.</p>
          </div>
        </div>
      );
    }

    if (viewMode === 'preview' && canvasContent) {
        if(canvasContent.type === 'html') {
            return (
                <iframe
                    srcDoc={canvasContent.content}
                    title="Xem trước HTML"
                    sandbox="allow-scripts"
                    className="w-full h-full bg-white"
                />
            );
        }
        // It's markdown
        return (
            <iframe
            srcDoc={createMarkdownPreviewHtml(canvasContent.content)}
            title="Xem trước Markdown"
            sandbox="allow-scripts"
            className="w-full h-full bg-white"
            />
        );
    }

    return (
      <pre className="w-full h-full overflow-auto p-4 text-sm bg-gray-900"><code className="language-markdown">{canvasContent?.content}</code></pre>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-800 border-l border-gray-700">
       <div className="p-2 flex-shrink-0 flex justify-between items-center bg-gray-800/80 backdrop-blur-sm z-10 border-b border-gray-700">
         <h3 className="font-semibold text-lg px-2">Trình thông dịch Canvas</h3>
         <div className="flex items-center gap-2">
            <button 
              title="Xem trước" 
              onClick={() => setViewMode('preview')} 
              disabled={!hasContent}
              className={`p-2 rounded-md transition-colors ${viewMode === 'preview' && hasContent ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <EyeIcon className="w-5 h-5" />
            </button>
            <button 
              title="Mã nguồn" 
              onClick={() => setViewMode('code')} 
              disabled={!hasContent}
              className={`p-2 rounded-md transition-colors ${viewMode === 'code' && hasContent ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CodeIcon className="w-5 h-5" />
            </button>
            <button 
              title="Sao chép mã" 
              onClick={handleCopy} 
              disabled={!hasContent}
              className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
            </button>
             <button 
                title="Tải về" 
                onClick={handleExport} 
                disabled={!hasContent}
                className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <DownloadIcon className="w-5 h-5" />
              </button>

            <button title="Đóng" onClick={onClose} className="p-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors">
                <CloseIcon className="w-5 h-5" />
            </button>
         </div>
      </div>
      <div className="flex-grow h-full overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default Canvas;