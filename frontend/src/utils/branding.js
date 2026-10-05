export const BANK = {
  fullName: 'The Junagadh Jilla Sahakari Bank Ltd.',
  shortName: 'JJS Bank',
  system: 'Audit Management System (AMS)',
  primary: [26, 54, 93],
  accent: [185, 28, 44],
  muted: [110, 116, 125],
};

export const LOGO_SRC = '/JDCC-Logo.png';

let logoPromise = null;

export function getLogoDataUrl(maxSize = 320) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          const w = Math.max(1, Math.round(img.width * ratio));
          const h = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = LOGO_SRC;
    });
  }
  return logoPromise;
}

export async function addPdfHeader(doc, { title, subtitle, logoHeight = 20, align = 'left' } = {}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const logo = await getLogoDataUrl();
  let y = 12;

  if (logo) {
    const props = doc.getImageProperties(logo);
    const w = (props.width / props.height) * logoHeight;
    doc.addImage(logo, 'PNG', margin, y, w, logoHeight);

    const textX = margin + w + 6;
    doc.setTextColor(...BANK.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(BANK.fullName, textX, y + logoHeight / 2 - 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BANK.muted);
    doc.text(BANK.system, textX, y + logoHeight / 2 + 5);
    y += logoHeight;
  } else {
    doc.setTextColor(...BANK.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(BANK.fullName, align === 'center' ? pageWidth / 2 : margin, y + 5, {
      align: align === 'center' ? 'center' : 'left',
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BANK.muted);
    doc.text(BANK.system, align === 'center' ? pageWidth / 2 : margin, y + 11, {
      align: align === 'center' ? 'center' : 'left',
    });
    y += 14;
  }

  y += 6;
  doc.setDrawColor(...BANK.primary);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (title) {
    doc.setTextColor(...BANK.primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(title), pageWidth / 2, y, { align: 'center' });
    y += 7;
  }
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BANK.muted);
    doc.text(String(subtitle), pageWidth / 2, y, { align: 'center' });
    y += 6;
  }

  return y + 2;
}

export function addPdfFooter(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageNumber = doc.internal.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BANK.muted);
  doc.text(`${BANK.shortName} \u2013 ${BANK.system}`, 14, pageHeight - 7);
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
}

export function drawCompactHeader(doc, logo, margin = 14, logoHeight = 11) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 8;
  if (logo) {
    const props = doc.getImageProperties(logo);
    const w = (props.width / props.height) * logoHeight;
    doc.addImage(logo, 'PNG', margin, y, w, logoHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BANK.primary);
    doc.text(BANK.fullName, margin + w + 5, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BANK.muted);
    doc.text(BANK.system, margin + w + 5, y + 9);
    y += logoHeight;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BANK.primary);
    doc.text(BANK.fullName, margin, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...BANK.muted);
    doc.text(BANK.system, margin, y + 9);
    y += logoHeight;
  }
  doc.setDrawColor(...BANK.primary);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
}
