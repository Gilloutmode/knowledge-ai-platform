// jsPDF and html2canvas are dynamically imported to reduce initial bundle size
// They're only loaded when PDF export is actually used

export type ExportFormat = "markdown" | "pdf" | "json";

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  template?: "default" | "minimal" | "detailed";
  filename?: string;
}

export interface AnalysisExportData {
  id: string;
  type: string;
  content: string;
  videoTitle: string;
  channelName: string;
  createdAt: string;
  videoUrl?: string;
  duration?: string;
}

// Type labels for display
const typeLabels: Record<string, string> = {
  transcript: "Transcription",
  summary_short: "Résumé court",
  summary_detailed: "Résumé détaillé",
  lesson_card: "Fiche de cours",
  actions: "Actions",
  flashcards: "Flashcards",
};

// Convert analysis type to readable label
function getTypeLabel(type: string): string {
  return typeLabels[type] || type;
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate Markdown content
export function generateMarkdown(
  analysis: AnalysisExportData,
  options: ExportOptions = { format: "markdown" },
): string {
  const {
    includeMetadata = true,
    includeTimestamps = true,
    template = "default",
  } = options;

  let markdown = "";

  // Header
  markdown += `# ${getTypeLabel(analysis.type)}\n\n`;

  // Metadata section
  if (includeMetadata) {
    markdown += `## Informations\n\n`;
    markdown += `- **Vidéo**: ${analysis.videoTitle}\n`;
    markdown += `- **Chaîne**: ${analysis.channelName}\n`;
    if (analysis.videoUrl) {
      markdown += `- **URL**: ${analysis.videoUrl}\n`;
    }
    if (analysis.duration) {
      markdown += `- **Durée**: ${analysis.duration}\n`;
    }
    if (includeTimestamps) {
      markdown += `- **Généré le**: ${formatDate(analysis.createdAt)}\n`;
    }
    markdown += "\n---\n\n";
  }

  // Content
  if (template === "minimal") {
    markdown += analysis.content;
  } else if (template === "detailed") {
    markdown += `## Contenu\n\n`;
    markdown += analysis.content;
    markdown += "\n\n---\n\n";
    markdown += `*Exporté depuis Knowledge AI*\n`;
  } else {
    // Default template
    markdown += analysis.content;
    markdown += "\n\n---\n\n";
    markdown += `*Exporté le ${formatDate(new Date().toISOString())}*\n`;
  }

  return markdown;
}

// Generate batch Markdown for multiple analyses
export function generateBatchMarkdown(
  analyses: AnalysisExportData[],
  _options: ExportOptions = { format: "markdown" },
): string {
  let markdown = "# Export des Analyses\n\n";
  markdown += `*${analyses.length} analyse(s) exportée(s) le ${formatDate(new Date().toISOString())}*\n\n`;
  markdown += "---\n\n";

  analyses.forEach((analysis, index) => {
    markdown += `## ${index + 1}. ${analysis.videoTitle}\n\n`;
    markdown += `**Type**: ${getTypeLabel(analysis.type)}\n`;
    markdown += `**Chaîne**: ${analysis.channelName}\n\n`;
    markdown += analysis.content;
    markdown += "\n\n---\n\n";
  });

  return markdown;
}

// Export to JSON
export function generateJSON(
  analyses: AnalysisExportData | AnalysisExportData[],
  _options: ExportOptions = { format: "json" },
): string {
  const data = Array.isArray(analyses) ? analyses : [analyses];
  const exportData = {
    exportedAt: new Date().toISOString(),
    platform: "Knowledge AI",
    analyses: data.map((a) => ({
      ...a,
      typeLabel: getTypeLabel(a.type),
    })),
  };
  return JSON.stringify(exportData, null, 2);
}

// Copy to clipboard
export async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = content;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// Download file
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download Markdown
export function downloadMarkdown(
  analysis: AnalysisExportData | AnalysisExportData[],
  options: ExportOptions = { format: "markdown" },
): void {
  const isArray = Array.isArray(analysis);
  const content = isArray
    ? generateBatchMarkdown(analysis, options)
    : generateMarkdown(analysis, options);

  const filename =
    options.filename ||
    (isArray
      ? `analyses-export-${new Date().toISOString().split("T")[0]}.md`
      : `${(analysis as AnalysisExportData).type}-${new Date().toISOString().split("T")[0]}.md`);

  downloadFile(content, filename, "text/markdown");
}

// Download JSON
export function downloadJSON(
  analysis: AnalysisExportData | AnalysisExportData[],
  options: ExportOptions = { format: "json" },
): void {
  const content = generateJSON(analysis, options);
  const filename =
    options.filename ||
    `analyses-export-${new Date().toISOString().split("T")[0]}.json`;
  downloadFile(content, filename, "application/json");
}

// Generate PDF from HTML element (dynamic import for code splitting)
export async function generatePDFFromElement(
  element: HTMLElement,
  filename: string = "export.pdf",
): Promise<void> {
  try {
    // Dynamic imports for code splitting - only load when PDF is needed
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#0D0D0D", // Dark background
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 10;

    pdf.addImage(
      imgData,
      "PNG",
      imgX,
      imgY,
      imgWidth * ratio,
      imgHeight * ratio,
    );
    pdf.save(filename);
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    throw error;
  }
}

// Platform colors
const COLORS = {
  background: [13, 13, 13] as [number, number, number],
  backgroundLight: [26, 26, 26] as [number, number, number],
  lime: [171, 244, 63] as [number, number, number],
  cyan: [63, 244, 229] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray300: [209, 213, 219] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray500: [107, 114, 128] as [number, number, number],
  orange: [251, 146, 60] as [number, number, number],
  blue: [96, 165, 250] as [number, number, number],
  purple: [192, 132, 252] as [number, number, number],
  amber: [251, 191, 36] as [number, number, number],
};

// Get type color
function getTypeColor(type: string): [number, number, number] {
  const colorMap: Record<string, [number, number, number]> = {
    transcript: COLORS.gray400,
    summary_short: COLORS.orange,
    summary_detailed: COLORS.blue,
    lesson_card: COLORS.lime,
    actions: COLORS.amber,
    flashcards: COLORS.purple,
  };
  return colorMap[type] || COLORS.lime;
}

// Parse markdown content into structured elements
interface ParsedElement {
  type: "h1" | "h2" | "h3" | "p" | "li" | "blockquote" | "hr" | "empty";
  content: string;
  indent?: number;
}

function parseMarkdownContent(content: string): ParsedElement[] {
  const lines = content.split("\n");
  const elements: ParsedElement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push({ type: "empty", content: "" });
    } else if (trimmed.startsWith("# ")) {
      elements.push({ type: "h1", content: trimmed.substring(2) });
    } else if (trimmed.startsWith("## ")) {
      elements.push({ type: "h2", content: trimmed.substring(3) });
    } else if (trimmed.startsWith("### ")) {
      elements.push({ type: "h3", content: trimmed.substring(4) });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push({ type: "li", content: trimmed.substring(2), indent: 0 });
    } else if (trimmed.match(/^\d+\.\s/)) {
      elements.push({
        type: "li",
        content: trimmed.replace(/^\d+\.\s/, ""),
        indent: 0,
      });
    } else if (trimmed.startsWith("> ")) {
      elements.push({ type: "blockquote", content: trimmed.substring(2) });
    } else if (trimmed === "---" || trimmed === "***") {
      elements.push({ type: "hr", content: "" });
    } else {
      elements.push({ type: "p", content: trimmed });
    }
  }

  return elements;
}

