import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AI CHUYÊN GIA 1: TRỰC QUAN HÓA DỮ LIỆU ---
const _generateVisualization = async (prompt: string, onChunk: (chunk: string) => void) => {
    const model = 'gemini-2.5-pro';
    const responseStream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
            systemInstruction: `Bạn là một kỹ sư giao diện người dùng chuyên nghiệp. Nhiệm vụ của bạn là tạo ra một tệp HTML duy nhất, khép kín và có thể tương tác.

**QUY TẮC TUYỆT ĐỐI (QUAN TRỌNG NHẤT):**
- Phản hồi của bạn BẮT BUỘC phải là mã HTML thô.
- **TUYỆT ĐỐI KHÔNG** được bọc mã trong các khối Markdown như \`\`\`html. Lỗi này sẽ làm hỏng toàn bộ ứng dụng.
- Phản hồi phải bắt đầu trực tiếp bằng \`<!DOCTYPE html>\` và kết thúc bằng \`</html>\`.

**CÁC QUY TẮC KHÁC:**
- **MỘT TỆP DUY NHẤT:** Toàn bộ CSS và JavaScript phải được nhúng nội tuyến trong thẻ <style> và <script> bên trong tệp HTML. Không sử dụng bất kỳ tệp bên ngoài nào.
- **TƯƠNG TÁC:** Sử dụng JavaScript để tạo các biểu đồ, đồ thị và các yếu tố trực quan có thể tương tác được. Cân nhắc sử dụng các thư viện như Chart.js hoặc D3.js nếu cần (nhúng trực tiếp từ CDN).
- **THIẾT KẾ:** Tạo ra một thiết kế sạch sẽ, hiện đại và hấp dẫn.
- **NGÔN NGỮ:** Nội dung trực quan hóa phải bằng tiếng Việt.

- **QUY TẮC VỀ JAVASCRIPT ĐỂ TRÁNH LỖI VÒNG LẶP RENDER:**
  - **KHÔNG SỬ DỤNG** \`window.addEventListener('resize', ...)\`. Component mẹ sẽ chịu trách nhiệm gọi hàm vẽ lại.
  - Thay vào đó, hãy tạo một hàm toàn cục duy nhất tên là \`renderChart()\` mà component mẹ có thể gọi. Hàm này phải chứa toàn bộ logic để vẽ và cập nhật biểu đồ.
  - Bên trong \`renderChart()\`, bạn BẮT BUỘC phải hủy (destroy) biểu đồ cũ trước khi vẽ lại biểu đồ mới.
  - Luôn khai báo biến chứa biểu đồ bằng \`let\` ở phạm vi toàn cục của thẻ \`<script>\` để có thể truy cập và hủy nó.
  - **Ví dụ bắt buộc phải tuân theo:**
    \`\`\`html
    <script>
      let myChart = null; // Khai báo ở phạm vi toàn cục
      
      function renderChart() {
        const ctx = document.getElementById('myChart').getContext('2d');
        
        // HỦY BIỂU ĐỒ CŨ NẾU NÓ TỒN TẠI
        if (myChart) {
          myChart.destroy();
        }
        
        myChart = new Chart(ctx, {
          // ... cấu hình biểu đồ ...
        });
      }

      // Chỉ gọi hàm lần đầu khi script được tải
      renderChart();
    </script>
    \`\`\`
`
        },
    });
    for await (const chunk of responseStream) {
        onChunk(chunk.text);
    }
};

