import jsPDF from "jspdf";

const ROW_H         = 11.8;
const TABLA_Y_START = 362;

// Columnas de la tabla de bultos
const COL_CANTIDAD        =  52;  // CANTIDAD
const COL_EMPAQUE         =  80;  // EMPAQUE
const COL_CONTIENE        = 190;  // QUE SE DICE QUE CONTIENE
const COL_CLAVE_PRODUCTO  = 347;  // CLAVE DE PRODUCTO SAT
const COL_CLAVE_UNIDAD    = 435;  // CLAVE DE UNIDAD SAT
const COL_VOLUMEN         = 510;  // VOLUMEN
const COL_PESO            = 570;  // PESO

export interface BultoFormCastores {
  idbulto:            number;
  nombre_producto:    string;
  medida:             string;
  empaque:            string;
  clave_producto_sat: string;
  clave_unidad_sat:   string;
}

export interface FormatoCastoresParams {
  datos: {
    no_pedido: string;
    remitente: {
      razon_social:       string;
      regimen_fiscal:     string;
      rfc:                string;
      calle:              string;
      numero:             string;
      colonia:            string;
      poblacion:          string;
      estado:             string;
      codigo_postal:      string;
      telefono:           string;
      direccion_completa: string;
    };
    destinatario: {
      razon_social:       string;
      regimen_fiscal:     string;
      rfc:                string;
      calle:              string;
      numero:             string;
      colonia:            string;
      poblacion:          string;
      estado:             string;
      codigo_postal:      string;
      telefono:           string;
      uso_cfdi:           string;
      direccion_completa: string;
    };
    bultos: {
      idbulto:           number;
      nombre_producto:   string;
      medida:            string;
      alto:              number | null;
      largo:             number | null;
      ancho:             number | null;
      peso:              number | null;
      peso_producto:     number | null;
      cantidad_unidades: number | null;
    }[];
  };
  bultosForms:     BultoFormCastores[];
  requiereFactura: "si" | "no";
  formaPago:       string;
  metodoPago:      string;
  pagado:          boolean;
  cobrarOrigen:    boolean;
  cobrarDestino:   boolean;
  observaciones:   string;
  noConvenio:      string;
}

function txt(doc: jsPDF, text: string, x: number, y: number, size: number = 7) {
  if (!text) return;
  doc.setFontSize(size);
  doc.text(text, x, y);
}

function chk(doc: jsPDF, x: number, y: number, checked: boolean) {
  if (!checked) return;
  doc.setFontSize(8);
  doc.text("X", x, y);
}

