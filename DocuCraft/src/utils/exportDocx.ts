import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export const exportToDocx = async (element?: HTMLElement): Promise<void> => {
    try {
        const target = (element || document.querySelector('.preview-container')) as HTMLElement;
        if (!target) return;

        // Helper: Get Alignment
        const getAlignment = (node: Node | null): any => {
            if (!node || node.nodeType !== 1) return AlignmentType.LEFT;
            const el = node as HTMLElement;
            if (el.classList?.contains('img-align-center') || el.style?.textAlign === 'center') return AlignmentType.CENTER;
            if (el.classList?.contains('img-align-right') || el.style?.textAlign === 'right') return AlignmentType.RIGHT;
            return AlignmentType.LEFT;
        };

        // Helper: Detect Block Children
        const hasBlockChildren = (el: HTMLElement): boolean => {
            const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'blockquote', 'hr', 'img'];
            return Array.from(el.children).some(child => blockTags.includes(child.tagName.toLowerCase()));
        };

        // Helper: Parse Inline Content (Returns TextRuns)
        const parseInline = (node: Node, styles: any = {}): any[] => {
            const results: any[] = [];
            const nodes = Array.from(node.childNodes);

            for (const child of nodes) {
                if (child.nodeType === 3) { // TEXT
                    const text = child.textContent?.replace(/\r?\n/g, ' ') || "";
                    if (text) { // Keep spaces, they are significant in inline
                        results.push(new TextRun({
                            text,
                            font: styles.font || "Georgia",
                            size: styles.size || 24,
                            ...styles
                        }));
                    }
                } else if (child.nodeType === 1) { // ELEMENT
                    const el = child as HTMLElement;
                    const tag = el.tagName.toLowerCase();

                    if (tag === 'br') {
                        results.push(new TextRun({ break: 1 }));
                        continue;
                    }
                    if (tag === 'img') continue; // Images in inline context are skipped (or should be block?)

                    const nextStyles = { ...styles };
                    if (tag === 'b' || tag === 'strong') nextStyles.bold = true;
                    if (tag === 'i' || tag === 'em') nextStyles.italics = true;
                    if (tag === 'u') nextStyles.underline = {};
                    if (tag === 's' || tag === 'strike') nextStyles.strike = true;
                    if (tag === 'code') {
                        nextStyles.font = "Consolas";
                        nextStyles.shading = { fill: "F8FAFC" };
                        nextStyles.color = "4F46E5";
                    }

                    results.push(...parseInline(el, nextStyles));
                }
            }
            return results;
        };

        // Helper: Create Image Paragraph
        const createImageParagraph = (img: HTMLElement) => {
            const src = img.getAttribute('src');
            if (src?.startsWith('data:image')) {
                try {
                    const b64 = src.split(',')[1];
                    const bin = window.atob(b64);
                    const buf = new Uint8Array(bin.length);
                    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

                    let width = 500;
                    let height = 330;
                    if (img.classList.contains('img-size-25')) { width = 125; height = 80; }
                    else if (img.classList.contains('img-size-50')) { width = 250; height = 165; }
                    else if (img.classList.contains('img-size-75')) { width = 375; height = 245; }

                    return new Paragraph({
                        children: [new ImageRun({ data: buf, transformation: { width, height } } as any)],
                        alignment: getAlignment(img),
                        spacing: { before: 240, after: 240 }
                    });
                } catch (e) { console.warn("Image export failed", e); return null; }
            }
            return null;
        };

        // CORE RECURSIVE PROCESSOR
        const processNode = (node: Node): any[] => {
            if (node.nodeType === 3) {
                // Top-level text text (should be wrapped)
                if (node.textContent?.trim()) {
                    return [new Paragraph({
                        children: [new TextRun({ text: node.textContent, font: "Georgia", size: 24 })],
                        spacing: { before: 240, after: 240, line: 360 }
                    })];
                }
                return [];
            }

            if (node.nodeType !== 1) return [];
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();

            // 1. Handle Images
            if (tag === 'img') {
                const imgPara = createImageParagraph(el);
                return imgPara ? [imgPara] : [];
            }

            // 2. Handle Separators/Breaks
            if (tag === 'hr') {
                return [new Paragraph({
                    border: { bottom: { color: "CBD5E1", style: BorderStyle.SINGLE, size: 12 } },
                    spacing: { before: 480, after: 480 }
                })];
            }
            if (tag === 'br') {
                // BR at block level = empty paragraph
                return [new Paragraph({ children: [], spacing: { before: 240, after: 240 } })];
            }

            // 3. Handle Headings
            if (tag.match(/^h[1-6]$/)) {
                const levels: any = { h1: HeadingLevel.HEADING_1, h2: HeadingLevel.HEADING_2, h3: HeadingLevel.HEADING_3 };
                return [new Paragraph({
                    heading: levels[tag] || HeadingLevel.HEADING_3,
                    children: parseInline(el),
                    spacing: { before: 600, after: 240 },
                    alignment: getAlignment(el)
                })];
            }

            // 4. Handle Lists
            if (tag === 'ul' || tag === 'ol') {
                return Array.from(el.children).flatMap((li, idx) => {
                    return new Paragraph({
                        children: [
                            new TextRun({ text: tag === 'ul' ? "• " : `${idx + 1}. `, font: "Georgia", bold: true }),
                            ...parseInline(li)
                        ],
                        spacing: { before: 120, after: 120, line: 360 },
                        indent: { left: 720, hanging: 360 }
                    });
                });
            }

            // 5. Handle Tables
            if (tag === 'table') {
                const rows = Array.from(el.querySelectorAll('tr')).map(tr =>
                    new TableRow({
                        children: Array.from(tr.querySelectorAll('td, th')).map(cell =>
                            new TableCell({
                                children: [new Paragraph({ children: parseInline(cell) as any[] }) as any],
                                shading: (cell as HTMLElement).tagName === 'TH' ? { fill: "F1F5F9" } : undefined,
                                borders: { top: { style: BorderStyle.SINGLE, size: 1 }, bottom: { style: BorderStyle.SINGLE, size: 1 }, left: { style: BorderStyle.SINGLE, size: 1 }, right: { style: BorderStyle.SINGLE, size: 1 } }
                            })
                        )
                    } as any)
                );
                return [new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, margins: { top: 180, bottom: 180, left: 180, right: 180 } })];
            }

            // 6. Handle Blockquotes
            if (tag === 'blockquote') {
                return [new Paragraph({
                    children: parseInline(el, { italics: true, color: "475569" }),
                    spacing: { before: 360, after: 360, line: 360 },
                    indent: { left: 720 },
                    border: { left: { color: "6366F1", style: BorderStyle.SINGLE, size: 24 } }
                })];
            }

            // 7. Generic Wrapper Handling (div, p, article, etc.)
            // If it has block children, UNWRAP IT (recurse)
            if (hasBlockChildren(el)) {
                return Array.from(el.childNodes).flatMap(child => processNode(child));
            }

            // 8. Leaf Block (Content Container)
            // If we are here, it's a generic block with only inline content
            const inlines = parseInline(el);
            if (inlines.length === 0 && tag !== 'div' && tag !== 'p') return []; // Skip empty spans/etc? Keep empty Ps

            const pSpacing = { before: 240, after: 240, line: 360 };
            return [new Paragraph({
                children: inlines,
                spacing: pSpacing,
                alignment: getAlignment(el)
            })];
        };

        // Main Execution
        const docChildren = Array.from(target.childNodes).flatMap(processNode);

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: { font: "Georgia", size: 24, color: "0F172A" },
                        paragraph: { spacing: { line: 360 } }
                    }
                }
            },
            sections: [{
                properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
                children: docChildren
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, 'DocuCraft_Export.docx');
    } catch (err) {
        console.error('Docx Export Failed:', err);
    }
};
