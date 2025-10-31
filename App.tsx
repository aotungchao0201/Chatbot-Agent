import React, { useState, useCallback } from 'react';
import { ChatMessage, CanvasContentType } from './types';
import { BotIcon } from './components/icons';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import { generateChatResponse, generateImageAnalysis } from './services/geminiService';
import { generateCanvasOutput } from './services/canvasService';
import { generateGroundedResponse } from './services/searchService';

const sanitizeHtmlOutput = (html: string): string => {
  let sanitized = html.trim();
  if (sanitized.startsWith('```html')) {
    sanitized = sanitized.substring(7);
  }
  if (sanitized.endsWith('```')) {
    sanitized = sanitized.substring(0, sanitized.length - 3);
  }
  return sanitized.trim();
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'initial', role: 'model', content: "Xin chào! Tôi có thể giúp gì cho bạn hôm nay? Hãy yêu cầu tôi tạo một thành phần UI, vẽ biểu đồ, hoặc chỉ trò chuyện.", type: 'text' }
  ]);
  const [isCanvasVisible, setIsCanvasVisible] = useState<boolean>(false);
  const [canvasContent, setCanvasContent] = useState<CanvasContentType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [canvasIsLoading, setCanvasIsLoading] = useState<boolean>(false);

  const performSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    const thinkingMessageId = `thinking-${Date.now()}`;

    setMessages(prev => [...prev, {
        id: thinkingMessageId,
        role: 'model',
        type: 'search-thinking',
        query: query,
        content: ''
    }]);

    try {
      const searchResult = await generateGroundedResponse(query);
      setMessages(prev => prev.map(msg =>
          msg.id === thinkingMessageId
              ? {
                  ...msg,
                  role: 'model',
                  type: 'search-result',
                  content: searchResult.content,
                  sources: searchResult.sources,
              }
              : msg
      ));
    } catch (err) {
       console.error("Search failed", err);
       setMessages(prev => prev.map(msg => 
        msg.id === thinkingMessageId 
            ? { ...msg, role: 'model', type: 'text', content: 'Xin lỗi, quá trình tìm kiếm của tôi đã thất bại. Vui lòng thử lại.' } 
            : msg
       ));
    }

    setIsLoading(false);
  }, []);


  const handleSendMessage = useCallback(async (prompt: string, image: { data: string; mimeType: string } | null) => {
    if (!prompt && !image) return;

    setIsLoading(true);
    const userMessage: ChatMessage = { 
        id: `user-${Date.now()}`, 
        role: 'user', 
        content: prompt, 
        type: 'text',
        ...(image && { image: { data: image.data, mimeType: image.mimeType } })
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      if (image) {
        const analysisResult = await generateImageAnalysis(prompt, image);
        setMessages(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', content: analysisResult, type: 'text' }]);
        setIsLoading(false);
        return;
      }
      
      const response = await generateChatResponse(prompt, messages);

      if (response.type === 'canvas') {
        setIsCanvasVisible(true);
        setCanvasIsLoading(true);
        setCanvasContent(null);
        
        let currentContent = '';
        let finalContentType: 'html' | 'markdown' | null = null;

        const canvasResult = await generateCanvasOutput(response.prompt, (chunk) => {
            currentContent += chunk;
            if (finalContentType) {
                 const contentToRender = finalContentType === 'html' ? sanitizeHtmlOutput(currentContent) : currentContent;
                 setCanvasContent({ type: finalContentType, content: contentToRender });
            }
        });

        finalContentType = canvasResult.type;
        const finalSanitizedContent = finalContentType === 'html' ? sanitizeHtmlOutput(currentContent) : currentContent;
        
        setCanvasContent({ type: finalContentType, content: finalSanitizedContent });
        setCanvasIsLoading(false);

        setMessages(prev => [...prev, {
            id: `canvas-${Date.now()}`,
            role: 'model',
            type: 'canvas-card',
            content: '',
            canvasContent: { type: finalContentType!, content: finalSanitizedContent },
            canvasTitle: response.prompt,
            completion: `Tôi đã tạo xong ${finalContentType === 'html' ? 'bản trực quan hóa' : 'tài liệu'} trên canvas cho bạn.`
        }]);
        setIsLoading(false);
        

      } else if (response.type === 'search') {
        await performSearch(response.query);

      } else {
        setMessages(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', content: response.content, type: 'text' }]);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'model', content: "Xin lỗi, tôi đang gặp sự cố kết nối. Vui lòng thử lại sau.", type: 'text' }]);
      setIsLoading(false);
    }
  }, [messages, performSearch]);

  const handleOpenCanvas = useCallback((content: CanvasContentType) => {
    if (content) {
      setCanvasContent(content);
      setIsCanvasVisible(true);
    }
  }, []);

  const handleManualCanvasOpen = useCallback(() => {
    setIsCanvasVisible(true);
    setCanvasContent(null);
  }, []);
  
  const handleVisualizeSearch = useCallback(async (content: string) => {
    if (!content) return;
    const prompt = `Dựa trên bản tóm tắt sau, hãy tạo một bảng điều khiển (dashboard) hấp dẫn và nhiều thông tin bằng cách sử dụng biểu đồ, dòng thời gian và các yếu tố trực quan khác để thể hiện thông tin chính. Hãy làm cho nó trông giống như một báo cáo chuyên nghiệp. Tóm tắt:\n\n${content}`;
    
    setIsLoading(true);
    setMessages(prev => [...prev, {id: `user-viz-${Date.now()}`, role: 'user', content: 'Hãy trực quan hóa bản tóm tắt này cho tôi.', type: 'text'}]);

    setIsCanvasVisible(true);
    setCanvasIsLoading(true);
    setCanvasContent(null);
    
    let currentContent = '';
    let finalContentType: 'html' | 'markdown' | null = null;
    
    const canvasResult = await generateCanvasOutput(prompt, (chunk) => {
        currentContent += chunk;
        if(finalContentType){
            const contentToRender = finalContentType === 'html' ? sanitizeHtmlOutput(currentContent) : currentContent;
            setCanvasContent({ type: finalContentType, content: contentToRender });
        }
    }, 'visualization');

    finalContentType = canvasResult.type;
    const finalSanitizedContent = finalContentType === 'html' ? sanitizeHtmlOutput(currentContent) : currentContent;
    
    setCanvasContent({ type: finalContentType, content: finalSanitizedContent });
    setCanvasIsLoading(false);

    setMessages(prev => [...prev, {
        id: `canvas-${Date.now()}`,
        role: 'model',
        type: 'canvas-card',
        content: '',
        canvasContent: { type: finalContentType, content: finalSanitizedContent },
        canvasTitle: "Trực quan hóa dữ liệu",
        completion: "Tôi đã tạo xong bản trực quan hóa trên canvas cho bạn."
    }]);
    setIsLoading(false);

  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 shadow-md z-20">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BotIcon className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">Gemini AI</h1>
          </div>
        </div>
      </header>
      <div className="flex-grow flex overflow-hidden">
        <div className={`flex-grow flex flex-col transition-all duration-300 ${isCanvasVisible ? 'w-1/2' : 'w-full'}`}>
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onOpenCanvas={handleOpenCanvas}
            onManualCanvasOpen={handleManualCanvasOpen}
            onManualSearch={performSearch}
            onVisualizeSearch={handleVisualizeSearch}
          />
        </div>
        {isCanvasVisible && (
          <div className="w-1/2 h-full border-l border-gray-700">
            <Canvas 
              canvasContent={canvasContent} 
              isLoading={canvasIsLoading} 
              onClose={() => setIsCanvasVisible(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;