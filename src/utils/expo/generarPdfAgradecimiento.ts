import jsPDF from "jspdf";
import { cargarLogoBase64 } from "../../services/Pdfutils";
import logoUrl from "../../assets/logogrupeb.png";

const GOLD: [number, number, number] = [201, 146, 42];
const BLACK: [number, number, number] = [13, 13, 13];
const GRAY: [number, number, number] = [90, 90, 90];

export async function generarPdfAgradecimiento(descargar = false): Promise<Blob> {
  const logoBase64 = await cargarLogoBase64(logoUrl);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW = 215.9;
  const PH = 279.4;
  const M = 18;

  // ── Header ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, PW, 42, "F");

  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", M, 8, 26, 26); } catch { /* silencioso */ }
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(...GOLD);
  doc.text("GRUPO EB", M + 32, 24);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(220, 220, 220);
  doc.text("Soluciones de empaque para tu marca", M + 32, 31);

  let y = 56;

  // ── Título ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...BLACK);
  doc.text("Fabricamos el empaque que tu marca necesita", M, y);
  y += 10;

  doc.setDrawColor(...GOLD); doc.setLineWidth(0.8);
  doc.line(M, y, M + 40, y);
  y += 10;

  // ── Descripción ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(50, 50, 50);
  const intro = doc.splitTextToSize(
    "En Grupo EB nos especializamos en el desarrollo y fabricación de empaques, " +
    "adaptándonos a las necesidades específicas de cada marca. Contamos con capacidad " +
    "propia de producción, control de calidad y tiempos de entrega competitivos.",
    PW - M * 2
  );
  doc.text(intro, M, y);
  y += intro.length * 5 + 8;

  // ── Líneas de producto ───────────────────────────────────────────────────
  const productos: { titulo: string; desc: string }[] = [
    { titulo: "Bolsas de papel",      desc: "Kraft, couché y materiales especiales, con o sin impresión." },
    { titulo: "Bolsas de plástico",   desc: "Alta y baja densidad, BOPP/celofán, asas rígidas y flexibles." },
    { titulo: "Cajas plegadizas",     desc: "Diseño y fabricación a la medida para producto terminado." },
    { titulo: "Cajas corrugadas",     desc: "Empaque secundario y de transporte, resistente y funcional." },
    { titulo: "Empaques especiales",  desc: "Soluciones a la medida para las necesidades de tu producto." },
    { titulo: "Impresos comerciales", desc: "Material de punto de venta e impresos para tu marca." },
  ];

  const colW = (PW - M * 2 - 10) / 2;
  productos.forEach((p, i) => {
    const col = i % 2;
    const fila = Math.floor(i / 2);
    const x = M + col * (colW + 10);
    const yBox = y + fila * 30;

    doc.setFillColor(250, 247, 240);
    doc.setDrawColor(...GOLD);
    doc.roundedRect(x, yBox, colW, 25, 2, 2, "FD");

    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...BLACK);
    doc.text(p.titulo, x + 5, yBox + 8);

    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
    const desc = doc.splitTextToSize(p.desc, colW - 10);
    doc.text(desc, x + 5, yBox + 14);
  });

  y += Math.ceil(productos.length / 2) * 30 + 14;

  // ── Cierre ───────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(50, 50, 50);
  const cierre = doc.splitTextToSize(
    "Si tienes algún proyecto en desarrollo o requieres una cotización, con gusto podemos " +
    "ayudarte. Nuestro equipo está listo para asesorarte desde el diseño hasta la fabricación.",
    PW - M * 2
  );
  doc.text(cierre, M, y);

  // ── Footer / contacto ────────────────────────────────────────────────────
  const footerY = PH - 30;
  doc.setFillColor(...BLACK);
  doc.rect(0, footerY, PW, 30, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...GOLD);
  doc.text("Rogelio Ledesma # 102, Col. Cruz Vieja, Tlajomulco de Zúñiga, Jalisco", M, footerY + 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(210, 210, 210);
  doc.text("Tel: (33) 3180-3373, 3125-9595, 3180-1460   ·   www.grupoeb.com.mx", M, footerY + 18);
  doc.text("ventas@grupoeb.com.mx", M, footerY + 24);

  const blob = doc.output("blob");
  if (descargar) doc.save("GrupoEB_Informacion.pdf");
  return blob;
}