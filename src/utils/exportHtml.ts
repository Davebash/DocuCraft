
/**
 * Utility to export the corrected document as a standalone HTML file.
 */
export const exportToHtml = (element?: HTMLElement): void => {
    const target = element || document.querySelector('.preview-container');

    if (!target) {
        console.error('Preview container not found');
        return;
    }

    const contentHtml = target.innerHTML;
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DocuCraft Export</title>
    <style>
        body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            line-height: 1.6; 
            max-width: 850px; 
            margin: 40px auto; 
            color: #1a202c; 
            padding: 0 40px; 
            background-color: white;
        }
        h1 { font-family: 'Segoe UI', sans-serif; font-size: 2.5em; font-weight: 800; border-bottom: 2px solid #edf2f7; padding-bottom: 15px; color: #2d3748; }
        h2 { font-family: 'Segoe UI', sans-serif; font-size: 2em; font-weight: 700; margin-top: 1.5em; color: #2d3748; }
        h3 { font-family: 'Segoe UI', sans-serif; font-size: 1.5em; font-weight: 600; margin-top: 1.2em; color: #4a5568; }
        p { margin: 1.2em 0; font-size: 18px; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
        .img-align-center { display: block; margin-left: auto; margin-right: auto; }
        .img-align-right { display: block; margin-left: auto; margin-right: 0; }
        .img-align-left { display: block; margin-left: 0; margin-right: auto; }
        .img-size-25 { width: 25%; }
        .img-size-50 { width: 50%; }
        .img-size-75 { width: 75%; }
        .img-size-100 { width: 100%; }
        table { border-collapse: collapse; width: 100%; margin: 2em 0; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; color: #4a5568; }
        pre { background: #f7fafc; border: 1px solid #edf2f7; color: #2d3748; padding: 1.5em; border-radius: 8px; overflow-x: auto; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; }
        code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; color: #4f46e5; }
        blockquote { border-left: 5px solid #4f46e5; padding-left: 1.5em; color: #4a5568; font-style: italic; margin: 2.5em 0; background: #f8fafc; padding-top: 10px; padding-bottom: 10px; }
        hr { border: 0; border-top: 2px solid #edf2f7; margin: 3em 0; }
        ul, ol { padding-left: 1.5em; }
        li { margin-bottom: 0.5em; }
    </style>
</head>
<body>
    ${contentHtml}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docucraft_export.html';
    a.click();
    URL.revokeObjectURL(url);
};
