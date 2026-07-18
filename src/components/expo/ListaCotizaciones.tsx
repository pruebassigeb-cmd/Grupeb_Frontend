import { useState, useEffect } from "react";
import { generarPdfCotizacionExpo, cotizacionBackDataAPdfParams } from "../../utils/expo/generarPdfCotizacionExpo";
import { generarPdfPedido } from "../../services/generarPdfPedido";
import { generarPdfCotizacion } from "../../services/generarPdfCotizacion";
import { getVentaByPedido } from "../../services/ventasservice";
import { getCotizacionesExpo } from "../../services/expo/expoService";
import { enviarCorreoDocumento } from "../../services/correoService";
import type { CotizacionGuardada, ItemPedidoAprobado } from "../../types/expo/expo.types";
import { folioAPedido } from "../../types/expo/expo.types";
import BotonAccionesPdf from "../BotonAccionesPdf";
import ModalConfirmarCorreo from "../ModalConfirmarCorreo";
import { useEnvioDocumentoPdf } from "../../hooks/useEnvioDocumentoPdf";

import FormularioCliente from "../FormularioCliente";
import { getClienteById, updateCliente } from "../../services/clientesService";
import type { Cliente, UpdateClienteRequest } from "../../types/clientes.types";

interface Props {
  cotizaciones: CotizacionGuardada[];
  loading: boolean;
  aprobando: boolean;
  onAprobar: (id: string, items: ItemPedidoAprobado[]) => Promise<string | null>;
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

  const tieneTintasFrente =
    prod.tintas !== null &&
    prod.tintas !== undefined;

  const tieneTintasDentro =
    prod.tintas_dentro !== null &&
    prod.tintas_dentro !== undefined &&
    Number(prod.tintas_dentro) > 0;

  const tintasValor = tieneTintasFrente
    ? tieneTintasDentro
      ? `${prod.tintas}x${prod.tintas_dentro}`
      : String(prod.tintas)
    : null;

