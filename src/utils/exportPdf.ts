
import html2pdf from 'html2pdf.js';

/**
 * PDF Export Utility
 */
export const exportToPdf = (element?: HTMLElement): void => {
    const target = (element || document.querySelector('.preview-container')) as HTMLElement;

    if (!target) {
        console.error('Preview container not found');
        return;
    }

    const options = {
        margin: [0.5, 0.5],
        filename: 'DocuCraft_Export.pdf',
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
            scale: 3.5, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            letterRendering: true // Fixes "mistreated words" by rendering chars individually
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Create a temporary clone to apply PDF-specific styling
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.fontFamily = "'Georgia', serif";
    clone.style.padding = "60px"; // Breathable margins
    clone.style.width = "816px"; // 8.5 inches at 96 DPI
    clone.style.backgroundColor = "white";
    clone.style.color = "#111827";

    // ... existing image handling ...
    const images = clone.querySelectorAll('img');
    images.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
        img.style.display = 'block';
        img.style.marginTop = '20px';
        img.style.marginBottom = '20px';
    });

    (html2pdf() as any).set(options).from(clone).save();
};
