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

  // Helper to add text with wrapping
  const addText = (
    text: string,
    fontSize: number,
    fontStyle: "normal" | "bold" = "normal",
    color: [number, number, number] = [255, 255, 255],
  ) => {
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", fontStyle);
    pdf.setTextColor(...color);

    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.5;

    lines.forEach((line: string) => {
      if (yPosition + lineHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Set dark background
  pdf.setFillColor(13, 13, 13);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  // Title
  addText(getTypeLabel(analysis.type), 24, "bold", [171, 244, 63]); // Lime color
  yPosition += 5;

  // Metadata
  addText(`Vidéo: ${analysis.videoTitle}`, 10, "normal", [156, 163, 175]);
  addText(`Chaîne: ${analysis.channelName}`, 10, "normal", [156, 163, 175]);
  addText(
    `Généré le: ${formatDate(analysis.createdAt)}`,
    10,
    "normal",
    [156, 163, 175],
  );
  yPosition += 10;

  // Separator
  pdf.setDrawColor(63, 244, 229); // Cyan
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Content
  addText(analysis.content, 11, "normal", [229, 231, 235]);

  // Footer
  yPosition = pageHeight - 15;
  addText("Exporté depuis Knowledge AI", 8, "normal", [107, 114, 128]);

  const filename =
    options.filename ||
    `${analysis.type}-${analysis.videoTitle.slice(0, 30)}-${new Date().toISOString().split("T")[0]}.pdf`;

  pdf.save(filename.replace(/[^a-zA-Z0-9-_.]/g, "_"));
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
