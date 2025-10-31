import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { ChatMessage, ChatResponse } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createCanvasTool: FunctionDeclaration = {
  name: 'createOnCanvas',
  description: 'Sử dụng công cụ này khi người dùng yêu cầu tạo, vẽ, xây dựng, hoặc trực quan hóa thứ gì đó cần mã nguồn, ví dụ như một thành phần UI, biểu đồ, tài liệu, bài trình bày, hoạt ảnh, hoặc sơ đồ. Đầu ra sẽ được hiển thị trên canvas.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'Mô tả chi tiết về những gì cần tạo trên canvas. Đây phải là yêu cầu gốc và đầy đủ của người dùng.',
      },
    },
    required: ['prompt'],
  },
};

const deepSearchTool: FunctionDeclaration = {
    name: 'deepSearch',
    description: 'Sử dụng công cụ này khi người dùng hỏi về thông tin thời gian thực, tin tức, sự kiện gần đây, hoặc bất kỳ chủ đề nào cần truy cập thông tin cập nhật từ web.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: 'Truy vấn tìm kiếm của người dùng. Đây phải là một bản tóm tắt ngắn gọn về thông tin người dùng đang tìm kiếm.'
            }
        },
        required: ['query']
    }
}

const extractText = (response: any): string => {
    try {
        if (response.text) return response.text;
        
        const candidates = response.candidates || [];
        let fullText = '';
        for (const candidate of candidates) {
            const content = candidate.content || {};
            const parts = content.parts || [];
            for (const part of parts) {
                if (part.text) {
                    fullText += part.text;
                }
            }
        }
        return fullText;
    } catch (e) {
        console.error("Error extracting text from response", e);
        return "";
    }
};


export async function generateImageAnalysis(prompt: string, image: { data: string; mimeType: string }): Promise<string> {
    const model = 'gemini-2.5-flash';
    try {
        const imagePart = {
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            },
        };
        const textPart = { text: prompt || "Mô tả chi tiết về hình ảnh này." }; // Add a default prompt if empty
        
        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [textPart, imagePart] }],
            config: {
                systemInstruction: "Bạn là một trợ lý AI. Hãy trả lời câu hỏi của người dùng về hình ảnh bằng tiếng Việt."
            }
        });
        
        return extractText(response);
    } catch (error) {
        console.error("Error analyzing image:", error);
        return "Xin lỗi, tôi không thể phân tích hình ảnh. Vui lòng kiểm tra console để biết thêm chi tiết.";
    }
}


export async function generateChatResponse(prompt: string, history: ChatMessage[]): Promise<ChatResponse> {
    const model = 'gemini-2.5-flash'; // Use the faster model for chat
    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{role: 'user', parts: [{ text: prompt }]}], 
            config: {
                tools: [{ functionDeclarations: [createCanvasTool, deepSearchTool] }],
                systemInstruction: "Bạn là một trợ lý AI hữu ích. Hãy trả lời người dùng bằng tiếng Việt. Người dùng có thể cung cấp một đoạn trích dẫn làm ngữ cảnh cho câu hỏi của họ (ví dụ: 'Dựa vào đoạn trích sau: ...'). Khi đó, hãy tập trung câu trả lời của bạn vào việc giải thích hoặc làm rõ đoạn trích đó."
            },
        });

        const functionCalls = response.functionCalls;

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            if (call.name === 'createOnCanvas' && call.args.prompt) {
                return { type: 'canvas', prompt: call.args.prompt as string };
            }
            if (call.name === 'deepSearch' && call.args.query) {
                return { type: 'search', query: call.args.query as string };
            }
        }
        
        return { type: 'text', content: extractText(response) };

    } catch (error) {
        console.error("Error generating chat response:", error);
        return { type: 'text', content: "Xin lỗi, tôi đã gặp lỗi. Vui lòng kiểm tra console." };
    }
}