import { generateHTMLReport } from "./htmlReport.js";

function buildDefaultFilename() {
  // Format: design-review-report-YYYY-MM-DD-HH-MM-SS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `design-review-report-${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

// Helper to enrich colors with name field
function enrichColorsWithName(tokens, colorNameMap) {
  if (!tokens || !Array.isArray(tokens.colors)) return tokens;

  const nameMap = colorNameMap || {};
  return {
    ...tokens,
    colors: tokens.colors.map(token => ({
      ...token,
      name: nameMap[String(token.value).toUpperCase()] || "No name"
    }))
  };
}

export function exportReport({ format, reportData, getTypeDisplayName, filenameBase, colorNameMap } = {}) {
  const data = reportData || {};
  if (!data.issues && !data.tokens) {
    alert("No data to export!");
    return;
  }

  const filename = filenameBase || buildDefaultFilename();

  if (format === "html") {
    const html = generateHTMLReport({ reportData: data, getTypeDisplayName });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (format === "pdf") {
    const html = generateHTMLReport({ reportData: data, getTypeDisplayName });

    // Try to open print window
    try {
      const printWindow = window.open("", "_blank");

      if (!printWindow) {
        // Popup blocked - fallback to download HTML with print instructions
        alert("Popup blocked. Downloading HTML - you can open the file and select Print to create PDF.");
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.html`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Write content to new window
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        if (printWindow.document && printWindow.document.readyState === "complete") {
          printWindow.print();
        }
      }, 500);
    } catch (error) {
      console.error("Error opening print window:", error);
      // Fallback: download HTML
      alert("Cannot open print window. Downloading HTML - you can open the file and select Print to create PDF.");
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
    return;
  }

  if (format === "json") {
    // Debug: log colorNameMap
    console.log("Export JSON - colorNameMap:", colorNameMap);
    console.log("Export JSON - tokens.colors:", data.tokens?.colors);

    // Create export data with enriched colors (add name field)
    const exportData = {
      ...data,
      tokens: enrichColorsWithName(data.tokens, colorNameMap)
    };

    console.log("Export JSON - enriched colors:", exportData.tokens?.colors);
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
}