// Clean markdown formatting from text (bold, italic, etc.)
function cleanMarkdownText(text: string): {
  text: string;
  isBold: boolean;
  isItalic: boolean;
} {
  let isBold = false;
  let isItalic = false;

  // Check for bold
  if (text.includes("**") || text.includes("__")) {
    isBold = true;
  }
  // Check for italic
  if (
    (text.includes("*") && !text.includes("**")) ||
    (text.includes("_") && !text.includes("__"))
  ) {
    isItalic = true;
  }

  // Remove markdown formatting
  const cleaned = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  return { text: cleaned, isBold, isItalic };
}

// Generate PDF from markdown content (dynamic import for code splitting)
export async function generatePDFFromMarkdown(
  analysis: AnalysisExportData,
  options: ExportOptions = { format: "pdf" },
): Promise<void> {
  // Dynamic import for code splitting - only load when PDF is needed
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;
  let pageNumber = 1;
  const typeColor = getTypeColor(analysis.type);

  // Helper to add background to new page
  const addBackground = () => {
    pdf.setFillColor(...COLORS.background);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
  };

  // Helper to add footer
  const addFooter = () => {
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.gray500);
    pdf.text("Knowledge AI", margin, pageHeight - 10);
    pdf.text(`Page ${pageNumber}`, pageWidth - margin - 15, pageHeight - 10);

    // Bottom accent line
    pdf.setDrawColor(...COLORS.lime);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  };

  // Helper to check and add new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (yPosition + neededHeight > pageHeight - 25) {
      addFooter();
      pdf.addPage();
      pageNumber++;
      addBackground();
      yPosition = margin;
    }
  };

  // Helper to add text with wrapping and styling
  const addStyledText = (
    text: string,
    fontSize: number,
    fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal",
    color: [number, number, number] = COLORS.white,
    leftOffset: number = 0,
  ) => {
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", fontStyle);
    pdf.setTextColor(...color);

    const lines = pdf.splitTextToSize(text, contentWidth - leftOffset);
    const lineHeight = fontSize * 0.45;

    lines.forEach((line: string) => {
      checkNewPage(lineHeight);
      pdf.text(line, margin + leftOffset, yPosition);
      yPosition += lineHeight;
    });
  };

  // Initialize first page
  addBackground();

  // === HEADER SECTION ===
  // Top accent bar
  pdf.setFillColor(...COLORS.lime);
  pdf.rect(0, 0, pageWidth, 4, "F");

  yPosition = 15;

  // Logo/Brand
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.lime);
  pdf.text("KNOWLEDGE AI", margin, yPosition);

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...COLORS.gray500);
  pdf.text("Plateforme d'analyse vidéo", margin + 35, yPosition);

  yPosition += 12;

  // Type badge
  pdf.setFillColor(...typeColor, 0.15);
  const badgeText = getTypeLabel(analysis.type).toUpperCase();
  const badgeWidth = pdf.getTextWidth(badgeText) + 12;
  pdf.roundedRect(margin, yPosition - 5, badgeWidth, 8, 2, 2, "F");
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...typeColor);
  pdf.text(badgeText, margin + 6, yPosition);

  yPosition += 12;

  // Video title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.white);
  const titleLines = pdf.splitTextToSize(analysis.videoTitle, contentWidth);
  titleLines.forEach((line: string) => {
    pdf.text(line, margin, yPosition);
    yPosition += 8;
  });

  yPosition += 3;

  // Metadata row
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...COLORS.gray400);

  const channelText = `📺  ${analysis.channelName}`;
  const dateText = `📅  ${formatDate(analysis.createdAt)}`;

  pdf.text(channelText, margin, yPosition);
  pdf.text(dateText, margin + 80, yPosition);

  if (analysis.videoUrl) {
    yPosition += 5;
    pdf.setTextColor(...COLORS.cyan);
    pdf.text(`🔗  ${analysis.videoUrl}`, margin, yPosition);
  }

  yPosition += 10;

  // Separator line
  pdf.setDrawColor(...COLORS.cyan);
  pdf.setLineWidth(0.3);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);

  yPosition += 10;

  // === CONTENT SECTION ===
  const elements = parseMarkdownContent(analysis.content);
  let previousType = "";

  for (const element of elements) {
    const { text: cleanedText } = cleanMarkdownText(element.content);

    switch (element.type) {
      case "h1":
        // Add spacing before h1
        if (previousType && previousType !== "empty") {
          yPosition += 6;
        }
        checkNewPage(12);

        // H1 with lime color and underline
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.lime);
        pdf.text(cleanedText, margin, yPosition);
        yPosition += 2;

        // Underline
        const h1Width = Math.min(
          pdf.getTextWidth(cleanedText),
          contentWidth * 0.4,
        );
        pdf.setDrawColor(...COLORS.lime);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, margin + h1Width, yPosition);
        yPosition += 8;
        break;

      case "h2":
        // Add spacing before h2
        if (previousType && previousType !== "empty") {
          yPosition += 5;
        }
        checkNewPage(10);

        // H2 with cyan accent bar
        pdf.setFillColor(...COLORS.cyan);
        pdf.rect(margin, yPosition - 4, 2, 6, "F");

        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.cyan);
        pdf.text(cleanedText, margin + 5, yPosition);
        yPosition += 7;
        break;

      case "h3":
        if (previousType && previousType !== "empty") {
          yPosition += 3;
        }
        checkNewPage(8);

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...COLORS.white);
        pdf.text(cleanedText, margin, yPosition);
        yPosition += 6;
        break;

      case "li":
        checkNewPage(6);

        // Bullet point
        pdf.setFillColor(...COLORS.lime);
        pdf.circle(margin + 2, yPosition - 1.5, 1, "F");

        // List item text
        addStyledText(cleanedText, 10, "normal", COLORS.gray300, 8);
        yPosition += 1;
        break;

      case "blockquote":
        checkNewPage(10);

        // Blockquote background
        const quoteLines = pdf.splitTextToSize(cleanedText, contentWidth - 12);
        const quoteHeight = quoteLines.length * 4.5 + 4;

        pdf.setFillColor(...COLORS.lime, 0.08);
        pdf.roundedRect(
          margin,
          yPosition - 4,
          contentWidth,
          quoteHeight,
          2,
          2,
          "F",
        );

        // Left accent bar
        pdf.setFillColor(...COLORS.lime);
        pdf.rect(margin, yPosition - 4, 2, quoteHeight, "F");

        // Quote text
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(...COLORS.gray300);
        quoteLines.forEach((line: string) => {
          pdf.text(line, margin + 6, yPosition);
          yPosition += 4.5;
        });
        yPosition += 3;
        break;

      case "hr":
        yPosition += 4;
        checkNewPage(4);

        pdf.setDrawColor(...COLORS.gray500);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 6;
        break;

      case "empty":
        yPosition += 2;
        break;

      case "p":
      default:
        checkNewPage(6);
        addStyledText(cleanedText, 10, "normal", COLORS.gray300, 0);
        yPosition += 2;
        break;
    }

    previousType = element.type;
  }

  // Add final footer
  addFooter();

  // Generate filename
  const filename =
    options.filename ||
    `${getTypeLabel(analysis.type)} - ${analysis.videoTitle.slice(0, 40)} - ${new Date().toISOString().split("T")[0]}.pdf`;

  pdf.save(
    filename.replace(/[^a-zA-Z0-9-_. àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ]/g, "_"),
  );
}

// Main export function
export async function exportAnalysis(
  analysis: AnalysisExportData | AnalysisExportData[],
  options: ExportOptions,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (options.format) {
      case "markdown":
        downloadMarkdown(analysis, options);
        return { success: true, message: "Export Markdown réussi" };

      case "json":
        downloadJSON(analysis, options);
        return { success: true, message: "Export JSON réussi" };

      case "pdf":
        if (Array.isArray(analysis)) {
          if (analysis.length > 0) {
            await generatePDFFromMarkdown(analysis[0], options);
          }
        } else {
          await generatePDFFromMarkdown(analysis, options);
        }
        return { success: true, message: "Export PDF réussi" };

      default:
        return { success: false, message: "Format non supporté" };
    }
  } catch (error) {
    console.error("Export failed:", error);
    return { success: false, message: "Erreur lors de l'export" };
  }
}

export default {
  exportAnalysis,
  copyToClipboard,
  downloadMarkdown,
  downloadJSON,
  generateMarkdown,
  generateBatchMarkdown,
  generateJSON,
  generatePDFFromElement,
  generatePDFFromMarkdown,
};