export async function generarFormatoCastores(params: FormatoCastoresParams) {
  const {
    datos, bultosForms, requiereFactura,
    formaPago, metodoPago,
    pagado, cobrarOrigen, cobrarDestino,
    observaciones, noConvenio,
  } = params;

  const { remitente: rem, destinatario: dest } = datos;

  const doc = new jsPDF({
    orientation: "portrait",
    unit:        "pt",
    format:      [622.5, 651.75],
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  // Fila 1 — FECHA
  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  txt(doc, hoy, 120, 78.8, 7);

  // Fila 2 — Nombre Remitente
  txt(doc, rem.razon_social,        140, 100.8, 7);

  // Fila 3 — Régimen Fiscal
  txt(doc, rem.regimen_fiscal,      100, 115.1, 6.5);

  // Fila 4 — RFC
  txt(doc, rem.rfc,                 55, 127.4, 7);

  // Fila 5 — Calle
  txt(doc, rem.calle,               60, 139.5, 7);
  txt(doc, rem.numero,              244, 139.5, 7);

  // Fila 6 — Colonia
  txt(doc, rem.colonia,             70, 151.8, 7);

  // Fila 7 — Ciudad/Municipio
  txt(doc, rem.poblacion,           115, 162.8, 7);
  txt(doc, rem.estado,              245, 162.8, 7);

  // Fila 8 — Teléfono remitente
  txt(doc, rem.telefono,            75, 175.4, 7);
  txt(doc, rem.codigo_postal,       235, 175.4, 7);

  // Fila 9 — Se recogerá
  txt(doc, rem.direccion_completa,  40, 199.6, 6.5);

  // Fila 10 — Nombre Destinatario
  txt(doc, dest.razon_social,       140, 225.6, 7);

  // Fila 11 — Régimen Fiscal dest
  txt(doc, dest.regimen_fiscal,     100, 239.4, 6.5);

  // Fila 12 — RFC dest
  txt(doc, dest.rfc,                55, 250.4, 7);

  // Fila 13 — Calle dest
  txt(doc, dest.calle,              60, 263.3, 7);
  txt(doc, dest.numero,             244, 263.3, 7);

  // Fila 14 — Colonia dest
  txt(doc, dest.colonia,            70, 274.8, 7);

  // Fila 15 — Ciudad/Municipio dest
  txt(doc, dest.poblacion,          115, 286.1, 7);
  txt(doc, dest.estado,             250, 286.1, 7);

  // Fila 16 — Teléfono dest + C.P.
  txt(doc, dest.telefono,           75, 301.1, 7);
  txt(doc, dest.codigo_postal,      235, 301.1, 7);

  // Fila 16 lado derecho — NÚMERO DE CONVENIO
  // En el formato físico está en la sección derecha debajo de "Requiere Factura"
  if (noConvenio) {
    txt(doc, noConvenio, 450, 301.1, 7);
  }

  // Fila 17 — Se entregará
  txt(doc, dest.direccion_completa, 40, 322.4, 6.5);

  // Requiere factura — checkboxes lado derecho
  chk(doc, 441, 274.3, requiereFactura === "si");
  chk(doc, 478, 274.3, requiereFactura === "no");

  // Fila 18 — USO CFDI / FORMA PAGO / MÉTODO PAGO / PAGADO / COBRAR ORIGEN / COBRAR DESTINO
  txt(doc, dest.uso_cfdi || "", 100, 336.9, 7);
  txt(doc, formaPago,           240, 336.9, 7);
  txt(doc, metodoPago,          357, 336.4, 7);
  chk(doc, 405, 335.4, pagado);
  chk(doc, 495, 335.4, cobrarOrigen);
  chk(doc, 590, 335.4, cobrarDestino);

  // Fila 19 — TABLA DE BULTOS
  bultosForms.forEach((bulto, idx) => {
    const y          = TABLA_Y_START + idx * ROW_H;
    const bultoDatos = datos.bultos.find(b => b.idbulto === bulto.idbulto);

    const dimensiones = bultoDatos?.alto  != null &&
                        bultoDatos?.largo != null &&
                        bultoDatos?.ancho != null
      ? `${bultoDatos.alto}x${bultoDatos.largo}x${bultoDatos.ancho}`
      : "";

    const peso    = bultoDatos?.peso != null ? String(bultoDatos.peso) : "";
    const contiene = [bulto.nombre_producto, bulto.medida].filter(Boolean).join(" ");

    txt(doc, "1",                       COL_CANTIDAD,       y, 7);
    txt(doc, bulto.empaque,             COL_EMPAQUE,        y, 7);
    txt(doc, contiene,                  COL_CONTIENE,       y, 7);
    txt(doc, bulto.clave_producto_sat,  COL_CLAVE_PRODUCTO, y, 7);
    txt(doc, bulto.clave_unidad_sat,    COL_CLAVE_UNIDAD,   y, 7);
    if (dimensiones) txt(doc, dimensiones, COL_VOLUMEN, y, 7);
    if (peso)        txt(doc, peso,        COL_PESO,    y, 7);
  });

  // Fila 20 — OBSERVACIONES
  if (observaciones) {
    txt(doc, observaciones, 120, 536, 7);
  }

  doc.save(`SolicitudCastores_${datos.no_pedido}.pdf`);
}