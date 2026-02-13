import React from "react";

const processInlineFormatting = (text: string): string => {
  let processed = text;

  // Prevent XSS
  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Code
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 px-1 rounded text-sm font-mono text-indigo-600">$1</code>',
  );

  // Bold
  processed = processed.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  processed = processed.replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // Italic
  processed = processed.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  processed = processed.replace(/_([^_]+)_/g, "<em>$1</em>");

  return processed;
};

export const formatText = (raw: string): React.ReactElement => {
  const lines = raw.split("\n");
  const elements: React.ReactElement[] = [];
  let listItems: string[] = [];
  let bqLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let tableRows: string[][] = [];
  let inTable = false;
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} className="mb-3">
          {listItems.map((item, idx) => (
            <li
              key={`li-${idx}`}
              className="ml-5 list-disc"
              dangerouslySetInnerHTML={{
                __html: processInlineFormatting(item),
              }}
            />
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  const flushBq = () => {
    if (bqLines.length > 0) {
      elements.push(
        <blockquote
          key={`bq-${key++}`}
          className="border-l-4 border-indigo-500 bg-indigo-50/50 pl-6 py-5 pr-6 rounded-r-2xl italic text-slate-700 my-6 shadow-sm ring-1 ring-indigo-100/50 relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-600/5 blur-3xl rounded-full" />

          {bqLines.map((line, idx) => {
            const trimmedLine = line.trim();
            if (trimmedLine === "") return <div key={idx} className="h-4" />;

            // Detect nested lists inside blockquote
            const isListItem =
              trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ");
            const isNumList = /^\d+\.\s/.test(trimmedLine);

            if (isListItem || isNumList) {
              const bulletContent = isListItem
                ? trimmedLine.substring(2)
                : trimmedLine.substring(trimmedLine.indexOf(" ") + 1);
              const bulletLabel = isListItem ? null : trimmedLine.split(".")[0];

              return (
                <div
                  key={idx}
                  className="flex items-start space-x-3 my-1 non-italic not-italic"
                >
                  <span className="text-indigo-400 mt-2 shrink-0">
                    {isListItem ? (
                      <svg
                        className="h-1.5 w-1.5 fill-current"
                        viewBox="0 0 8 8"
                      >
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                    ) : (
                      <span className="text-[10px] font-black font-sans leading-none">
                        {bulletLabel}.
                      </span>
                    )}
                  </span>
                  <span
                    className="leading-relaxed text-slate-600 font-normal"
                    dangerouslySetInnerHTML={{
                      __html: processInlineFormatting(bulletContent),
                    }}
                  />
                </div>
              );
            }

            return (
              <div
                key={idx}
                className="leading-relaxed mb-1.5 last:mb-0 relative z-10"
                dangerouslySetInnerHTML={{
                  __html: processInlineFormatting(line),
                }}
              />
            );
          })}
        </blockquote>,
      );
      bqLines = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const hasHeader = tableRows.length > 1;
      const headerRow = hasHeader ? tableRows[0] : [];
      const bodyRows = hasHeader ? tableRows.slice(1) : tableRows;

      elements.push(
        <div key={`table-wrapper-${key++}`} className="overflow-x-auto my-4">
          <table className="min-w-full border-collapse border border-gray-300">
            {hasHeader && (
              <thead className="bg-gray-100">
                <tr>
                  {headerRow.map((cell, idx) => (
                    <th
                      key={`th-${idx}`}
                      className="border border-gray-300 px-4 py-2 text-left font-semibold"
                      dangerouslySetInnerHTML={{
                        __html: processInlineFormatting(cell.trim()),
                      }}
                    />
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rowIdx) => (
                <tr
                  key={`tr-${rowIdx}`}
                  className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={`td-${cellIdx}`}
                      className="border border-gray-300 px-4 py-2"
                      dangerouslySetInnerHTML={{
                        __html: processInlineFormatting(cell.trim()),
                      }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      tableRows = [];
      inTable = false;
    }
  };

  lines.forEach((line, index) => {
    // Handle code blocks first as they consume lines verbatim
    // Check for ``` anywhere in the line, not just at start after trim
    const codeBlockMatch = line.match(/```/);
    if (codeBlockMatch) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        elements.push(
          <pre
            key={`pre-${key++}`}
            className="bg-gray-800 text-gray-100 p-4 rounded-md mb-4 overflow-x-auto text-sm font-mono"
          >
            <code>{codeBlockContent.join("\n")}</code>
          </pre>,
        );
        codeBlockContent = [];
      } else {
        // Start of code block
        flushList();
        flushBq();
        flushTable();
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    const trimmed = line.trim();

    // Detect table rows (contains | character and not a separator line)
    // Skip lines that are table separators - they have mostly dashes
    if (trimmed.includes("|")) {
      // Count dashes vs other characters (excluding pipes and spaces)
      const dashCount = (trimmed.match(/-/g) || []).length;
      const totalChars = trimmed.replace(/[\s|]/g, "").length;
      const isTableSeparator = dashCount > 0 && dashCount >= totalChars * 0.8; // 80% or more dashes

      if (!isTableSeparator) {
        flushList();
        flushBq();
        const cells = trimmed.split("|").filter((cell, idx, arr) => {
          // Remove empty first/last cells if line starts/ends with |
          if (idx === 0 && cell.trim() === "") return false;
          if (idx === arr.length - 1 && cell.trim() === "") return false;
          return true;
        });
        tableRows.push(cells);
        inTable = true;
        return;
      } else {
        // Skip separator line but stay in table mode
        return;
      }
    } else if (inTable) {
      // End of table
      flushTable();
    }

    // Handle Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList();
      flushBq();
      flushTable();
      elements.push(
        <hr key={`hr-${key++}`} className="my-6 border-t-2 border-gray-200" />,
      );
    }
    // Handle headings
    else if (trimmed.startsWith("#### ") || trimmed.startsWith("##### ")) {
      // Explicitly ignore H4 headers as requested
      return;
    } else if (trimmed.startsWith("### ")) {
      flushList();
      flushBq();
      flushTable();
      const text = trimmed.substring(4);
      elements.push(
        <h3
          key={`h3-${key++}`}
          className="text-lg font-medium mt-4 mb-2"
          dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }}
        />,
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      flushBq();
      flushTable();
      const text = trimmed.substring(3);
      elements.push(
        <h2
          key={`h2-${key++}`}
          className="text-xl font-semibold mt-5 mb-2"
          dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }}
        />,
      );
    } else if (trimmed.startsWith("# ")) {
      flushList();
      flushBq();
      flushTable();
      const text = trimmed.substring(2);
      elements.push(
        <h1
          key={`h1-${key++}`}
          className="text-2xl font-bold mt-6 mb-3"
          dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }}
        />,
      );
    }
    // Handle blockquotes
    else if (trimmed.startsWith(">")) {
      flushList();
      flushTable();
      // Take the content after '>' and handle optional space
      const text = line.trim().startsWith("> ")
        ? line.trim().substring(2)
        : line.trim().substring(1);
      bqLines.push(text);
    }
    // Handle list items
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushBq();
      flushTable();
      const text = trimmed.substring(2);
      listItems.push(text);
    }
    // Handle paragraphs
    else if (trimmed.length > 0) {
      flushList();
      flushBq();
      flushTable();
      elements.push(
        <p
          key={`p-${key++}`}
          className="mb-3"
          dangerouslySetInnerHTML={{ __html: processInlineFormatting(trimmed) }}
        />,
      );
    }
    // Handle empty lines
    else {
      flushList();
      flushBq();
      flushTable();
    }
  });

  flushList();
  flushBq();
  flushTable();

  // If code block was not closed
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre
        key={`pre-${key++}`}
        className="bg-gray-800 text-gray-100 p-4 rounded-md mb-4 overflow-x-auto text-sm font-mono"
      >
        <code>{codeBlockContent.join("\n")}</code>
      </pre>,
    );
  }

  return <div>{elements}</div>;
};