// --- AI CHUYÊN GIA 2: SOẠN THẢO TÀI LIỆU KHOA HỌC ---
const _generateDocument = async (prompt: string, onChunk: (chunk: string) => void) => {
    const model = 'gemini-2.5-pro';
    const responseStream = await ai.models.generateContentStream({
        model,
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
            systemInstruction: `Bạn là một chuyên gia soạn thảo tài liệu khoa học và giáo dục bằng tiếng Việt, sử dụng Markdown và LaTeX. Nhiệm vụ của bạn là tạo ra một tài liệu Markdown duy nhất, được cấu trúc tốt để chuyển đổi sang DOCX bằng Pandoc.

QUY TẮC BẮT BUỘC:
1.  **Định dạng**: Toàn bộ đầu ra phải là một tài liệu Markdown duy nhất. Ngôn ngữ của tài liệu phải là tiếng Việt.
2.  **Siêu dữ liệu YAML**: Luôn bắt đầu bằng khối siêu dữ liệu YAML cho Pandoc.
    ---
    title: "Tiêu đề Tài liệu"
    author: "Tạo bởi Gemini"
    date: "\\today"
    math: katex
    ---
3.  **Toán học (KaTeX)**: Sử dụng cú pháp LaTeX chuẩn. Chú ý các ký tự đặc biệt của Markdown có thể làm hỏng LaTeX (ví dụ \`x^2\` phải là \`$x^2$\`). Sử dụng \`\\bar{x}\`, \`\\sum\`, \`s^2\`, \`\\sqrt{}\`, \`\\vec{}\`.
4.  **Bản vẽ Kỹ thuật (TikZ)**:
    *   **GIẢI THÍCH VỚI NGƯỜI DÙNG**: Đầu tiên, giải thích ngắn gọn rằng TikZ là code LaTeX và bạn sẽ cung cấp một tệp .tex hoàn chỉnh để vẽ hình chất lượng cao.
    *   **CẤU TRÚC BẮT BUỘC**: Sau đó, cung cấp mã TikZ chất lượng cao bên trong cấu trúc \`\\documentclass{article}\` hoàn chỉnh sau. Đây là yêu cầu bắt buộc.
        \`\`\`latex
        \\documentclass[11pt, a4paper]{article}
        \\usepackage[a4paper, top=2.5cm, bottom=2.5cm, left=2cm, right=2cm]{geometry}
        \\usepackage{fontspec}
        \\usepackage[vietnamese, bidi=basic, provide=*]{babel}
        \\babelprovide[import, onchar=ids fonts]{vietnamese}
        \\babelfont{rm}{Noto Sans} 
        \\usepackage{enumitem}
        \\setlist[itemize]{label=-}
        \\usepackage{amsmath}
        \\usepackage{amssymb}
        \\usepackage{tikz,tkz-tab}
        \\usetikzlibrary{calc, arrows.meta}
        \\usepackage{hyperref}
        \\begin{document}
        \\section*{Tiêu đề Hình vẽ}
        \\begin{figure}[htbp]
          \\centering
          \\begin{tikzpicture}
            % ... CÁC LỆNH VẼ TIKZ Ở ĐÂY ...
          \\end{tikzpicture}
          \\caption{Chú thích cho hình vẽ.}
        \\end{figure}
        \\end{document}
        \`\`\`
5.  **Cấu trúc**: Sử dụng các tiêu đề Markdown (#, ##), danh sách, và bảng để tạo tài liệu rõ ràng.`,
        },
    });
    for await (const chunk of responseStream) {
        onChunk(chunk.text);
    }
};


// --- AI TỔNG ĐÀI: PHÂN LUỒNG YÊU CẦU ---
export async function generateCanvasOutput(prompt: string, onChunk: (chunk: string) => void, forceMode?: 'visualization' | 'document'): Promise<{ type: 'html' | 'markdown' }> {
    // If a mode is forced (e.g., from "Visualize this" button), skip the routing AI.
    if (forceMode === 'visualization') {
        await _generateVisualization(prompt, onChunk);
        return { type: 'html' };
    }
    if (forceMode === 'document') {
        await _generateDocument(prompt, onChunk);
        return { type: 'markdown' };
    }
    
    // Otherwise, use the routing AI to decide.
    const model = 'gemini-2.5-flash';

    const createVisualizationTool: FunctionDeclaration = {
        name: 'createVisualization',
        description: 'Sử dụng khi người dùng muốn tạo một sản phẩm trực quan, tương tác như biểu đồ, đồ thị, dashboard, hoạt ảnh, hoặc một thành phần giao diện người dùng (UI). Đầu ra phải là code.',
        parameters: { type: Type.OBJECT, properties: {}, required: [] },
    };
    const createDocumentTool: FunctionDeclaration = {
        name: 'createDocument',
        description: 'Sử dụng khi người dùng muốn tạo một tài liệu văn bản, bài giảng, báo cáo, giải bài tập toán, hoặc bất kỳ nội dung nào có cấu trúc giống tài liệu. Đầu ra phải là văn bản có định dạng.',
        parameters: { type: Type.OBJECT, properties: {}, required: [] },
    };

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: `Phân tích yêu cầu sau của người dùng: "${prompt}"` }] }],
            config: {
                tools: [{ functionDeclarations: [createVisualizationTool, createDocumentTool] }],
                systemInstruction: "Bạn là một AI định tuyến thông minh. Dựa trên yêu cầu của người dùng, hãy quyết định xem nên tạo một 'trực quan hóa' (visualization) hay một 'tài liệu' (document). Chỉ gọi một hàm duy nhất."
            }
        });

        const call = response.functionCalls?.[0];
        if (call?.name === 'createVisualization') {
            await _generateVisualization(prompt, onChunk);
            return { type: 'html' };
        } else {
            // Default to document creation for clarity and structure
            await _generateDocument(prompt, onChunk);
            return { type: 'markdown' };
        }

    } catch (error) {
        console.error("Error in canvas routing AI:", error);
        // Fallback to document generation if routing fails
        await _generateDocument(prompt, onChunk);
        return { type: 'markdown' };
    }
}