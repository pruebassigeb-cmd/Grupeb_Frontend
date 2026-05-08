import jsPDF from "jspdf";

// 215mm x 140mm landscape
// jsPDF: format:[140, 215] → PAGE_W=215mm, PAGE_H=140mm

const TABLA_Y = 43;   // Y base primera fila de bultos
const ROW_H = 4;   // mm entre renglones

export interface BultoTresGuerras {
  idbulto: number;
  nombre_producto: string;
  medida: string;
  empaque: string;
  clave_unidad_sat: string;
  clave_producto_sat: string;
  peso: number | null;
  largo: number | null;
  ancho: number | null;
  alto: number | null;
}

export interface FormatoTresGuerrasParams {
  datos: {
    no_pedido: string;
    idenvio: number;
    remitente: {
      nombre_empresa: string;
      razon_social: string;
      rfc: string;
      telefonos: string;
      domicilio: string;
      colonia: string;
      ciudad: string;
      estado: string;
      codigo_postal: string;
      correo: string;
    };
    destinatario: {
      nombre: string;
      razon_social: string;
      rfc: string;
      telefonos: string;
      domicilio: string;
      colonia: string;
      ciudad: string;
      estado: string;
      codigo_postal: string;
      correo: string;
    };
    facturacion: {
      rfc: string;
      uso_cfdi: string;
      correo: string;
    } | null;
    bultos: BultoTresGuerras[];
  };
  condicionPago: "pagado" | "cobrar_destino" | "cobrar_regreso";
  recoleccion: "si" | "no";
  tipoEntrega: "ocurre" | "domicilio";
  documentos: {
    factura: boolean;
    ordenCompra: boolean;
    pedido: boolean;
    otro: boolean;
    otroTexto: string;
  };
  mercanciaAsegurada: boolean;
  valorDeclarado: string;
  materialPeligroso: boolean;
  clavePeligroso: string;
  claveEmbalajeSat: string;
  observaciones: string;
}

function txt(doc: jsPDF, text: string, x: number, y: number, size: number = 7) {
  if (!text) return;
  doc.setFontSize(size);
  doc.text(text, x, y);
}

function chk(doc: jsPDF, x: number, y: number, checked: boolean) {
  if (!checked) return;
  doc.setFontSize(7);
  doc.text("X", x, y);
}

