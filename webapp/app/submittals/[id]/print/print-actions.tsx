"use client";

export default function PrintActions({
  submittalRef,
  projectName,
  materialName,
  brandName,
  items,
}: {
  submittalRef: string;
  projectName: string;
  materialName: string;
  brandName: string;
  items: string[];
}) {
  function print() {
    window.print();
  }

  async function downloadZip() {
    if (items.length === 0) {
      alert("This submittal has no index items to build folders for.");
      return;
    }
    const { default: JSZip } = await import("jszip");
    const folderName = `${projectName || "Project"} — ${materialName || "Material"} - ${brandName || "Brand"}`.replace(
      /[<>:"/\\|?*]/g,
      "-"
    );
    const zip = new JSZip();
    const root = zip.folder(folderName)!;
    items.forEach((item, i) => {
      const subName = `${String(i + 1).padStart(2, "0")}. ${item}`.replace(/[<>:"/\\|?*]/g, "-");
      root.folder(subName);
    });
    root.file(
      "_README.txt",
      `Submittal Folder: ${folderName}\nRef: ${submittalRef}\nGenerated: ${new Date().toLocaleString()}\n\nFolders:\n${items
        .map((it, i) => `  ${String(i + 1).padStart(2, "0")}. ${it}`)
        .join("\n")}`
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button className="btn primary" onClick={print}>
        Print / Save as PDF
      </button>
      <button className="btn" onClick={downloadZip}>
        Download folder structure (ZIP)
      </button>
    </div>
  );
}
