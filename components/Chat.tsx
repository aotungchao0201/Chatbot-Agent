import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, GroundingSource, CanvasContentType } from '../types';
import { 
    BotIcon, 
    CodeIcon, 
    SendIcon, 
    PlusIcon,
    SearchIcon,
    ImagePlusIcon,
    CanvasIcon,
    BookIcon,
    ProSearchIcon,
    ClockIcon,
    LinkIcon,
    CloseIcon,
    QuoteIcon,
    ReplyIcon
} from './icons';

// Make marked available globally
declare const marked: {
  parse(markdown: string): string;
};

interface ChatProps {
    messages: ChatMessage[];
    onSendMessage: (prompt: string, image: { data: string; mimeType: string } | null) => void;
    isLoading: boolean;
    onOpenCanvas: (content: CanvasContentType) => void;
    onManualCanvasOpen: () => void;
    onManualSearch: (prompt: string) => void;
    onVisualizeSearch: (content: string) => void;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading, onOpenCanvas, onManualCanvasOpen, onManualSearch, onVisualizeSearch }) => {
    const [prompt, setPrompt] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
    const toolsMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedImage, setUploadedImage] = useState<{ data: string; mimeType: string; file: File } | null>(null);
    const [selectionPopup, setSelectionPopup] = useState<{ visible: boolean; top: number; left: number; text: string } | null>(null);
    const popupRef = useRef<HTMLDivElement>(null);
    const [quotedContext, setQuotedContext] = useState<string | null>(null);


    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
                setIsToolsMenuOpen(false);
            }
        };

        const handleMouseUp = (event: MouseEvent) => {
             // Let the popup's own click handler do its job
            if (popupRef.current && popupRef.current.contains(event.target as Node)) {
                return;
            }

            const selection = window.getSelection();
            if (selection && selection.toString().trim().length > 0) {
                const selectedText = selection.toString();
                const range = selection.getRangeAt(0);
                
                let container = range.commonAncestorContainer;
                // If the container is a text node, get its parent element
                if (container.nodeType === 3) {
                    container = container.parentElement!;
                }

                let modelMessageElement = container as HTMLElement;
                // Traverse up to find the message container
                while (modelMessageElement && modelMessageElement.dataset.role !== 'model-message') {
                    modelMessageElement = modelMessageElement.parentElement!;
                }

                if (modelMessageElement) {
                    const rect = range.getBoundingClientRect();
                    const containerRect = chatContainerRef.current!.getBoundingClientRect();
                    setSelectionPopup({
                        visible: true,
                        top: rect.top - containerRect.top + chatContainerRef.current!.scrollTop - 45,
                        left: rect.left - containerRect.left + rect.width / 2,
                        text: selectedText,
                    });
                } else {
                    setSelectionPopup(null);
                }
            } else {
                setSelectionPopup(null);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleQuoteSelection = () => {
        if (selectionPopup) {
            setQuotedContext(selectionPopup.text);
            setSelectionPopup(null);
        }
    };


    const handleSend = () => {
        if ((prompt.trim() || uploadedImage) && !isLoading) {
            let finalPrompt = prompt;
            if (quotedContext) {
                 finalPrompt = `Dựa vào đoạn trích sau:\n\n> ${quotedContext}\n\nHãy trả lời câu hỏi sau: ${prompt}`;
            }
            onSendMessage(finalPrompt, uploadedImage ? { data: uploadedImage.data, mimeType: uploadedImage.mimeType } : null);
            setPrompt('');
            setUploadedImage(null);
            setQuotedContext(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setUploadedImage({ data: base64String, mimeType: file.type, file });
            };
            reader.readAsDataURL(file);
        }
    };

    const truncateText = (text: string, length: number) => {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    };

    const SearchThinkingMessage = ({ msg }: { msg: ChatMessage }) => (
        <div className="flex items-start gap-4">
            <BotIcon className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
            <div className="max-w-2xl w-full p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                <div className="flex items-center gap-3 font-semibold text-gray-300 border-b border-gray-600 pb-3 mb-3">
                    <ProSearchIcon className="w-5 h-5"/>
                    TÌM KIẾM CHUYÊN SÂU
                </div>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-400">
                        <ClockIcon className="w-5 h-5 animate-spin" />
                        <p>Đang tìm kiếm: <span className="font-semibold text-gray-200">"{msg.query}"</span></p>
                    </div>
                </div>
            </div>
        </div>
    );

    const SearchResultMessage = ({ msg }: { msg: ChatMessage }) => {
       const htmlContent = marked.parse(msg.content);

       return (
        <div className="flex items-start gap-4">
            <BotIcon className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
            <div data-role="model-message" className="max-w-2xl w-full p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                <div className="flex items-center gap-3 font-semibold text-gray-300 border-b border-gray-600 pb-3 mb-4">
                    <ProSearchIcon className="w-5 h-5"/>
                    TÌM KIẾM CHUYÊN SÂU
                </div>
                <div 
                    className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-blue-400 max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />

                <div className="mt-6 border-t border-gray-600 pt-4">
                     {msg.sources && msg.sources.length > 0 && (
                        <>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-3">
                                <LinkIcon className="w-4 h-4" />
                                Nguồn
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                {msg.sources.map((source: GroundingSource, i: number) => (
                                    <a 
                                      key={i} 
                                      href={source.uri} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-400 bg-gray-800/50 hover:bg-gray-800 p-2 rounded-md truncate transition-colors"
                                      title={source.title}
                                    >
                                        {source.title || source.uri}
                                    </a>
                                ))}
                            </div>
                        </>
                    )}
                    <button 
                        onClick={() => onVisualizeSearch(msg.content)}
                        className="w-full text-center py-2 px-4 bg-blue-600/20 text-blue-300 rounded-lg hover:bg-blue-600/40 font-semibold transition-colors"
                    >
                        Trực quan hóa bản tóm tắt này
                    </button>
                </div>
            </div>
        </div>
       );
    };

    const ModelMessage = ({ msg }: { msg: ChatMessage }) => {
        if (msg.type === 'canvas-card' && msg.canvasContent) {
            return (
                 <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                        <BotIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
                    </div>
                    <div className="max-w-xl p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                        <div className="flex items-center justify-between gap-4 p-3 bg-gray-800/50 rounded-lg">
                             <div className="flex items-start gap-3">
                                <CodeIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="font-semibold text-white">{truncateText(msg.canvasTitle || 'Yêu cầu Canvas', 50)}</p>
                                    <p className="text-sm text-gray-400 mt-1">{msg.completion}</p>
                                </div>
                             </div>
                            <button 
                              onClick={() => onOpenCanvas(msg.canvasContent!)} 
                              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex-shrink-0"
                            >
                              Mở
                            </button>
                        </div>
                    </div>
                 </div>
            )
        }

        if (msg.type === 'search-thinking') return <SearchThinkingMessage msg={msg} />;
        if (msg.type === 'search-result') return <SearchResultMessage msg={msg} />;

        const htmlContent = marked.parse(msg.content);
        return (
             <div className="flex items-start gap-4">
                <BotIcon className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                <div 
                    data-role="model-message" 
                    className="prose prose-invert prose-p:my-2 first:prose-p:mt-0 last:prose-p:mb-0 max-w-2xl w-full p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                >
                </div>
             </div>
        );
    };
    
    const UserMessage = ({ msg }: { msg: ChatMessage }) => {
        // Regex to detect and parse the contextual prompt structure
        const contextRegex = /^Dựa vào đoạn trích sau:\s*\n\n> ([\s\S]+?)\s*\n\nHãy trả lời câu hỏi sau: ([\s\S]+)$/;
        const match = msg.content.match(contextRegex);

        if (match) {
            const quotedText = match[1].trim();
            const newQuestion = match[2].trim();

            return (
                <div className="max-w-xl p-4 rounded-2xl bg-blue-600 text-white rounded-br-none">
                    <div className="flex items-start gap-2 opacity-80 border-b border-blue-500/50 pb-2 mb-2">
                        <ReplyIcon className="w-4 h-4 mt-1 flex-shrink-0" />
                        <p className="italic text-blue-100">{quotedText}</p>
                    </div>
                    <p className="mt-2 text-white">{newQuestion}</p>
                </div>
            );
        }
        
        // Fallback for regular messages and image messages
        return (
            <div className="max-w-xl p-4 rounded-2xl bg-blue-600 text-white rounded-br-none">
                {msg.image && (
                    <img
                        src={`data:${msg.image.mimeType};base64,${msg.image.data}`}
                        alt="User upload"
                        className="mb-3 rounded-lg max-w-xs"
                    />
                )}
                {msg.content && (
                     <div 
                        className="prose prose-invert prose-p:my-0"
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                      />
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4">
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto pt-8 pb-4 relative">
                 {selectionPopup?.visible && (
                    <div
                        ref={popupRef}
                        className="absolute z-10"
                        style={{ top: `${selectionPopup.top}px`, left: `${selectionPopup.left}px`, transform: 'translateX(-50%)' }}
                    >
                        <button
                            onClick={handleQuoteSelection}
                            title="Hỏi AI về đoạn này"
                            className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-full px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800 shadow-lg"
                        >
                            <QuoteIcon className="w-4 h-4" />
                            <span>Hỏi AI về đoạn này</span>
                        </button>
                    </div>
                )}
                <div className="space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' 
                                ? <ModelMessage msg={msg} /> 
                                : <UserMessage msg={msg} />
                            }
                        </div>
                    ))}
                    {isLoading && messages.length > 0 && (messages[messages.length - 1].role === 'user' || uploadedImage) && (
                         <div className="flex items-start gap-4">
                            <BotIcon className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                            <div className="max-w-xl p-4 rounded-2xl bg-gray-700 text-gray-200 rounded-bl-none">
                               <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                               </div>
                            </div>
                         </div>
                    )}
                </div>
            </div>
            
            <div className="flex-shrink-0 py-4">
                 {quotedContext && (
                    <div className="mb-2 p-3 bg-gray-800 border border-gray-700 rounded-lg flex items-start justify-between gap-3">
                       <div className="flex items-start gap-3 min-w-0">
                         <ReplyIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                         <p className="text-sm text-gray-300 italic border-l-2 border-gray-600 pl-3 max-h-24 overflow-y-auto flex-1">
                            {truncateText(quotedContext, 200)}
                         </p>
                       </div>
                       <button onClick={() => setQuotedContext(null)} className="p-1 rounded-full hover:bg-gray-700 flex-shrink-0">
                           <CloseIcon className="w-5 h-5" />
                       </button>
                    </div>
                )}
                {uploadedImage && (
                    <div className="mb-2 p-2 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <img src={URL.createObjectURL(uploadedImage.file)} alt="Preview" className="w-12 h-12 rounded-md object-cover" />
                         <span className="text-sm text-gray-400">{uploadedImage.file.name}</span>
                       </div>
                       <button onClick={() => { setUploadedImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 rounded-full hover:bg-gray-700">
                           <CloseIcon className="w-5 h-5" />
                       </button>
                    </div>
                )}
                <div className="relative bg-gray-800 border border-gray-700 rounded-2xl flex items-end p-2">
                    <div className="relative" ref={toolsMenuRef}>
                        <button
                          onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                          className="p-2 bg-blue-600 rounded-full mr-2 hover:bg-blue-700 transition-colors"
                          aria-haspopup="true"
                          aria-expanded={isToolsMenuOpen}
                        >
                            <PlusIcon className="w-6 h-6 text-white" />
                        </button>
                        {isToolsMenuOpen && (
                            <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-2">
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                <ul className="text-gray-200">
                                    <li onClick={() => { if(prompt.trim()) { onManualSearch(prompt); setPrompt(''); setIsToolsMenuOpen(false); } }} className="flex items-center gap-4 px-4 py-2 hover:bg-gray-700 cursor-pointer">
                                        <SearchIcon className="w-5 h-5" />
                                        <span>Nghiên cứu chuyên sâu</span>
                                    </li>
                                     <li onClick={() => { fileInputRef.current?.click(); setIsToolsMenuOpen(false); }} className="flex items-center gap-4 px-4 py-2 hover:bg-gray-700 cursor-pointer">
                                        <ImagePlusIcon className="w-5 h-5" />
                                        <span>Tải ảnh lên</span>
                                    </li>
                                    <li onClick={() => { onManualCanvasOpen(); setIsToolsMenuOpen(false); }} className="flex items-center gap-4 px-4 py-2 hover:bg-gray-700 cursor-pointer">
                                        <CanvasIcon className="w-5 h-5" />
                                        <span>Canvas</span>
                                    </li>
                                     <li className="flex items-center gap-4 px-4 py-2 text-gray-400 cursor-not-allowed">
                                        <BookIcon className="w-5 h-5" />
                                        <span>Học có hướng dẫn</span>
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={quotedContext ? "Hỏi về đoạn trích dẫn..." : uploadedImage ? "Hỏi về hình ảnh này..." : "Mô tả điều bạn muốn tạo..."}
                        className="flex-grow bg-transparent py-2 px-1 text-lg resize-none focus:outline-none max-h-48"
                        rows={1}
                    />
                    <button 
                        onClick={handleSend} 
                        disabled={isLoading || (!prompt.trim() && !uploadedImage)}
                        className="p-3 rounded-full bg-gray-700 text-gray-300 disabled:bg-gray-800 disabled:text-gray-500 hover:bg-gray-600 transition-colors"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-500 pt-2">Gemini có thể hiển thị thông tin không chính xác, bao gồm cả về mọi người, vì vậy hãy kiểm tra kỹ các câu trả lời của nó.</p>
            </div>
        </div>
    );
};

export default Chat;