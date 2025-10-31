import { GoogleGenAI } from "@google/genai";
import { GroundingSource } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateGroundedResponse(query: string): Promise<{ content: string, sources: GroundingSource[] }> {
    const model = 'gemini-2.5-flash'; 
    try {
        const response = await ai.models.generateContent({
            model,
            contents: query,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: `Bạn là một chuyên gia phân tích tin tức. Nhiệm vụ của bạn là tổng hợp kết quả tìm kiếm web theo thời gian thực thành một bản tóm tắt tin tức toàn diện và chi tiết. Toàn bộ phản hồi phải bằng tiếng Việt.

Phản hồi của bạn BẮT BUỘC phải được định dạng bằng Markdown đa dạng và tuân theo cấu trúc này:

1.  **Tóm tắt chung**: Bắt đầu bằng một cái nhìn tổng quan ngắn gọn, một hoặc hai đoạn văn, về những tin tức quan trọng nhất trong ngày, bao gồm cả ngày tháng.

2.  **Các chủ đề chính**: Xác định các chủ đề tin tức chính từ kết quả tìm kiếm (ví dụ: "Tình hình lũ lụt ở miền Trung", "Cập nhật kinh tế", "An ninh trật tự"). Đối với mỗi chủ đề:
    *   Sử dụng tiêu đề Markdown được in đậm (ví dụ: "**Tiêu đề chủ đề chính**") cho mỗi chủ đề.
    *   Cung cấp các gạch đầu dòng chi tiết tóm tắt thông tin chính cho chủ đề đó.
    *   **Quan trọng nhất, đối với mỗi mẩu thông tin, bạn PHẢI trích dẫn nguồn bằng một liên kết Markdown có thể nhấp vào ở cuối câu. Định dạng phải là \`(Nguồn: [Tiêu đề bài báo](URL))\`.**
    *   **Tìm kiếm trong bối cảnh web được cung cấp để tìm các URL hình ảnh có liên quan và có thể truy cập công khai. Nếu bạn tìm thấy một hình ảnh, hãy nhúng nó bằng Markdown: \`![Chú thích hình ảnh](URL)\`. Ưu tiên những hình ảnh chất lượng cao liên quan trực tiếp đến chủ đề.**

Toàn bộ phản hồi của bạn phải là một tài liệu Markdown duy nhất, được tổ chức tốt. KHÔNG thêm một phần "Nguồn" riêng biệt ở cuối phản hồi; tất cả các trích dẫn phải được đặt nội dòng và có thể nhấp vào như mô tả.`
            },
        });

        const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = rawChunks
            .map(chunk => ({
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Không có tiêu đề',
            }))
            .filter(source => source.uri);

        // Deduplicate sources based on URI
        const uniqueSources = Array.from(new Map(sources.map(item => [item['uri'], item])).values());

        return { content: response.text, sources: uniqueSources };
    } catch (error) {
        console.error("Error in generateGroundedResponse:", error);
        throw error;
    }
}