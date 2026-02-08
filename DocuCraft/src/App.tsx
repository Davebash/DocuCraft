
import React, { useState, useEffect, useRef } from 'react';
import { formatText } from './utils/formatText';
import { exportToDocx } from './utils/exportDocx';
import { exportToPdf } from './utils/exportPdf';
import { exportToHtml } from './utils/exportHtml';
import { createRoot } from 'react-dom/client';

function App() {
  const [inputText, setInputText] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [hasConverted, setHasConverted] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);

  /**
   * Sync Markdown drafted on the left to the word-like editable area on the right.
   * We use a detached root to render the React tree to a DOM fragment then swap.
   */
  const pushMarkdownToPreview = () => {
    if (!previewRef.current) return;

    const formatted = formatText(inputText);
    const tempContainer = document.createElement('div');
    const root = createRoot(tempContainer);

    // Immediate render
    root.render(formatted);

    // Smallest possible delay to ensure React commits the render to the DOM
    setTimeout(() => {
      if (previewRef.current) {
        previewRef.current.innerHTML = tempContainer.innerHTML;
        setHasConverted(true);
        // Focus the editor for immediate editing
        setTimeout(() => {
          if (previewRef.current) {
            previewRef.current.focus();
            // Move cursor to end if possible
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(previewRef.current);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }, 50);
        try {
          root.unmount();
        } catch {
          // ignore cleanup errors
        }
      }
    }, 0);
  };

  /**
   * Global click listener to close the export menu
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Listen for image clicks in the preview area
   */
  useEffect(() => {
    const handlePreviewClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        // Deselect previous
        if (selectedImage) selectedImage.classList.remove('selected-img');

        // Select new
        const img = target as HTMLImageElement;
        img.classList.add('selected-img');
        setSelectedImage(img);
        e.stopPropagation();
      } else {
        if (selectedImage) {
          selectedImage.classList.remove('selected-img');
          setSelectedImage(null);
        }
      }
    };

    const container = previewRef.current;
    if (container) {
      container.addEventListener('click', handlePreviewClick);
      return () => container.removeEventListener('click', handlePreviewClick);
    }
  }, [selectedImage, hasConverted]);

  /**
   * Rich Text Formatting Executor
   */
  const execCmd = (command: string, value: string = '') => {
    if (!hasConverted) return;
    previewRef.current?.focus();
    document.execCommand(command, false, value);
  };

  const setImgSize = (sizeClass: string) => {
    if (selectedImage) {
      // Remove existing size classes
      ['img-size-25', 'img-size-50', 'img-size-75', 'img-size-100'].forEach(c => {
        selectedImage.classList.remove(c);
      });
      selectedImage.classList.add(sizeClass);
    }
  };

  const setImgAlign = (alignClass: string) => {
    if (selectedImage) {
      // Alignment classes for images
      ['img-align-left', 'img-align-center', 'img-align-right'].forEach(c => {
        selectedImage.classList.remove(c);
      });
      selectedImage.classList.add(alignClass);
    } else {
      // Fallback to text alignment if no image selected
      if (alignClass === 'img-align-center') execCmd('justifyCenter');
      else if (alignClass === 'img-align-left') execCmd('justifyLeft');
      else if (alignClass === 'img-align-right') execCmd('justifyRight');
    }
  };

  const handleImageInsert = () => {
    if (!hasConverted) {
      alert('Please convert your draft to "Live" before adding media.');
      return;
    }
    fileInputRef.current?.click();
  };

  /**
   * Handle image paste from clipboard
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    if (!hasConverted) return;

    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            execCmd('insertImage', imageUrl);
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        execCmd('insertImage', imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAll = () => {
    if (window.confirm('Reset both your draft and live document?')) {
      setInputText('');
      setHasConverted(false);
      if (previewRef.current) {
        previewRef.current.innerHTML = '';
      }
    }
  };

  const handleExport = (type: 'docx' | 'pdf' | 'html') => {
    // Force a focus/blur to ensure all content is committed if browser quirks exist
    previewRef.current?.focus();

    if (type === 'docx') {
      exportToDocx(previewRef.current || undefined);
    } else if (type === 'pdf') {
      exportToPdf(previewRef.current || undefined);
    } else if (type === 'html') {
      exportToHtml(previewRef.current || undefined);
    }
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-slate-800">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-10 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-100">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DocuCraft</h1>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>Digital</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span>Manuscript</span>
        </div>
      </header>

      <main className="flex-grow p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-5.5rem)] overflow-hidden">
        {/* LEFT PANE: DRAFTING */}
        <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Markdown Draft</span>
            <button
              onClick={pushMarkdownToPreview}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-lg transition-all uppercase tracking-widest shadow-md shadow-indigo-100 active:scale-95"
            >
              Convert to Live →
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="flex-grow w-full p-8 bg-transparent text-slate-700 font-mono text-sm resize-none focus:outline-none leading-relaxed"
            placeholder="# Start typing your document here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* RIGHT PANE: MASTER DOCUMENT */}
        <div className="flex flex-col bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden relative">
          {/* TOOLBAR */}
          <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center space-x-1 shrink-0">
            <button onClick={() => execCmd('bold')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-800 font-bold transition-all" title="Bold">B</button>
            <button onClick={() => execCmd('italic')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-800 italic transition-all" title="Italic">I</button>
            <button onClick={() => execCmd('underline')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-800 underline transition-all" title="Underline">U</button>

            <div className="w-px h-6 bg-slate-100 mx-2"></div>

            <button onClick={() => execCmd('formatBlock', 'h1')} className="px-3 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-900 font-bold text-xs" title="H1">H1</button>
            <button onClick={() => execCmd('formatBlock', 'h2')} className="px-3 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-900 font-bold text-xs" title="H2">H2</button>

            <div className="w-px h-6 bg-slate-100 mx-2"></div>

            <button onClick={() => execCmd('insertUnorderedList')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <button onClick={() => setImgAlign('img-align-left')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500" title="Align Left">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h10M4 18h16" /></svg>
            </button>

            <button onClick={() => setImgAlign('img-align-center')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500" title="Align Center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M7 12h10M4 18h16" /></svg>
            </button>

            <button onClick={() => setImgAlign('img-align-right')} className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500" title="Align Right">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M10 12h10M4 18h16" /></svg>
            </button>

            <div className="w-px h-6 bg-slate-100 mx-2"></div>

            {selectedImage && (
              <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-left-2">
                <button onClick={() => setImgSize('img-size-25')} className="px-2 h-7 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold hover:bg-indigo-100 transition-colors">25%</button>
                <button onClick={() => setImgSize('img-size-50')} className="px-2 h-7 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold hover:bg-indigo-100 transition-colors">50%</button>
                <button onClick={() => setImgSize('img-size-100')} className="px-2 h-7 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold hover:bg-indigo-100 transition-colors">100%</button>
                <div className="w-px h-6 bg-slate-100 mx-1"></div>
              </div>
            )}

            <button onClick={handleImageInsert} className="w-9 h-9 flex items-center justify-center bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-all active:scale-95" title="Insert Media">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
            </button>

            <div className="flex-grow"></div>
            <div className="hidden sm:flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter border border-emerald-100">
              Live Canvas
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          {/* DYNAMIC CONTENT AREA */}
          <div className="flex-grow flex flex-col overflow-hidden relative bg-white">
            <div
              ref={previewRef}
              contentEditable={hasConverted}
              onPaste={handlePaste}
              spellCheck
              className={`flex-grow p-16 overflow-auto focus:outline-none font-serif leading-relaxed text-[19px] preview-container selection:bg-indigo-50 z-10 ${!hasConverted ? 'cursor-not-allowed opacity-50' : ''}`}
              onInput={() => setHasConverted(true)}
            />

            {/* Placeholder - only visible when empty and not hasConverted */}
            {!hasConverted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 pointer-events-none select-none z-0">
                <p className="text-xl font-black uppercase tracking-[0.2em] opacity-30">Live Document</p>
                <p className="text-xs font-bold mt-2 opacity-20">Convert your draft to begin live editing.</p>
              </div>
            )}

            {/* ACTION BAR */}
            {hasConverted && (
              <div className="absolute bottom-6 right-6 flex items-center space-x-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 z-20" ref={exportMenuRef}>
                <button
                  onClick={clearAll}
                  className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-xl transition-all active:scale-95"
                >
                  Clear Live
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-xl transition-all hover:scale-105 active:scale-95 group"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download
                  </button>

                  {showExportMenu && (
                    <div className="absolute right-0 bottom-16 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 overflow-hidden ring-4 ring-slate-50">
                      <button onClick={() => handleExport('docx')} className="w-full p-3 text-left hover:bg-blue-50/50 rounded-xl flex items-center space-x-4 transition-all group">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                          <img src="/word.svg" alt="Word Icon" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="font-bold text-slate-700 text-xs text-nowrap">Download as DOCX</div>
                      </button>
                      <button onClick={() => handleExport('pdf')} className="w-full p-3 text-left hover:bg-red-50/50 rounded-xl flex items-center space-x-4 transition-all group mt-1">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                          <img src="/pdf.svg" alt="PDF Icon" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="font-bold text-slate-700 text-xs text-nowrap">Download as PDF</div>
                      </button>
                      <button onClick={() => handleExport('html')} className="w-full p-3 text-left hover:bg-orange-50/50 rounded-xl flex items-center space-x-4 transition-all group mt-1">
                        <div className="w-10 h-10 flex items-center justify-center shrink-0">
                          <img src="/html.svg" alt="HTML Icon" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="font-bold text-slate-700 text-xs text-nowrap">Download as HTML</div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <p className="text-slate-700 font-bold text-sm mb-6 tracking-tight">Need More Help? Visit Us On</p>

          <div className="flex items-center space-x-6">
            {/* GitHub */}
            <a href="https://github.com/Davebash" target="_blank" rel="noopener noreferrer" className="group transform hover:scale-110 transition-all duration-300">
              <div className="w-10 h-10 bg-white rounded-full shadow-lg shadow-slate-100 flex items-center justify-center border border-slate-50 group-hover:shadow-slate-300">
                <svg className="w-5 h-5 text-[#181717]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.419-1.305.763-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
              </div>
            </a>

            {/* Telegram */}
            <a href="https://t.me/Dave_zkai" target="_blank" rel="noopener noreferrer" className="group transform hover:scale-110 transition-all duration-300">
              <div className="w-10 h-10 bg-white rounded-full shadow-lg shadow-sky-100 flex items-center justify-center border border-slate-50 group-hover:shadow-sky-200">
                <svg className="w-5 h-5 text-[#26A5E4]" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
              </div>
            </a>

            {/* Gmail */}
            <a href="mailto:davezelalem00@gmail.com" className="group transform hover:scale-110 transition-all duration-300">
              <div className="w-10 h-10 bg-white rounded-full shadow-lg shadow-red-100 flex items-center justify-center border border-slate-50 group-hover:shadow-red-200">
                <svg className="w-5 h-5 text-[#EA4335]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" /></svg>
              </div>
            </a>
          </div>

          <p className="text-slate-400 text-xs mt-8 tracking-wide font-medium">© {new Date().getFullYear()} DocuCraft. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