  const tintasLabel = tintasValor
    ? `${tintasValor} tintas`
    : null;
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
            {prod.tipo_producto && <Dato label="Tipo" value={prod.tipo_producto} />}
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

function ModalCompletarCliente({
  cliente, cargando, guardando, onGuardar, onCancelar,
}: {
  cliente: Cliente | null;
  cargando: boolean;
  guardando: boolean;
  onGuardar: (datos: UpdateClienteRequest) => void;
  onCancelar: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 500,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={guardando ? undefined : onCancelar}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 920, maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,.7)", overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Header estilo Expo */}
        <div style={{
          background: "#0D0D0D", borderBottom: "2px solid #C9922A",
          padding: "16px 22px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: "#C9922A18",
              border: "1px solid #C9922A44", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 17, flexShrink: 0,
            }}>
              👤
            </div>
            <div>
              <div style={{ color: "#FFF", fontSize: 14, fontWeight: 700 }}>
                Completar datos antes de convertir a pedido
              </div>
              <div style={{ color: "#666", fontSize: 10.5, marginTop: 2, maxWidth: 560 }}>
                El registro rápido de Expo solo capturó lo básico — completa RFC, domicilio y
                facturación que falten. Puedes dejar en blanco lo que no aplique.
              </div>
            </div>
          </div>
          <button
            onClick={onCancelar}
            disabled={guardando}
            style={{
              background: "transparent", border: "1px solid #333", color: "#888",
              width: 30, height: 30, borderRadius: 8, cursor: guardando ? "not-allowed" : "pointer",
              fontSize: 15, flexShrink: 0, opacity: guardando ? .5 : 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo — el formulario conserva su tema claro internamente (se reutiliza
            también en Clientes.tsx en modo claro), pero ahora vive dentro de un
            marco oscuro consistente con el resto de Expo, en vez de flotar suelto. */}
        <div style={{ flex: 1, overflowY: "auto", background: "#1A1A1A", padding: "20px 22px" }}>
          <div style={{
            background: "#FFF", borderRadius: 14, padding: "28px 32px",
            boxShadow: "0 8px 24px rgba(0,0,0,.35)",
          }}>
            {cargando || !cliente ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
                Cargando datos del cliente...
              </div>
            ) : (
              <FormularioCliente
                clienteEditar={cliente}
                onSubmit={(datos) => onGuardar(datos as UpdateClienteRequest)}
                onCancel={onCancelar}
              />
            )}
          </div>
        </div>

        {/* Overlay de "guardando" */}
        {guardando && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(0,0,0,.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 16,
          }}>
            <div style={{
              background: "#0D0D0D", border: "1px solid #C9922A66", color: "#C9922A",
              padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 14, height: 14, borderRadius: "50%",
                border: "2px solid #C9922A55", borderTopColor: "#C9922A",
                animation: "spin-cliente .7s linear infinite",
              }} />
              Guardando datos del cliente...
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin-cliente { to { transform: rotate(360deg); } }
      `}</style>
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

  // ── Paso 1 del flujo de aprobación: completar datos del cliente ─────────
  const [cotEnProceso,      setCotEnProceso]      = useState<CotizacionGuardada | null>(null);
  const [clienteIdPendiente, setClienteIdPendiente] = useState<number | null>(null);
  const [clienteParaEditar,  setClienteParaEditar]  = useState<Cliente | null>(null);
  const [cargandoCliente,    setCargandoCliente]    = useState(false);
  const [guardandoCliente,   setGuardandoCliente]   = useState(false);

  // ── Paso 2 del flujo de aprobación: confirmar correo ANTES de aprobar ────
  // Nada se compromete (no se llama a onAprobar) hasta que el usuario
  // confirma el correo aquí — si cancela, es como si nada hubiera pasado.
  const [modalCorreoAprobarAbierto, setModalCorreoAprobarAbierto] = useState(false);
  const [correoAprobarDefault, setCorreoAprobarDefault] = useState("");
  const [enviandoAprobacion, setEnviandoAprobacion] = useState(false);

  // ── Hook compartido para los botones sueltos de "PDF Pedido"/"PDF cotización"
  // (esos SÍ ejecutan primero y confirman correo después, porque ahí el
  // documento ya existe de antemano — no hay nada que "revertir").
  const {
    ejecutar: ejecutarEnvio,
    modalCorreoAbierto,
    enviandoCorreo,
    correoDefault,
    nombreDocumentoModal,
    confirmarEnvioCorreo,
    cancelarEnvioCorreo,
  } = useEnvioDocumentoPdf();

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

  // ── Arma los productos y datos del PEDIDO para generarPdfPedido (el bueno) ──
  const construirPayloadPdfPedidoDesdeBackData = async (
    backData: any,
    folioCotizacion: string,
    fechaCotizacion: string
  ) => {
    const folioPedido = backData.no_pedido || folioAPedido(folioCotizacion);

    const [venta, clienteCompleto] = await Promise.all([
      getVentaByPedido(folioPedido),
      backData.cliente_id ? getClienteById(backData.cliente_id).catch(() => null) : Promise.resolve(null),
    ]);

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
          tintasDentro: p.tintas_dentro ?? 0,
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

    return {
      no_pedido: folioPedido,
      no_cotizacion: folioCotizacion,
      fecha: fechaCotizacion,
      cliente: backData.cliente || "",
      empresa: backData.impresion || "",
      telefono: backData.celular || "",
      correo: backData.correo || "",
      impresion: backData.impresion ?? null,
      celular: backData.celular ?? null,
      razon_social: clienteCompleto?.razon_social ?? null,
      rfc: clienteCompleto?.rfc ?? null,
      domicilio: clienteCompleto?.domicilio ?? null,
      numero: clienteCompleto?.numero ?? null,
      colonia: clienteCompleto?.colonia ?? null,
      codigo_postal: clienteCompleto?.codigo_postal ?? null,
      poblacion: clienteCompleto?.poblacion ?? backData.ciudad ?? null,
      estado_cliente: clienteCompleto?.estado ?? backData.estado_cliente ?? null,
      cliente_id: backData.cliente_id ?? null,
      identificar: backData.identificar ?? null,
      subtotal: Number(venta.subtotal),
      iva: Number(venta.iva),
      total: Number(venta.total),
      anticipo: Number(venta.anticipo),
      saldo: Number(venta.saldo),
      productos,
      _correoCliente: clienteCompleto?.correo || backData.correo || "",
    };
  };

  // ── Arma los productos y datos de la COTIZACIÓN (aún sin aprobar) para
  // generarPdfCotizacion (el bueno) — usado solo para el correo.
  const construirPayloadPdfCotizacion = async (cot: CotizacionGuardada) => {
    const backData = (cot as any)._backData;

    const clienteCompleto = backData.cliente_id
      ? await getClienteById(backData.cliente_id).catch(() => null)
      : null;

    const productos = (backData.productos || []).map((p: any) => {
      const esPapel = p.tipo_material === "papel";
      const foilNombre = p.foil_nombre || null;
      const asaPapel = p.asa_nombre || null;
      const tipoAsaPlastico = p.suaje_tipo || null;
      const colorAsaPlastico = p.color_asa_nombre || null;
      const asaPlastico = [tipoAsaPlastico, colorAsaPlastico]
        .map((valor) => String(valor || "").trim())
        .filter(Boolean)
        .filter((valor, indice, arreglo) => arreglo.indexOf(valor) === indice)
        .join(" · ") || null;

      const base = esPapel
        ? {
            tipo_material: "papel",
            tipoCotizacion: "papel",
            nombre: p.nombre,
            grupo_descripcion: p.grupo_descripcion ?? "",
            material: p.material || "",
            calibre: p.calibre || "",
            tintas: p.tintas ?? 0,
            tintasDentro: p.tintas_dentro ?? 0,
            caras: p.caras ?? 0,
            medidasFormateadas: p.medida || "",
            medidas: {},
            bk: null,
            foil: foilNombre ? true : null,
            foil_nombre: foilNombre,
            laminado: p.laminado_nombre ? true : null,
            laminado_nombre: p.laminado_nombre || null,
            asa_suaje: asaPapel,
            asa_nombre: asaPapel,
            uvBr: p.uv ? true : null,
            alto_relieve: p.alto_relieve === true,
            metodo_hojeado: p.metodo_hojeado ?? null,
            lleva_armado: p.lleva_armado ?? true,
            maquinaria_seleccionada: p.maquinaria_seleccionada ?? {},
            textura_nombre: p.textura_nombre || null,
            pigmentos: null,
            pantones: p.pantones || null,
            pantonesDentro: p.pantones_dentro || null,
            observacion: p.observacion || null,
            descripcion: p.descripcion || null,
            perforacion: false,
            por_kilo: null,
            herramental_descripcion: null,
            herramental_precio: null,
            herramental_aprobado: null,
          }
        : {
            tipo_material: "plastico",
            tipoCotizacion: "plastico",
            nombre: p.nombre,
            tipo_producto: p.tipo_producto || p.expo_tipo_producto || null,
            material: p.material || "",
            calibre: p.calibre || "",
            tintas: p.tintas ?? 0,
            tintasDentro: 0,
            caras: p.caras ?? 0,
            medidasFormateadas: p.medida || "",
            medidas: {},
            bk: null,
            pigmentos: p.pigmentos || p.pigmento || null,
            pantones: p.pantones || null,
            asa_suaje: tipoAsaPlastico,
            asa_nombre: asaPlastico,
            color_asa_nombre: colorAsaPlastico,
            observacion: p.observacion || null,
            descripcion: p.descripcion || null,
            perforacion: false,
            por_kilo: null,
            herramental_descripcion: null,
            herramental_precio: null,
            herramental_aprobado: null,
          };

      return {
        ...base,
        detalles: (p.detalles || []).map((d: any) => ({
          cantidad: Number(d.cantidad),
          precio_unitario:
            d.precio_unitario !== null && d.precio_unitario !== undefined
              ? Number(d.precio_unitario)
              : null,
          precio_total: Number(d.precio_total),
          kilogramos: null,
          modo_cantidad: "unidad",
        })),
      };
    });

    const total = productos.reduce(
      (sum: number, p: any) => sum + p.detalles.reduce((s: number, d: any) => s + d.precio_total, 0),
      0
    );

    return {
      no_cotizacion: cot.folio,
      fecha: cot.fecha,
      cliente: backData.cliente || "",
      empresa: backData.impresion || "",
      telefono: backData.celular || "",
      correo: clienteCompleto?.correo || backData.correo || "",
      estado: "Pendiente",
      impresion: backData.impresion ?? null,
      celular: backData.celular ?? null,
      razon_social: clienteCompleto?.razon_social ?? null,
      rfc: clienteCompleto?.rfc ?? null,
      domicilio: clienteCompleto?.domicilio ?? null,
      numero: clienteCompleto?.numero ?? null,
      colonia: clienteCompleto?.colonia ?? null,
      codigo_postal: clienteCompleto?.codigo_postal ?? null,
      poblacion: clienteCompleto?.poblacion ?? backData.ciudad ?? null,
      estado_cliente: clienteCompleto?.estado ?? backData.estado_cliente ?? null,
      cliente_id: backData.cliente_id ?? null,
      identificar: backData.identificar ?? null,
      total,
      productos,
      _correoCliente: clienteCompleto?.correo || backData.correo || "",
    };
  };

  // ── Paso 1: usuario da clic en "Aprobar" → validar selección → abrir
  // el formulario de cliente. Nada se compromete aún.
  const iniciarFlujoAprobar = async (cot: CotizacionGuardada) => {
    const sel = selecciones[cot.id] || {};
    const haySel = Object.values(sel).some(v => v !== null && v !== undefined);
    if (!haySel) {
      alert("Selecciona al menos una cantidad en algún producto para aprobar el pedido.");
      return;
    }
    const backData = (cot as any)._backData;
    const clienteId = backData?.cliente_id;
    if (!clienteId) {
      alert("No se encontró el cliente asociado a esta cotización.");
      return;
    }
    setCotEnProceso(cot);
    setClienteIdPendiente(clienteId);
    setCargandoCliente(true);
    try {
      const cliente = await getClienteById(clienteId);
      setClienteParaEditar(cliente);
    } catch (e) {
      console.error("No se pudo cargar el cliente:", e);
      alert("No se pudieron cargar los datos del cliente.");
      cancelarTodoElFlujo();
    } finally {
      setCargandoCliente(false);
    }
  };

  // Cancela en cualquier punto del flujo — nada se ha comprometido todavía
  // (no se llamó a onAprobar), así que es un "rollback" real: no queda
  // ningún rastro de la operación.
  const cancelarTodoElFlujo = () => {
    setCotEnProceso(null);
    setClienteIdPendiente(null);
    setClienteParaEditar(null);
    setCargandoCliente(false);
    setModalCorreoAprobarAbierto(false);
    setCorreoAprobarDefault("");
  };

  // ── Paso 2: se guardaron los datos del cliente → AHORA se pide confirmar
  // el correo, ANTES de aprobar nada.
  const handleGuardarClienteYContinuar = async (datos: UpdateClienteRequest) => {
    if (!clienteIdPendiente || !cotEnProceso) return;
    setGuardandoCliente(true);
    try {
      await updateCliente(clienteIdPendiente, datos);
      // El correo recién guardado (o el que ya tenía el cliente) es el que
      // se propone por defecto en el modal de confirmación.
      setCorreoAprobarDefault((datos as any).correo || clienteParaEditar?.correo || "");
      setModalCorreoAprobarAbierto(true);
    } catch (e: any) {
      console.error("No se pudo guardar el cliente:", e);
      alert(e?.response?.data?.error || "No se pudieron guardar los datos del cliente.");
    } finally {
      setGuardandoCliente(false);
    }
  };

  // ── Paso 3: el usuario confirmó el correo → AHORA sí se aprueba, se
  // refresca, se genera el PDF y se envía el correo — todo como un solo
  // paso final. Si algo de esto falla, ya se aprobó (eso no se puede
  // revertir desde el front), pero el usuario ya dio su visto bueno a todo
  // de antemano, así que no hay sorpresas a mitad del camino.
  const confirmarCorreoYAprobar = async (correoConfirmado: string) => {
    if (!cotEnProceso) return;
    const cot = cotEnProceso;

    setEnviandoAprobacion(true);
    try {
      const sel = selecciones[cot.id] || {};
      const items: ItemPedidoAprobado[] = Object.entries(sel)
        .filter(([, detalleId]) => detalleId !== null)
        .map(([prodId, detalleId]) => ({
          filaUid: prodId,
          cantidadElegida: "precio1" as const,
          idsolicitud_producto: Number(prodId),
          idsolicitud_detalle: detalleId as number,
        }));

      const noPedido = await onAprobar(cot.id, items);
      onRefresh();
      setExpandidoId(null);

      if (!noPedido) {
        alert("No se pudo aprobar el pedido.");
        return;
      }

      // Refrescar datos frescos (con los detalles ya marcados aprobado=true)
      const data = await getCotizacionesExpo();
      const backDataFresco = data.find(c => c.no_cotizacion === cot.folio);
      if (!backDataFresco) {
        alert("El pedido se aprobó, pero no se pudo recuperar para enviar el correo. Puedes enviarlo manualmente desde la fila del pedido.");
        return;
      }

      const payload = await construirPayloadPdfPedidoDesdeBackData(backDataFresco, cot.folio, cot.fecha);
      const blob = await generarPdfPedido(payload as any, false, false);

      await enviarCorreoDocumento({
        tipo: "pedido",
        folio: payload.no_pedido,
        cliente: payload.cliente,
        empresa: payload.empresa,
        destinatario: correoConfirmado,
        pdfBlob: blob,
        nombreArchivo: `Pedido_${payload.no_pedido}.pdf`,
      });

      cancelarTodoElFlujo();
    } catch (e: any) {
      console.error("❌ Error en aprobación/envío:", e);
      alert(e?.response?.data?.error || "Ocurrió un error al aprobar o enviar el correo.");
    } finally {
      setEnviandoAprobacion(false);
    }
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

  // ── PDF/correo de COTIZACIÓN (aún no pedido) — botón suelto en la fila ──
  const handleAccionesPdfCotizacion = async (cot: CotizacionGuardada, opciones: { imprimir: boolean; correo: boolean }) => {
    const backData = (cot as any)._backData;
    if (!backData) return;
    setGenerandoPdf(cot.id);
    try {
      await ejecutarEnvio(
        {
          paraImprimir: () => {
            const params = cotizacionBackDataAPdfParams(backData, cot.folio, cot.fecha, asesor);
            generarPdfCotizacionExpo(params);
          },
          paraCorreo: async () => {
            const payload = await construirPayloadPdfCotizacion(cot);
            return await generarPdfCotizacion(payload as any, false, false);
          },
        },
        {
          tipo: "cotizacion",
          folio: cot.folio,
          cliente: backData.cliente || "",
          empresa: backData.impresion,
          correoDefault: backData.correo || "",
        },
        opciones
      );
    } catch (e) {
      console.error("❌ PDF cotización expo:", e);
      alert("No se pudo generar/enviar el PDF de la cotización.");
    } finally {
      setGenerandoPdf(null);
    }
  };

  // ── PDF/correo de PEDIDO ya existente — botón suelto en la fila ─────────
  const handleAccionesPdfPedido = async (cot: CotizacionGuardada, opciones: { imprimir: boolean; correo: boolean }) => {
    const backData = (cot as any)._backData;
    if (!backData) return;
    setGenerandoPdf(cot.id);
    try {
      const payload = await construirPayloadPdfPedidoDesdeBackData(backData, cot.folio, cot.fecha);

      await ejecutarEnvio(
        {
          paraImprimir: async () => { await generarPdfPedido(payload as any, false, true); },
          paraCorreo: async () => { return await generarPdfPedido(payload as any, false, false); },
        },
        {
          tipo: "pedido",
          folio: payload.no_pedido,
          cliente: payload.cliente,
          empresa: payload.empresa,
          correoDefault: payload._correoCliente,
        },
        opciones
      );
    } catch (e) {
      console.error("❌ PDF Pedido expo:", e);
      alert("No se pudo generar el PDF del pedido.");
    } finally {
      setGenerandoPdf(null);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 14, width: "90vw", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.8)" }}>

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
                const enEsteFlujoAprobacion = cotEnProceso?.id === cot.id;
                const procesandoEstePdf = generandoPdf === cot.id;

                const total = esPedido
                  ? productos.reduce((s: number, p: any) => {
                    const ap = p.detalles?.find((d: any) => d.aprobado === true);
                    return s + (ap ? Number(ap.precio_total) : 0);
                  }, 0)
                  : productos.reduce((s: number, p: any) =>
                    s + (p.detalles || []).reduce((ss: number, d: any) => ss + Number(d.precio_total), 0), 0);

                return (
                  <div key={cot.id} style={{ background: "#1A1A1A", border: `1px solid ${esPedido ? "#C9922A44" : "#222"}`, borderRadius: 10 }}>

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

                      <div onClick={e => e.stopPropagation()}>
                        <BotonAccionesPdf
                          procesando={procesandoEstePdf}
                          onEjecutar={(opciones) =>
                            esPedido
                              ? handleAccionesPdfPedido(cot, opciones)
                              : handleAccionesPdfCotizacion(cot, opciones)
                          }
                          label={esPedido ? "PDF Pedido" : "PDF"}
                        />
                      </div>
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
                              onClick={() => iniciarFlujoAprobar(cot)}
                              disabled={!haySeleccion || (enEsteFlujoAprobacion && (cargandoCliente || guardandoCliente || enviandoAprobacion))}
                              style={{
                                flex: 1, border: "none", borderRadius: 8, padding: "10px",
                                fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                background: haySeleccion ? "#C9922A" : "#C9922A33",
                                color: haySeleccion ? "#0D0D0D" : "#0D0D0D88",
                                cursor: haySeleccion ? "pointer" : "not-allowed",
                              }}>
                              {enEsteFlujoAprobacion && cargandoCliente ? "Cargando cliente..."
                                : enEsteFlujoAprobacion && enviandoAprobacion ? "Aprobando y enviando..."
                                : "✓ Aprobar y convertir en pedido"}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                            <div style={{ flex: 1, background: "#C9922A15", border: "1px solid #C9922A44", borderRadius: 8, padding: "10px", color: "#C9922A", fontSize: 11.5, fontWeight: 600, textAlign: "center" }}>
                              ✓ Pedido aprobado — folio {cot.folioPedido || folioAPedido(cot.folio)}
                            </div>
                            <BotonAccionesPdf
                              procesando={procesandoEstePdf}
                              onEjecutar={(opciones) => handleAccionesPdfPedido(cot, opciones)}
                              label="PDF Pedido"
                            />
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

      {/* Paso 1: completar datos del cliente */}
      {cotEnProceso && !modalCorreoAprobarAbierto && (
        <ModalCompletarCliente
          cliente={clienteParaEditar}
          cargando={cargandoCliente}
          guardando={guardandoCliente}
          onGuardar={handleGuardarClienteYContinuar}
          onCancelar={cancelarTodoElFlujo}
        />
      )}

      {/* Paso 2: confirmar correo — SOLO tras confirmar aquí se aprueba de verdad */}
      {modalCorreoAprobarAbierto && (
        <ModalConfirmarCorreo
          correoInicial={correoAprobarDefault}
          nombreDocumento={cotEnProceso ? folioAPedido(cotEnProceso.folio) : ""}
          enviando={enviandoAprobacion}
          onConfirmar={confirmarCorreoYAprobar}
          onCancelar={cancelarTodoElFlujo}
        />
      )}

      {/* Modal de correo para los botones sueltos de "PDF Pedido"/"PDF" (flujo normal: acción primero, confirmar después) */}
      {modalCorreoAbierto && (
        <ModalConfirmarCorreo
          correoInicial={correoDefault}
          nombreDocumento={nombreDocumentoModal}
          enviando={enviandoCorreo}
          onConfirmar={confirmarEnvioCorreo}
          onCancelar={cancelarEnvioCorreo}
        />
      )}
    </div>
  );
}