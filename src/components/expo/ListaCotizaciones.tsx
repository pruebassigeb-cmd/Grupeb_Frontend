import { useState, useEffect } from "react";
import { generarPdfCotizacionExpo, cotizacionBackDataAPdfParams } from "../../utils/expo/generarPdfCotizacionExpo";
import { generarPdfPedido } from "../../services/generarPdfPedido";
import { getVentaByPedido } from "../../services/ventasservice";
import type { CotizacionGuardada, ItemPedidoAprobado } from "../../types/expo/expo.types";
import { folioAPedido } from "../../types/expo/expo.types";

interface Props {
  cotizaciones: CotizacionGuardada[];
  loading: boolean;
  aprobando: boolean;
  onAprobar: (id: string, items: ItemPedidoAprobado[]) => Promise<void>;
  onEliminar: (folio: string) => Promise<void>;
  onClose: () => void;
  onRefresh: () => void;
  asesor: string;
}

const LS: React.CSSProperties = { color: "#555", fontSize: 8.5, textTransform: "uppercase", letterSpacing: .5, marginBottom: 1 };
const VAL: React.CSSProperties = { color: "#DDD", fontSize: 10.5, fontWeight: 600 };

function Dato({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <div style={LS}>{label}</div>
      <div style={VAL}>{value}</div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 7px", borderRadius: 8,
      background: color ? `${color}18` : "#C9922A18",
      border: `1px solid ${color ? `${color}44` : "#C9922A44"}`,
      color: color || "#C9922A", fontSize: 9.5, fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

interface SelectorCantidadProps {
  detalles: { idsolicitud_detalle: number; cantidad: number; precio_unitario: number | null; precio_total: number }[];
  seleccion: number | null;
  onChange: (id: number | null) => void;
  soloLectura?: boolean;
}

function SelectorCantidad({ detalles, seleccion, onChange, soloLectura }: SelectorCantidadProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${detalles.length}, 1fr)`, gap: 8 }}>
      {detalles.map((d) => {
        const activo = seleccion === d.idsolicitud_detalle;
        const precio = d.precio_unitario
          ? `$${Number(d.precio_unitario).toFixed(2)}/pz`
          : `$${(Number(d.precio_total) / Number(d.cantidad)).toFixed(2)}/pz`;
        return (
          <button key={d.idsolicitud_detalle} type="button"
            onClick={() => !soloLectura && onChange(activo ? null : d.idsolicitud_detalle)}
            disabled={soloLectura && !activo}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "8px 6px", borderRadius: 8,
              border: `1.5px solid ${activo ? "#C9922A" : "#2A2A2A"}`,
              background: activo ? "#C9922A18" : "#0D0D0D",
              cursor: soloLectura ? (activo ? "default" : "not-allowed") : "pointer",
              opacity: soloLectura && !activo ? .4 : 1,
            }}>
            <span style={{ color: activo ? "#C9922A" : "#888", fontSize: 10, fontWeight: 700 }}>
              {Number(d.cantidad).toLocaleString()} pzs
            </span>
            <span style={{ color: activo ? "#C9922A" : "#666", fontSize: 11, fontWeight: 700 }}>{precio}</span>
          </button>
        );
      })}
    </div>
  );
}

interface DetalleProductoProps {
  prod: any;
  seleccion?: number | null;
  onChange?: (id: number | null) => void;
  esPedido: boolean;
}

function DetalleProducto({ prod, seleccion, onChange, esPedido }: DetalleProductoProps) {
  const detalleAprobado = prod.detalles?.find((d: any) => d.aprobado === true);

  const acabados: { label: string; color?: string }[] = [];
  if (prod.laminado_nombre) acabados.push({ label: `Lam: ${prod.laminado_nombre}` });
  if (prod.foil_nombre) acabados.push({ label: `Foil: ${prod.foil_nombre}`, color: "#A855F7" });
  if (prod.asa_nombre) acabados.push({ label: `Asa: ${prod.asa_nombre}` });
  if (prod.suaje_tipo) {
    const asaLabel = prod.color_asa_nombre
      ? `Asa: ${prod.suaje_tipo} · ${prod.color_asa_nombre}`
      : `Asa: ${prod.suaje_tipo}`;
    acabados.push({ label: asaLabel, color: "#5C8FA0" });
  }
  if (prod.textura_nombre) acabados.push({ label: `Tex: ${prod.textura_nombre}` });
  if (prod.uv) acabados.push({ label: "UV", color: "#EAB308" });
  if (prod.alto_relieve) acabados.push({ label: "AR", color: "#3B82F6" });

  const tintasLabel = prod.tintas != null ? `${prod.tintas} tintas` : null;
  const pigmento = prod.pigmento || prod.pigmentos || null;

  return (
    <div style={{ background: "#1A1A1A", border: "1px solid #262626", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flexWrap: "wrap" }}>
          <span style={{ color: "#EEE", fontSize: 12, fontWeight: 700 }}>{prod.nombre}</span>
          <span style={{ color: "#555", fontSize: 9, textTransform: "capitalize", flexShrink: 0, background: "#2A2A2A", padding: "1px 6px", borderRadius: 4 }}>
            {prod.tipo_material === "expo" ? "Expo" : prod.tipo_material === "plastico" ? "Plástico" : prod.tipo_material === "papel" ? "Papel" : prod.tipo_material}
          </span>
          {tintasLabel && <span style={{ color: "#888", fontSize: 9, flexShrink: 0 }}>{tintasLabel}</span>}
        </div>
        {esPedido && (
          <span style={{
            fontSize: 8.5, fontWeight: 700, padding: "2px 8px", borderRadius: 8, flexShrink: 0,
            background: detalleAprobado ? "#C9922A22" : "#EF444422",
            color: detalleAprobado ? "#C9922A" : "#EF4444",
            border: `1px solid ${detalleAprobado ? "#C9922A55" : "#EF444455"}`,
          }}>
            {detalleAprobado ? `✓ ${Number(detalleAprobado.cantidad).toLocaleString()} pzs` : "✕ No incluido"}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: esPedido ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {prod.medida && <Dato label="Medida" value={prod.medida} />}
            {prod.material && <Dato label="Material" value={prod.material} />}
            {prod.grupo_descripcion && <Dato label="Material" value={prod.grupo_descripcion} />}
            {prod.calibre && <Dato label="Calibre" value={String(prod.calibre)} />}
          </div>
          {prod.descripcion && <Dato label="Descripción" value={prod.descripcion} />}
          {prod.observacion && <Dato label="Obs" value={prod.observacion} />}
          {pigmento && <Dato label="Pigmento" value={pigmento} />}
        </div>

        <div>
          {acabados.length > 0 ? (
            <>
              <div style={LS}>Acabados</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                {acabados.map(a => <Badge key={a.label} label={a.label} color={a.color} />)}
              </div>
            </>
          ) : (
            <div style={{ ...LS, color: "#333" }}>Sin acabados</div>
          )}
        </div>

        {!esPedido && prod.detalles?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {prod.detalles.map((d: any) => (
                <div key={d.idsolicitud_detalle}>
                  <div style={LS}>{Number(d.cantidad).toLocaleString()}</div>
                  <div style={{ ...VAL, color: "#C9922A", fontSize: 11 }}>
                    ${d.precio_unitario
                      ? Number(d.precio_unitario).toFixed(2)
                      : (Number(d.precio_total) / Number(d.cantidad)).toFixed(2)}/pz
                  </div>
                </div>
              ))}
            </div>
            {onChange && (
              <>
                <div style={{ ...LS, marginBottom: 2 }}>Cantidad que aprueba</div>
                <SelectorCantidad
                  detalles={prod.detalles}
                  seleccion={seleccion ?? null}
                  onChange={onChange}
                />
              </>
            )}
          </div>
        )}

        {esPedido && detalleAprobado && (
          <div>
            <div style={LS}>Aprobado</div>
            <div style={{ ...VAL, color: "#C9922A" }}>
              {Number(detalleAprobado.cantidad).toLocaleString()} pzs
            </div>
            <div style={{ color: "#C9922A", fontSize: 10 }}>
              ${detalleAprobado.precio_unitario
                ? Number(detalleAprobado.precio_unitario).toFixed(2)
                : (Number(detalleAprobado.precio_total) / Number(detalleAprobado.cantidad)).toFixed(2)}/pz
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListaCotizaciones({
  cotizaciones, loading, aprobando,
  onAprobar, onEliminar, onClose, onRefresh, asesor,
}: Props) {
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "cotizacion" | "pedido">("todas");
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [selecciones, setSelecciones] = useState<Record<string, Record<number, number | null>>>({});
  const [generandoPdf, setGenerandoPdf] = useState<string | null>(null);

  useEffect(() => { onRefresh(); }, []);

  const filtradas = cotizaciones.filter(c => filtro === "todas" || c.estado === filtro);
  const ordenadas = [...filtradas].sort((a, b) => b.id.localeCompare(a.id));
  const totalCots = cotizaciones.filter(c => c.estado === "cotizacion").length;
  const totalPeds = cotizaciones.filter(c => c.estado === "pedido").length;

  const setSeleccion = (cotId: string, prodId: number, detalleId: number | null) => {
    setSelecciones(prev => ({
      ...prev,
      [cotId]: { ...(prev[cotId] || {}), [prodId]: detalleId },
    }));
  };

  const confirmarAprobacion = async (cot: CotizacionGuardada) => {
    const backData = (cot as any)._backData;
    if (!backData) return;
    const sel = selecciones[cot.id] || {};
    const items: ItemPedidoAprobado[] = Object.entries(sel)
      .filter(([, detalleId]) => detalleId !== null)
      .map(([prodId, detalleId]) => ({
        filaUid: prodId,
        cantidadElegida: "precio1" as const,
        idsolicitud_producto: Number(prodId),
        idsolicitud_detalle: detalleId as number,
      }));
    if (items.length === 0) {
      alert("Selecciona al menos una cantidad en algún producto para aprobar el pedido.");
      return;
    }
    await onAprobar(cot.id, items);
    setExpandidoId(null);
    onRefresh();
  };

  const handleEliminar = async (cot: CotizacionGuardada) => {
    if (!cot.folio) return;
    if (!confirm(`¿Eliminar la cotización ${cot.folio}?`)) return;
    setEliminando(cot.id);
    try {
      await onEliminar(cot.folio);
      onRefresh();
    } finally {
      setEliminando(null);
    }
  };

  const handleGenerarPdf = (cot: CotizacionGuardada) => {
    const backData = (cot as any)._backData;
    if (!backData) return;
    const params = cotizacionBackDataAPdfParams(backData, cot.folio, cot.fecha, asesor);
    generarPdfCotizacionExpo(params);
  };

  const handleGenerarPdfPedido = async (cot: CotizacionGuardada) => {
    const backData = (cot as any)._backData;
    if (!backData) return;
    const folioPedido = cot.folioPedido || folioAPedido(cot.folio);
    setGenerandoPdf(cot.id);
    try {
      const venta = await getVentaByPedido(folioPedido);
      const productos = (backData.productos || []).map((p: any) => {
        const esPapel = p.tipo_material === "papel";
        const foilNombre = p.foil_nombre || null;
        const asaNombre = p.asa_nombre || null;
        if (esPapel) {
          return {
            tipo_material: "papel",
            tipoCotizacion: "papel",
            nombre: p.nombre,
            grupo_descripcion: p.grupo_descripcion ?? "",
            material: p.material || "",
            calibre: p.calibre || "",
            tintas: p.tintas ?? 0,
            tintasDentro: 0,
            caras: p.caras ?? 0,
            medidasFormateadas: p.medida || "",
            medidas: {},
            bk: null,
            foil: foilNombre ? true : null,
            foil_nombre: foilNombre,
            laminado: p.laminado_nombre ? true : null,
            laminado_nombre: p.laminado_nombre || null,
            asa_suaje: asaNombre || null,
            asa_nombre: asaNombre || null,
            uvBr: p.uv ? true : null,
            alto_relieve: p.alto_relieve === true,
            metodo_hojeado: p.metodo_hojeado ?? null,
            lleva_armado: p.lleva_armado ?? true,
            maquinaria_seleccionada: p.maquinaria_seleccionada ?? {},
            textura_nombre: p.textura_nombre || null,
            pigmentos: null,
            pantones: p.pantones || null,
            pantonesDentro: null,
            observacion: p.observacion || null,
            descripcion: p.descripcion || null,
            perforacion: false,
            por_kilo: null,
            herramental_descripcion: null,
            herramental_precio: null,
            herramental_aprobado: null,
            detalles: (p.detalles || [])
              .filter((d: any) => d.aprobado === true)
              .map((d: any) => ({
                cantidad: Number(d.cantidad),
                precio_total: Number(d.precio_total),
                kilogramos: null,
                modo_cantidad: "unidad",
              })),
          };
        }
        // plástico / expo
        return {
          nombre: p.nombre,
          material: p.material || "",
          calibre: p.calibre || "",
          tintas: p.tintas ?? 0,
          caras: p.caras ?? 0,
          medidasFormateadas: p.medida || "",
          medidas: {},
          bk: null, foil: null, laminado: null, uvBr: null,
          pigmentos: p.pigmentos || null,
          pantones: p.pantones || null,
          asa_suaje: p.suaje_tipo || null,
          observacion: p.observacion || null,
          descripcion: p.descripcion || null,
          perforacion: false,
          por_kilo: null,
          herramental_descripcion: null,
          herramental_precio: null,
          herramental_aprobado: null,
          detalles: (p.detalles || [])
            .filter((d: any) => d.aprobado === true)
            .map((d: any) => ({
              cantidad: Number(d.cantidad),
              precio_total: Number(d.precio_total),
              kilogramos: null,
              modo_cantidad: "unidad",
            })),
        };
      });

      await generarPdfPedido({
        no_pedido: folioPedido,
        no_cotizacion: cot.folio,
        fecha: cot.fecha,
        cliente: backData.cliente || "",
        empresa: backData.impresion || "",
        telefono: backData.celular || "",
        correo: backData.correo || "",
        impresion: backData.impresion ?? null,
        celular: backData.celular ?? null,
        razon_social: null,
        rfc: null,
        domicilio: null,
        numero: null,
        colonia: null,
        codigo_postal: null,
        poblacion: backData.ciudad ?? null,
        estado_cliente: backData.estado_cliente ?? null,
        cliente_id: backData.cliente_id ?? null,
        identificar: backData.identificar ?? null,
        subtotal: Number(venta.subtotal),
        iva: Number(venta.iva),
        total: Number(venta.total),
        anticipo: Number(venta.anticipo),
        saldo: Number(venta.saldo),
        productos,
      }, false);
    } catch (e) {
      console.error("❌ PDF Pedido expo:", e);
      alert("No se pudo generar el PDF del pedido.");
    } finally {
      setGenerandoPdf(null);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 14, width: "100%", maxWidth: 920, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.8)" }}>

        {/* Header */}
        <div style={{ background: "#0D0D0D", borderBottom: "2px solid #C9922A", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: "#C9922A", fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif" }}>📋</div>
            <div>
              <div style={{ color: "#FFF", fontSize: 13, fontWeight: 700, letterSpacing: .5 }}>Cotizaciones — Expo</div>
              <div style={{ color: "#555", fontSize: 9.5, marginTop: 2 }}>
                {totalCots} en cotización · {totalPeds} aprobadas como pedido
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onRefresh} title="Actualizar" disabled={loading}
              style={{ background: "transparent", border: "1px solid #333", color: loading ? "#444" : "#888", fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "⏳" : "🔄"}
            </button>
            <button onClick={onClose}
              style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{ padding: "12px 20px 0", display: "flex", gap: 8, flexShrink: 0 }}>
          {([
            ["todas", `Todas (${cotizaciones.length})`],
            ["cotizacion", `Cotización (${totalCots})`],
            ["pedido", `Pedido (${totalPeds})`],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFiltro(key)}
              style={{ background: filtro === key ? "#C9922A22" : "transparent", border: `1px solid ${filtro === key ? "#C9922A" : "#2A2A2A"}`, color: filtro === key ? "#C9922A" : "#777", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 20, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "50px 0", color: "#444" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: 13 }}>Cargando cotizaciones...</div>
            </div>
          )}

          {!loading && ordenadas.length === 0 && (
            <div style={{ textAlign: "center", padding: "50px 0", color: "#444" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🗂</div>
              <div style={{ fontSize: 13 }}>
                {filtro === "todas" ? "Aún no hay cotizaciones" : `No hay registros en "${filtro}"`}
              </div>
            </div>
          )}

          {!loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ordenadas.map(cot => {
                const abierto = expandidoId === cot.id;
                const esPedido = cot.estado === "pedido";
                const backData = (cot as any)._backData;
                const productos = backData?.productos || [];
                const selCot = selecciones[cot.id] || {};
                const haySeleccion = Object.values(selCot).some(v => v !== null && v !== undefined);

                const total = esPedido
                  ? productos.reduce((s: number, p: any) => {
                    const ap = p.detalles?.find((d: any) => d.aprobado === true);
                    return s + (ap ? Number(ap.precio_total) : 0);
                  }, 0)
                  : productos.reduce((s: number, p: any) =>
                    s + (p.detalles || []).reduce((ss: number, d: any) => ss + Number(d.precio_total), 0), 0);

                return (
                  <div key={cot.id} style={{ background: "#1A1A1A", border: `1px solid ${esPedido ? "#C9922A44" : "#222"}`, borderRadius: 10, overflow: "hidden" }}>

                    <div onClick={() => setExpandidoId(abierto ? null : cot.id)}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", cursor: "pointer" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: esPedido ? "#C9922A" : "#666", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ color: "#EEE", fontSize: 13, fontWeight: 700 }}>{cot.cliente || "Sin nombre"}</span>
                          <span style={{ color: "#555", fontSize: 10, fontFamily: "monospace" }}>
                            {esPedido ? (cot.folioPedido || folioAPedido(cot.folio)) : cot.folio}
                          </span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                            background: esPedido ? "#C9922A22" : "#C9922A11",
                            color: "#C9922A",
                            border: `1px solid ${esPedido ? "#C9922A55" : "#C9922A33"}`,
                          }}>
                            {esPedido ? "✓ Pedido" : "Cotización"}
                          </span>
                        </div>
                        <div style={{ color: "#666", fontSize: 10, marginTop: 3 }}>
                          {cot.fecha} · {productos.length} {productos.length === 1 ? "producto" : "productos"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: "#C9922A", fontSize: 13, fontWeight: 700 }}>${total.toFixed(2)}</div>
                        <div style={{ color: "#555", fontSize: 9 }}>{esPedido ? "total pedido" : "total cotizado"}</div>
                      </div>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (esPedido) handleGenerarPdfPedido(cot);
                          else handleGenerarPdf(cot);
                        }}
                        title={esPedido ? "Descargar PDF pedido" : "Descargar PDF cotización"}
                        style={{ background: "transparent", border: "1px solid #C9922A44", color: "#C9922A", fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 5, cursor: "pointer", flexShrink: 0 }}>
                        🖨 PDF
                      </button>
                      <span style={{ color: "#555", fontSize: 11, flexShrink: 0 }}>{abierto ? "▲" : "▼"}</span>
                    </div>

                    {abierto && (
                      <div style={{ borderTop: "1px solid #222", padding: "14px", background: "#141414" }}>
                        {backData && (
                          <div style={{ background: "#1A1A1A", border: "1px solid #262626", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                            <div style={{ color: "#C9922A", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>👤 Datos del cliente</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
                              <Dato label="Nombre" value={backData.cliente} />
                              <Dato label="Celular" value={backData.celular} />
                              <Dato label="Correo" value={backData.correo} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                              <Dato label="Empresa" value={backData.impresion} />
                              <Dato label="Ciudad" value={backData.ciudad} />
                              <Dato label="Estado" value={backData.estado_cliente} />
                            </div>
                            {(backData.clasificacion || backData.intereses?.length > 0) && (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 8, paddingTop: 8, borderTop: "1px solid #222" }}>
                                <Dato label="Clasificación" value={backData.clasificacion || "—"} />
                                <Dato label="Le interesa" value={backData.intereses?.join(", ") || "—"} />
                              </div>
                            )}
                            {backData.observaciones && (
                              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #222" }}>
                                <Dato label="Observaciones" value={backData.observaciones} />
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ color: "#C9922A", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                          📦 {esPedido ? "Productos del pedido" : "Productos cotizados"}
                        </div>

                        {productos.map((prod: any) => (
                          <DetalleProducto
                            key={prod.idsolicitud_producto}
                            prod={prod}
                            esPedido={esPedido}
                            seleccion={selCot[prod.idsolicitud_producto] ?? null}
                            onChange={!esPedido
                              ? (id) => setSeleccion(cot.id, prod.idsolicitud_producto, id)
                              : undefined}
                          />
                        ))}

                        {!esPedido ? (
                          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <button
                              onClick={() => handleEliminar(cot)}
                              disabled={eliminando === cot.id}
                              style={{ flex: "0 0 auto", border: "1px solid #EF444433", background: "transparent", borderRadius: 8, padding: "10px 16px", fontSize: 12, fontWeight: 600, color: "#EF4444", cursor: eliminando === cot.id ? "not-allowed" : "pointer", opacity: eliminando === cot.id ? .5 : 1 }}>
                              {eliminando === cot.id ? "Eliminando..." : "🗑 Eliminar"}
                            </button>
                            <button
                              onClick={() => confirmarAprobacion(cot)}
                              disabled={!haySeleccion || aprobando}
                              style={{
                                flex: 1, border: "none", borderRadius: 8, padding: "10px",
                                fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                background: haySeleccion && !aprobando ? "#C9922A" : "#C9922A33",
                                color: haySeleccion && !aprobando ? "#0D0D0D" : "#0D0D0D88",
                                cursor: haySeleccion && !aprobando ? "pointer" : "not-allowed",
                              }}>
                              {aprobando ? "Aprobando..." : "✓ Aprobar y convertir en pedido"}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                            <div style={{ flex: 1, background: "#C9922A15", border: "1px solid #C9922A44", borderRadius: 8, padding: "10px", color: "#C9922A", fontSize: 11.5, fontWeight: 600, textAlign: "center" }}>
                              ✓ Pedido aprobado — folio {cot.folioPedido || folioAPedido(cot.folio)}
                            </div>
                            <button
                              onClick={() => handleGenerarPdfPedido(cot)}
                              disabled={generandoPdf === cot.id}
                              style={{
                                background: generandoPdf === cot.id ? "#C9922A55" : "#C9922A",
                                border: "none", borderRadius: 8, padding: "10px 16px",
                                fontSize: 12, fontWeight: 700, color: "#1A1A1A",
                                cursor: generandoPdf === cot.id ? "not-allowed" : "pointer",
                                flexShrink: 0,
                              }}>
                              {generandoPdf === cot.id ? "⏳" : "🖨 PDF Pedido"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}