export async function generarFormatoTresGuerras(params: FormatoTresGuerrasParams) {
  const {
    datos,
    condicionPago, recoleccion, tipoEntrega,
    documentos, mercanciaAsegurada, valorDeclarado,
    materialPeligroso, clavePeligroso, claveEmbalajeSat,
    observaciones,
  } = params;

  const { remitente: rem, destinatario: dest, facturacion, bultos } = datos;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [140, 215],
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // Fila 1 — Condición de pago (PAGADO / COBRAR DESTINO / COBRAR REGRESO)
  chk(doc, 20, 24, condicionPago === "pagado");
  chk(doc, 31, 24, condicionPago === "cobrar_destino");
  chk(doc, 42, 24, condicionPago === "cobrar_regreso");

  // Fila 1 — Recolección SI / NO
  chk(doc, 50, 24, recoleccion === "si");
  chk(doc, 57, 24, recoleccion === "no");

  // Fila 1 — Tipo de entrega OCURRE / DOMICILIO
  chk(doc, 72, 24, tipoEntrega === "ocurre");
  chk(doc, 83, 24, tipoEntrega === "domicilio");

  // Fila 1 — Documentos que anexa
  chk(doc, 103, 24, documentos.factura);
  chk(doc, 118, 24, documentos.ordenCompra);
  chk(doc, 132, 24, documentos.pedido);
  chk(doc, 116, 24, documentos.otro);
  if (documentos.otro && documentos.otroTexto) {
    txt(doc, documentos.otroTexto, 120, 24, 5);
  }

  // Fila 1 — Mercancía asegurada SI / NO + valor declarado
  chk(doc, 163, 22, mercanciaAsegurada);
  chk(doc, 163, 25, !mercanciaAsegurada);
  if (mercanciaAsegurada && valorDeclarado) {
    txt(doc, `$${valorDeclarado}`, 172, 22, 7);
  }

  // Fila 2 — Tabla de bultos
  bultos.forEach((bulto, idx) => {
    const y = TABLA_Y + idx * ROW_H;
    const contiene = [bulto.nombre_producto, bulto.medida].filter(Boolean).join(" ");

    txt(doc, "1", 11, y - 9, 7);   // Cantidad
    txt(doc, bulto.empaque, 20, y - 9, 7);   // Tipo empaque
    //txt(doc, bulto.clave_unidad_sat, 22, y - 9, 5);   // Clave unidad SAT (debajo empaque)
    txt(doc, bulto.clave_producto_sat, 32, y - 9, 5);   // Clave producto SAT
    txt(doc, contiene, 50, y - 9, 7);   // Que contiene

    if (bulto.peso != null) txt(doc, String(bulto.peso), 144, y -9, 7);   // Peso
    if (bulto.largo != null) txt(doc, String(bulto.largo), 158, y -9, 7);   // Largo
    if (bulto.ancho != null) txt(doc, String(bulto.ancho), 169, y -9, 7);   // Ancho
    if (bulto.alto != null) txt(doc, String(bulto.alto), 179, y -9, 7);   // Alto

    chk(doc, 186, y -9, materialPeligroso);
    chk(doc, 191, y -9, !materialPeligroso);
    if (materialPeligroso && clavePeligroso) {
      txt(doc, clavePeligroso, 197, y -9, 6);
    }
    if (claveEmbalajeSat) {
      txt(doc, claveEmbalajeSat, 209, y -9, 7);
    }
  });

  // Fila 3 — Facturación: Nombre
  if (facturacion) txt(doc, dest.nombre,       25, 67, 7);
  // Fila 3b — Facturación: Razón Social (1cm = 10mm debajo del nombre)
  if (facturacion) txt(doc, dest.razon_social, 25, 77, 7);

  // Fila 4 — Facturación: RFC
  if (facturacion) txt(doc, facturacion.rfc, 25, 84, 7);

  // Fila 5 — Facturación: E-mail
  if (facturacion) txt(doc, facturacion.correo, 25, 88, 7);

  // Fila 6 — Facturación: Uso CFDI / C.P.
  //if (facturacion) txt(doc, facturacion.uso_cfdi, 72, 83, 7);
  if (facturacion) txt(doc, dest.codigo_postal, 92, 83, 7);

  // Fila 7 — Remitente: Nombre empresa
  txt(doc, rem.nombre_empresa, 25, 97, 7);

  // Fila 8 — Remitente: Razón Social
  txt(doc, rem.razon_social,   25, 101, 7);

  // Fila 9 — Remitente: RFC
  txt(doc, rem.rfc,            25, 105, 7);

  // Fila 10 — Remitente: Teléfonos
  txt(doc, rem.telefonos,      25, 109, 7);

  // Fila 11 — Remitente: Domicilio
  txt(doc, rem.domicilio,      25, 113, 7);

  // Fila 12 — Remitente: Colonia
  txt(doc, rem.colonia,        25, 117, 7);

  // Fila 13 — Remitente: Ciudad
  txt(doc, rem.ciudad,         25, 121, 7);

  // Fila 14 — Remitente: Estado
  txt(doc, rem.estado,         92, 121, 7);

  // Fila 14 — Remitente: C.P.
  txt(doc, rem.codigo_postal,  25, 125, 7);

  // Fila 15 — Remitente: Correo
  txt(doc, rem.correo,         65, 125, 7);

  // ── DESTINATARIO ─────────────────────────────────────────────────────────────

  // Fila 7 — Destinatario: Nombre
  txt(doc, dest.nombre,        130, 97, 7);

  // Fila 8 — Destinatario: Razón Social
  txt(doc, dest.razon_social,  130, 101, 7);

  // Fila 8 — Destinatario: RFC
  txt(doc, dest.rfc,           130, 105, 7);

  // Fila 9 — Destinatario: Teléfonos
  txt(doc, dest.telefonos,     130, 109, 7);

  // Fila 10 — Destinatario: Domicilio
  txt(doc, dest.domicilio,     130, 113, 7);

  // Fila 11 — Destinatario: Colonia
  txt(doc, dest.colonia,       130, 117, 7);

  // Fila 12 — Destinatario: Ciudad
  txt(doc, dest.ciudad,        130, 121, 7);

  // Fila 13 — Destinatario: Estado
  txt(doc, dest.estado,        197, 121, 7);

  // Fila 14 — Destinatario: C.P.
  txt(doc, dest.codigo_postal, 130, 125, 7);

  // Fila 15 — Destinatario: Correo
  txt(doc, dest.correo,        170, 125, 7);

  // ── OBSERVACIONES ────────────────────────────────────────────────────────────

  // Fila 16 — Observaciones
  if (observaciones) {
    txt(doc, observaciones,    50, 130, 7);
  }

  doc.save(`OrdenServicioTresGuerras_${datos.no_pedido}.pdf`);
}