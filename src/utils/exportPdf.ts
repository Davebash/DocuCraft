
import html2pdf from 'html2pdf.js';

/**
 * PDF Export Utility
 */
export const exportToPdf = async (element?: HTMLElement): Promise<void> => {
    const target = (element || document.querySelector('.preview-container')) as HTMLElement;

    if (!target) {
        console.error('Preview container not found');
        return;
    }

    // Create a temporary container to hold the clone (needed for html2canvas to work correctly)
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '816px'; // 8.5 inches at 96 DPI
    container.style.height = 'auto'; // Ensure container expands with content
    container.style.overflow = 'visible';
    document.body.appendChild(container);

    // Create a temporary clone to apply PDF-specific styling
    const clone = target.cloneNode(true) as HTMLElement;

    // Neutralize any inherited container styles that might cause clipping
    clone.style.height = 'auto';
    clone.style.minHeight = '1056px';
    clone.style.overflow = 'visible';
    clone.style.overflowY = 'visible';
    clone.style.position = 'relative';
    clone.style.display = 'block';
    clone.style.visibility = 'visible';

    // Apply PDF-specific branding/styles
    clone.style.fontFamily = "'Georgia', serif";
    clone.style.padding = "60px"; // Breathable margins
    clone.style.width = "816px";
    clone.style.backgroundColor = "white";
    clone.style.color = "#111827";

    container.appendChild(clone);

    // Image handling to ensure they are properly sized and centered
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

    const options = {
        margin: [0, 0], // Margins are already handled by padding in clone
        filename: 'DocuCraft_Export.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            letterRendering: true,
            windowWidth: 816 // Lock rendering width to prevent reflows
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'] } // More reliable multi-page behavior
    };

    try {
        // Brief delay to allow layout to settle in the hidden container
        await new Promise(resolve => setTimeout(resolve, 100));
        await (html2pdf() as any).set(options).from(clone).save();
    } catch (error) {
        console.error('PDF generation failed:', error);
    } finally {
        // Cleanup
        document.body.removeChild(container);
    }
};

