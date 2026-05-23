// src/pages/EditarPedido.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Dashboard from "../layouts/Sidebar";
import { getPedidos, actualizarPedido } from "../services/pedidosService";
import type { Pedido } from "../types/cotizaciones.types";
import { usePreciosBatch } from "../hooks/usePrecioCalculado";
import api from "../services/api";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface DetalleEdit {
  iddetalle:       number | null;
  cantidad:        string;   // en modo kilo: muestra kg; en modo unidad: muestra bolsas
  precio_total:    string;
  precio_unitario: string;   // precio por bolsa — siempre en bolsas, independiente del modo
  kilogramos:      string;
  modo_cantidad:   "unidad" | "kilo";
}

interface ProductoEdit {
  idsolicitud_producto:    number;
  nombre:                  string;
  material:                string;
  calibre:                 string;
  medidasFormateadas:      string;
  tintas:                  number;
  tintasId:                number;
  caras:                   number;
  por_kilo:                string;
  pantones:                string;
  pigmentos:               string;
  observacion:             string;
  descripcion:             string;
  perforacion:             boolean;
  herramental_descripcion: string;
  herramental_precio:      string;
  herramental_aprobado:    boolean | null;
  detalles:                DetalleEdit[];
  _eliminado:              boolean;
  idsuaje:                 number | null;
  suaje_tipo:              string | null;
  id_color:                number | null;
  color_asa_nombre:        string | null;
  id_medidatro:            number | null;
  medida_troquel:          string | null;
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const esDecimal = (v: string) => /^\d*\.?\d{0,6}$/.test(v);
const esEntero  = (v: string) => /^\d*$/.test(v);
const fmt       = (n: number, d = 2) =>
  n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const parseSafe = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// ─── Helpers de tipo de producto ─────────────────────────────────────────────
const esBopp = (material: string, nombre: string = "") => {
  const m = material.toUpperCase();
  const n = nombre.toUpperCase();
  return (
    m.includes("BOPP") || m.includes("CELOFAN") || m.includes("CELOFÁN") ||
    n.includes("CELOFAN") || n.includes("CELOFÁN") || n.includes("BOPP")
  );
};

// Solo bolsa plana, bolsa de envío y bolsa celofán pueden tener perforación.
const permitePerforacion = (nombre: string) => {
  const n = nombre.toLowerCase();
  return (
    n.includes("bolsa plana") ||
    n.includes("bolsa envio") ||
    n.includes("bolsa envío") ||
    n.includes("celofan") ||
    n.includes("celofán")
  );
};

// ─── Subcomponente por producto ───────────────────────────────────────────────
function ProductoEditable({
  prod, pi, setProductoField, setDetalleField,
  agregarDetalle, eliminarDetalle,
  suajes, coloresAsa, medidasTroquel, catalogoTintas,
}: {
  prod: ProductoEdit;
  pi: number;
  setProductoField: <K extends keyof ProductoEdit>(pi: number, k: K, v: ProductoEdit[K]) => void;
  setDetalleField: (pi: number, di: number, k: keyof DetalleEdit, v: string) => void;
  agregarDetalle: (pi: number) => void;
  eliminarDetalle: (pi: number, di: number) => void;
  suajes: any[];
  coloresAsa: any[];
  medidasTroquel: any[];
  catalogoTintas: any[];
}) {
  const esAsaFlexible   = prod.nombre.toLowerCase().includes("asa flexible");
  const esTroquel       = prod.nombre.toLowerCase().includes("troquelada");
  const esBoppProd      = esBopp(prod.material, prod.nombre);
  const puedePerforar   = permitePerforacion(prod.nombre);

  // Find tintasId by matching cantidad. Falls back to stored tintasId.
  const tintasIdResuelto = catalogoTintas.length > 0
    ? (catalogoTintas.find((t: any) => t.cantidad === prod.tintas)?.id ?? prod.tintasId)
    : prod.tintasId;

  // ── Precios editados manualmente en esta sesión ───────────────────────────
  const [preciosEditadosManual, setPreciosEditadosManual] = useState<boolean[]>(
    prod.detalles.map(() => false)
  );
  const [preciosTexto, setPreciosTexto] = useState<string[]>(
    prod.detalles.map(d => d.precio_total)
  );
  const [preciosUnitTexto, setPreciosUnitTexto] = useState<string[]>(
    prod.detalles.map(d => {
      const puBolsa = parseSafe(d.precio_unitario);
      if (puBolsa <= 0) return "";
      const pk2 = parseSafe(prod.por_kilo);
      if (d.modo_cantidad === "kilo" && pk2 > 0) return (puBolsa * pk2).toFixed(4);
      return puBolsa.toFixed(4);
    })
  );

  // ── Cuáles detalles pueden recibir precio automático ─────────────────────
  // Un detalle con iddetalle = viene de DB → protegido salvo que el usuario
  // cambie tintas. tintasCambiadas se persiste en ref para no causar re-renders.
  const tintasCambiadasRef = useRef(false);
  const [tintasCambiadasState, setTintasCambiadasState] = useState(false);

  // Todos los índices con cantidad > 0 se envían al hook; el efecto de resultados
  // decide si aplicar el precio basado en si el detalle está "libre".
  const cantidadesEnBolsas = useMemo(
    () => prod.detalles.map(d => {
      const c = parseSafe(d.cantidad);
      if (d.modo_cantidad === "kilo" && parseSafe(prod.por_kilo) > 0) {
        return Math.round(c * parseSafe(prod.por_kilo));
      }
      return c;
    }),
    // recalculate when any quantity or mode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prod.detalles.map(d => `${d.cantidad}|${d.modo_cantidad}`).join(","), prod.por_kilo]
  );

  // Hook activo cuando hay cantidades y porKilo.
  // tintasCambiadasState se incluye para forzar re-render cuando cambian tintas.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tintasRender = tintasCambiadasState;
  const hookEnabled = cantidadesEnBolsas.some(v => v > 0) && !!prod.por_kilo && !!tintasIdResuelto;

  const { resultados, loading: calculando } = usePreciosBatch({
    cantidades: cantidadesEnBolsas,
    porKilo:    prod.por_kilo,
    tintasId:   tintasIdResuelto,
    enabled:    hookEnabled,
  });

  // Detectar cambio de tintas (saltar primer render)
  const primeraVezTintas = useRef(true);
  useEffect(() => {
    if (primeraVezTintas.current) { primeraVezTintas.current = false; return; }
    // Usuario cambió tintas → liberar todos los detalles para recálculo
    tintasCambiadasRef.current = true;
    setTintasCambiadasState(true);
    setPreciosEditadosManual(prod.detalles.map(() => false));
    setPreciosTexto(prod.detalles.map(() => ""));
    setPreciosUnitTexto(prod.detalles.map(() => ""));
  }, [prod.tintasId]);

  // indicesLibres: detalles nuevos (null iddetalle) ó tintas cambiadas
  const indicesLibres = prod.detalles
    .map((d, i) => {
      const esNuevo = d.iddetalle === null || d.iddetalle === undefined;
      return esNuevo || tintasCambiadasRef.current ? i : -1;
    })
    .filter(i => i !== -1);

  // Aplicar resultados automáticos a los índices que lo necesitan
  useEffect(() => {
    if (!resultados.length) return;
    resultados.forEach((r, di) => {
      if (!r) return;
      // Detalle de DB sin tintas cambiadas y sin edición manual → no tocar
      const det = prod.detalles[di];
      if (!det) return;
      const esNuevo  = det.iddetalle === null || det.iddetalle === undefined;
      const esLibre  = esNuevo || tintasCambiadasRef.current;
      if (!esLibre) return;
      if (preciosEditadosManual[di]) return;

      const pk = parseSafe(prod.por_kilo);
      const pu = r.precio_unitario; // siempre precio/bolsa

      let precioTotal = 0;
      if (det.modo_cantidad === "kilo") {
        const kgs = parseSafe(det.kilogramos || det.cantidad);
        precioTotal = Math.round(pu * pk * kgs * 100) / 100;
      } else {
        precioTotal = Math.round(pu * parseSafe(det.cantidad) * 100) / 100;
      }

      if (precioTotal > 0) {
        setDetalleField(pi, di, "precio_total",    precioTotal.toFixed(2));
        setDetalleField(pi, di, "precio_unitario", pu.toFixed(6));
        setPreciosTexto(prev => { const n = [...prev]; n[di] = precioTotal.toFixed(2); return n; });
        // precio unitario mostrado: /kg en modo kilo, /bolsa en modo unidad
        const puMostrado = det.modo_cantidad === "kilo" && pk > 0 ? (pu * pk).toFixed(4) : pu.toFixed(4);
        setPreciosUnitTexto(prev => { const n = [...prev]; n[di] = puMostrado; return n; });
      }
    });
  }, [resultados]);

  const subtotal = prod.detalles.reduce((s, d) => s + parseSafe(d.precio_total), 0)
    + parseSafe(prod.herramental_precio);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-blue-50/40 border-b border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {pi + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{prod.nombre}</p>
              <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-gray-400">
                {prod.material           && <span>{prod.material}</span>}
                {prod.calibre            && <span>Cal. {prod.calibre}</span>}
                {prod.medidasFormateadas && <span>{prod.medidasFormateadas}</span>}
                {prod.por_kilo           && <span>{prod.por_kilo} pz/kg</span>}
                {esBoppProd              && <span className="text-amber-500 font-medium">BOPP/Celofán</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm font-bold text-gray-700">${fmt(subtotal)}</span>
            <button onClick={() => setProductoField(pi, "_eliminado", true)} title="Marcar para eliminar"
              className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Tintas / Caras ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tintas</label>
            <select value={prod.tintas}
              onChange={e => {
                const n = Number(e.target.value);
                // e.target.value = cantidad; find the matching id from catalog
                const tintaEncontrada = catalogoTintas.find((t: any) => t.cantidad === n);
                const nuevoId = tintaEncontrada?.id ?? prod.tintasId;
                setProductoField(pi, "tintas",   n);
                setProductoField(pi, "tintasId", nuevoId);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
              {(catalogoTintas.length > 0 ? catalogoTintas : [1,2,3,4,5,6].map(n => ({ id: n, cantidad: n }))).map((t: any) => (
                <option key={t.id} value={t.cantidad}>{t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Caras</label>
            <select value={prod.caras}
              onChange={e => setProductoField(pi, "caras", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
              {[1, 2].map(n => (
                <option key={n} value={n}>{n} cara{n > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Pantones ── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pantones <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-2">
              {Array(prod.tintas).fill("").map((_, ti) => {
                const pantoneArr = prod.pantones
                  ? prod.pantones.split(",").map((s: string) => s.trim())
                  : [];
                return (
                  <div key={ti} className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">
                      {ti + 1}
                    </span>
                    <input type="text" value={pantoneArr[ti] || ""}
                      onChange={e => {
                        const arr = prod.pantones
                          ? prod.pantones.split(",").map((s: string) => s.trim())
                          : [];
                        arr[ti] = e.target.value;
                        setProductoField(pi, "pantones", arr.filter(Boolean).join(", "));
                      }}
                      placeholder={`Tinta ${ti + 1}`}
                      className="flex-1 px-3 py-1.5 border border-purple-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-400" />
                  </div>
                );
              })}
            </div>
            {prod.pantones && (
              <p className="mt-2 text-xs text-purple-500">Guardado: <span className="font-medium">{prod.pantones}</span></p>
            )}
          </div>
        </div>

        {/* ── Pigmentos — deshabilitado para BOPP/Celofán ── */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wide mb-1 ${esBoppProd ? "text-gray-300" : "text-gray-500"}`}>
            Pigmentos <span className="font-normal text-gray-300">(opcional)</span>
            {esBoppProd && <span className="ml-2 font-normal text-amber-400 normal-case">No aplica en BOPP/Celofán</span>}
          </label>
          <input type="text" value={prod.pigmentos} disabled={esBoppProd}
            onChange={e => setProductoField(pi, "pigmentos", e.target.value)}
            placeholder={esBoppProd ? "No aplica" : "Rojo intenso, Azul marino..."}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 ${
              esBoppProd
                ? "border-gray-200 text-gray-300 cursor-not-allowed"
                : "border-gray-200 text-gray-900 focus:ring-orange-400 focus:border-orange-400"
            }`} />
        </div>

        {/* ── Suaje / Asa — solo asa flexible ── */}
        {esAsaFlexible && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Suaje / Asa <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <select value={prod.idsuaje ?? ""}
              onChange={e => {
                const id   = e.target.value ? Number(e.target.value) : null;
                const tipo = suajes.find((s: any) => s.idsuaje === id)?.tipo ?? null;
                setProductoField(pi, "idsuaje",    id);
                setProductoField(pi, "suaje_tipo", tipo);
                if (!id) {
                  setProductoField(pi, "id_color",        null);
                  setProductoField(pi, "color_asa_nombre", null);
                }
              }}
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500">
              <option value="">Sin suaje</option>
              {suajes.map((s: any) => (
                <option key={s.idsuaje} value={s.idsuaje}>{s.tipo}</option>
              ))}
            </select>
            {prod.idsuaje && prod.suaje_tipo && (
              <p className="mt-1 text-xs text-blue-600 font-medium">✓ {prod.suaje_tipo}</p>
            )}
          </div>
        )}

        {/* ── Color del Asa ── */}
        {esAsaFlexible && prod.idsuaje && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Color del Asa <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <select value={prod.id_color ?? ""}
              onChange={e => {
                const id    = e.target.value ? Number(e.target.value) : null;
                const color = coloresAsa.find((c: any) => c.id_color === id)?.color ?? null;
                setProductoField(pi, "id_color",         id);
                setProductoField(pi, "color_asa_nombre", color);
              }}
              className="w-full px-3 py-2 border border-teal-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 capitalize">
              <option value="">Sin color</option>
              {coloresAsa.map((c: any) => (
                <option key={c.id_color} value={c.id_color} className="capitalize">{c.color}</option>
              ))}
            </select>
            {prod.id_color && prod.color_asa_nombre && (
              <p className="mt-1 text-xs text-teal-600 font-medium capitalize">✓ {prod.color_asa_nombre}</p>
            )}
          </div>
        )}

        {/* ── Medida del Troquel ── */}
        {esTroquel && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Medida del Troquel <span className="font-normal text-gray-300">(opcional)</span>
            </label>
            <select value={prod.id_medidatro ?? ""}
              onChange={e => {
                const id     = e.target.value ? Number(e.target.value) : null;
                const medida = medidasTroquel.find((m: any) => m.id_medidatro === id)?.medida ?? null;
                setProductoField(pi, "id_medidatro",  id);
                setProductoField(pi, "medida_troquel", medida);
              }}
              className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-violet-500">
              <option value="">Sin medida</option>
              {medidasTroquel.map((m: any) => (
                <option key={m.id_medidatro} value={m.id_medidatro}>{m.medida}</option>
              ))}
            </select>
            {prod.id_medidatro && prod.medida_troquel && (
              <p className="mt-1 text-xs text-violet-600 font-medium">✓ {prod.medida_troquel}</p>
            )}
          </div>
        )}

        {/* ── Perforación — solo bolsa plana / bolsa envío / celofán ── */}
        {puedePerforar && (
          <div className={`flex items-center gap-3 py-3 px-4 rounded-lg border ${prod.perforacion ? "bg-sky-50 border-sky-300" : "bg-gray-50 border-gray-200"}`}>
            <input type="checkbox" id={`perf-${pi}`} checked={prod.perforacion}
              onChange={e => setProductoField(pi, "perforacion", e.target.checked)}
              className="w-5 h-5 rounded border-sky-400 text-sky-600 focus:ring-sky-400 cursor-pointer" />
            <label htmlFor={`perf-${pi}`} className="flex items-center gap-2 cursor-pointer select-none">
              <span className={`font-semibold text-sm ${prod.perforacion ? "text-sky-700" : "text-gray-600"}`}>Perforación</span>
              <span className="text-xs text-gray-400">(bolsa con perforación)</span>
            </label>
            {prod.perforacion && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-200 text-sky-800">✓ Con perforación</span>
            )}
          </div>
        )}

        {/* ── Descripción ── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Descripción <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <input type="text" value={prod.descripcion}
            onChange={e => setProductoField(pi, "descripcion", e.target.value)}
            placeholder="Ej: 1er Grado, Talla M, Color Rojo..."
            maxLength={150}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-400" />
          {prod.descripcion && (
            <p className="mt-1 text-xs text-purple-600 font-medium">✓ {prod.descripcion}</p>
          )}
        </div>

        {/* ── Observaciones ── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Observaciones <span className="font-normal text-gray-300">(opcional)</span>
          </label>
          <textarea value={prod.observacion} rows={2}
            onChange={e => setProductoField(pi, "observacion", e.target.value)}
            placeholder="Ej: Impresión a 2 colores, acabado mate..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* ── Herramental ── */}
        <div className="border border-orange-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50">
            <span>🔧</span>
            <span className="text-xs font-semibold text-orange-700">Herramental</span>
            <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            {parseSafe(prod.herramental_precio) > 0 && (
              <span className="ml-auto text-xs font-bold text-orange-700">
                +${fmt(parseSafe(prod.herramental_precio))}
              </span>
            )}
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción</label>
              <input type="text" value={prod.herramental_descripcion}
                onChange={e => setProductoField(pi, "herramental_descripcion", e.target.value)}
                placeholder="Suaje nuevo..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="text" inputMode="decimal" value={prod.herramental_precio}
                  onChange={e => { if (esDecimal(e.target.value)) setProductoField(pi, "herramental_precio", e.target.value); }}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Cantidades y precios ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
              Cantidades y precios
              {calculando && (
                <span className="flex items-center gap-1 text-blue-500 font-normal normal-case animate-pulse">
                  <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                  Calculando...
                </span>
              )}
            </label>
            {prod.detalles.length < 3 && (
              <button onClick={() => agregarDetalle(pi)}
                className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium">
                + Agregar cantidad
              </button>
            )}
          </div>

          <div className="space-y-3">
            {prod.detalles.map((det, di) => {
              const r            = resultados[di];
              const pk           = parseSafe(prod.por_kilo);
              const esLibre      = indicesLibres.includes(di);
              const esModoKilo   = det.modo_cantidad === "kilo";

              // precio_unitario en DB siempre está en bolsas.
              // Para mostrar: si el modo es kilo → convertir a kg (* pk).
              const puBolsaGuardado = parseSafe(det.precio_unitario);
              const puBolsaHook     = r?.precio_unitario ?? 0;
              // puBolsa = precio/bolsa que usamos internamente
              const puBolsa         = esLibre && !preciosEditadosManual[di] && puBolsaHook > 0
                                        ? puBolsaHook
                                        : puBolsaGuardado;
              // puMostrar = lo que el usuario ve en el input
              const puMostrar       = esModoKilo && pk > 0 ? puBolsa * pk : puBolsa;
              const labelUnidad     = esModoKilo ? "/kg" : "/bolsa";

              return (
                <div key={di} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                  <div className="flex items-end gap-2">

                    {/* Cantidad */}
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">
                        {det.modo_cantidad === "kilo" ? "Cantidad (kg)" : "Cantidad (pzas)"}
                      </label>
                      <input type="text" inputMode="numeric" value={det.cantidad}
                        onChange={e => { if (esEntero(e.target.value)) setDetalleField(pi, di, "cantidad", e.target.value); }}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-400" />
                    </div>

                    {/* Precio total — solo lectura, se calcula desde precio unitario × cantidad */}
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Precio total</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input type="text" readOnly
                          value={preciosTexto[di] !== "" ? preciosTexto[di] : (parseSafe(det.precio_total) > 0 ? parseSafe(det.precio_total).toFixed(2) : "")}
                          placeholder="—"
                          className="w-full pl-6 py-2 border border-gray-100 rounded-lg text-sm text-gray-600 bg-gray-50 cursor-not-allowed" />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400">Calculado automáticamente</p>
                    </div>

                    {/* Precio unitario (por bolsa) — editable */}
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">
                        {esModoKilo && pk > 0 ? "Precio/kg" : "Precio/bolsa"}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                        <input type="text" inputMode="decimal"
                          // El input muestra precio/kg en modo kilo, precio/bolsa en modo unidad.
                          // preciosUnitTexto almacena el valor tal como lo ve el usuario.
                          value={
                            preciosUnitTexto[di] !== ""
                              ? preciosUnitTexto[di]
                              : puMostrar > 0 ? puMostrar.toFixed(4) : ""
                          }
                          onChange={e => {
                            if (!esDecimal(e.target.value)) return;
                            const nuevos = [...preciosUnitTexto];
                            nuevos[di] = e.target.value;
                            setPreciosUnitTexto(nuevos);

                            const valorIngresado = parseSafe(e.target.value);
                            // Convertir a precio/bolsa para guardar en DB
                            const puBolsaNuevo = esModoKilo && pk > 0
                              ? valorIngresado / pk
                              : valorIngresado;

                            setDetalleField(pi, di, "precio_unitario", puBolsaNuevo.toFixed(6));

                            // Recalcular precio total
                            const kgs  = parseSafe(det.kilogramos || det.cantidad);
                            const cant = parseSafe(det.cantidad);
                            let newTotal = 0;
                            if (esModoKilo) {
                              // precio total = kg × precio/kg
                              newTotal = Math.round(valorIngresado * kgs * 100) / 100;
                            } else {
                              newTotal = Math.round(puBolsaNuevo * cant * 100) / 100;
                            }
                            if (newTotal > 0) {
                              const nuevosTextos = [...preciosTexto];
                              nuevosTextos[di] = newTotal.toFixed(2);
                              setPreciosTexto(nuevosTextos);
                              setDetalleField(pi, di, "precio_total", newTotal.toFixed(2));
                            }
                            const nuevosEditados = [...preciosEditadosManual];
                            nuevosEditados[di] = true;
                            setPreciosEditadosManual(nuevosEditados);
                          }}
                          onBlur={() => {
                            const val = parseFloat(preciosUnitTexto[di]);
                            if (!isNaN(val) && val > 0) {
                              const nuevos = [...preciosUnitTexto];
                              nuevos[di] = val.toFixed(4);
                              setPreciosUnitTexto(nuevos);
                            }
                          }}
                          placeholder={esModoKilo && pk > 0 ? "0.0000" : "0.0000"}
                          className="w-full pl-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-300" />
                      </div>
                      {esModoKilo && pk > 0 && puBolsa > 0 && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          ≈ ${puBolsa.toFixed(6)}/bolsa
                        </p>
                      )}
                      {!esModoKilo && pk > 0 && puBolsa > 0 && (
                        <p className="mt-0.5 text-xs text-emerald-600">
                          ≈ ${(puBolsa * pk).toFixed(4)}/kg
                        </p>
                      )}
                    </div>

                    {/* Modo */}
                    <div className="flex-shrink-0">
                      <label className="block text-xs text-gray-400 mb-1">Modo</label>
                      <select value={det.modo_cantidad}
                        onChange={e => setDetalleField(pi, di, "modo_cantidad", e.target.value)}
                        className="px-2 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white focus:ring-2 focus:ring-blue-400">
                        <option value="unidad">pz</option>
                        <option value="kilo">kg</option>
                      </select>
                    </div>

                    {/* Borrar fila */}
                    {prod.detalles.length > 1 && (
                      <button onClick={() => eliminarDetalle(pi, di)}
                        className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Info precio unitario calculado */}
                  {esLibre && puBolsa > 0 && (
                    <div className="flex gap-4 text-xs text-gray-400 pl-1">
                      <span>≈ ${puBolsa.toFixed(6)}/bolsa</span>
                      {pk > 0 && <span>≈ ${(puBolsa * pk).toFixed(4)}/kg</span>}
                      {calculando && <span className="text-blue-400 animate-pulse">Recalculando...</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mini resumen */}
          <div className="mt-2 flex items-center justify-between px-3 py-2 bg-blue-50/60 rounded-lg">
            <span className="text-xs text-gray-500">
              {prod.detalles.length} detalle{prod.detalles.length !== 1 ? "s" : ""}
              {parseSafe(prod.herramental_precio) > 0 && (
                <span className="ml-1 text-orange-500">+ herramental</span>
              )}
            </span>
            <span className="text-sm font-bold text-blue-700">${fmt(subtotal)}</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EditarPedido() {
  const { noPedido } = useParams<{ noPedido: string }>();
  const navigate     = useNavigate();

  const [cargando,     setCargando]     = useState(true);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [exito,        setExito]        = useState(false);
  const [pedidoOrig,   setPedidoOrig]   = useState<Pedido | null>(null);
  const [productos,    setProductos]    = useState<ProductoEdit[]>([]);

  const [suajes,         setSuajes]         = useState<any[]>([]);
  const [coloresAsa,     setColoresAsa]     = useState<any[]>([]);
  const [medidasTroquel, setMedidasTroquel] = useState<any[]>([]);
  const [catalogoTintas, setCatalogoTintas] = useState<any[]>([]);

  useEffect(() => {
    if (!noPedido) return;
    (async () => {
      try {
        const [suajesRes, coloresRes, troquelRes, catalogosRes] = await Promise.all([
          api.get("/suajes"),
          api.get("/cotizaciones/colores-asa"),
          api.get("/cotizaciones/medidas-troquel"),
          api.get("/catalogos-produccion"),
        ]);
        setSuajes(suajesRes.data);
        setColoresAsa(coloresRes.data);
        setMedidasTroquel(troquelRes.data);
        setCatalogoTintas(catalogosRes.data.tintas || []);

        const todos = await getPedidos() as Pedido[];
        const ped   = todos.find(p => p.no_pedido === noPedido);
        if (!ped) { setError("Pedido no encontrado"); return; }

        setPedidoOrig(ped);
        setProductos((ped.productos as any[]).map(p => ({
          idsolicitud_producto:    p.idsolicitud_producto ?? p.idcotizacion_producto,
          nombre:                  p.nombre              || "",
          material:                p.material            || "",
          calibre:                 p.calibre             || "",
          medidasFormateadas:      p.medidasFormateadas  || "",
          tintas:                  p.tintas              ?? 1,
          tintasId:                p.tintas_idtintas     ?? 1,
          caras:                   p.caras               ?? 1,
          por_kilo:                p.por_kilo            || "",
          pantones:  Array.isArray(p.pantones) ? p.pantones.join(", ") : (p.pantones || ""),
          pigmentos:               esBopp(p.material || "", p.nombre || "") ? "" : (p.pigmentos || ""),
          observacion:             p.observacion         || "",
          descripcion:             p.descripcion         || "",
          perforacion:             p.perforacion         ?? false,
          herramental_descripcion: p.herramental_descripcion || "",
          herramental_precio:      p.herramental_precio != null ? String(p.herramental_precio) : "",
          herramental_aprobado:    p.herramental_aprobado ?? null,
          _eliminado:              false,
          idsuaje:          p.idsuaje          ?? null,
          suaje_tipo:       p.asa_suaje        ?? null,
          id_color:         p.id_color         ?? null,
          color_asa_nombre: p.color_asa_nombre ?? null,
          id_medidatro:     p.id_medidatro     ?? null,
          medida_troquel:   p.medida_troquel   ?? null,
          detalles: (p.detalles || []).map((d: any) => ({
            iddetalle:       d.iddetalle    ?? null,
            // En modo kilo mostramos kg; en unidad mostramos bolsas
            cantidad:        d.modo_cantidad === "kilo" && d.kilogramos != null
                               ? String(d.kilogramos)
                               : String(d.cantidad ?? ""),
            precio_total:    String(d.precio_total   ?? ""),
            precio_unitario: d.precio_unitario != null
                               ? String(d.precio_unitario)
                               : d.cantidad > 0
                                 ? String(Math.round((d.precio_total / d.cantidad) * 1000000) / 1000000)
                                 : "",
            kilogramos:      d.kilogramos != null ? String(d.kilogramos) : "",
            modo_cantidad:   d.modo_cantidad || "unidad",
          })),
        })));
      } catch (e: any) {
        setError(e.message || "Error al cargar pedido");
      } finally {
        setCargando(false);
      }
    })();
  }, [noPedido]);

  // ── Helpers de estado ──────────────────────────────────────────────────────
  const setProductoField = <K extends keyof ProductoEdit>(pi: number, k: K, v: ProductoEdit[K]) =>
    setProductos(prev => prev.map((p, i) => i === pi ? { ...p, [k]: v } : p));

  const setDetalleField = (pi: number, di: number, k: keyof DetalleEdit, v: string) =>
    setProductos(prev => prev.map((p, i) => {
      if (i !== pi) return p;
      return { ...p, detalles: p.detalles.map((d, j) => j === di ? { ...d, [k]: v } : d) };
    }));

  const agregarDetalle = (pi: number) =>
    setProductos(prev => prev.map((p, i) => i !== pi ? p : {
      ...p,
      detalles: [
        ...p.detalles,
        { iddetalle: null, cantidad: "", precio_total: "", precio_unitario: "", kilogramos: "", modo_cantidad: "unidad" as const },
      ],
    }));

  const eliminarDetalle = (pi: number, di: number) =>
    setProductos(prev => prev.map((p, i) => i !== pi ? p : {
      ...p, detalles: p.detalles.filter((_, j) => j !== di),
    }));

  const calcularTotalProducto = (p: ProductoEdit) =>
    p.detalles.reduce((s, d) => s + parseSafe(d.precio_total), 0) + parseSafe(p.herramental_precio);

  const calcularTotal = () =>
    productos.filter(p => !p._eliminado).reduce((s, p) => s + calcularTotalProducto(p), 0);

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!pedidoOrig) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      await actualizarPedido(pedidoOrig.no_pedido, {
        productos: productos.map(p => ({
          idsolicitud_producto:    p.idsolicitud_producto,
          eliminado:               p._eliminado,
          tintas:                  p.tintas,
          caras:                   p.caras,
          pantones:                p.pantones    || null,
          pigmentos:               esBopp(p.material, p.nombre) ? null : (p.pigmentos || null),
          observacion:             p.observacion || null,
          descripcion:             p.descripcion || null,
          perforacion:             permitePerforacion(p.nombre) ? p.perforacion : false,
          herramental_descripcion: p.herramental_descripcion || null,
          herramental_precio:      p.herramental_precio !== "" ? parseSafe(p.herramental_precio) : null,
          herramental_aprobado:    p.herramental_aprobado ?? null,
          idsuaje:                 p.idsuaje      ?? null,
          id_color:                p.id_color     ?? null,
          id_medidatro:            p.id_medidatro ?? null,
          detalles: p.detalles.map(d => {
            // En modo kilo d.cantidad tiene kg → recalcular bolsas para el backend
            const kgs = d.kilogramos !== "" ? parseSafe(d.kilogramos) : parseSafe(d.cantidad);
            const pk  = parseSafe(p.por_kilo);
            const cantidadParaBackend =
              d.modo_cantidad === "kilo" && pk > 0
                ? Math.round(kgs * pk)
                : parseSafe(d.cantidad);
            return {
              iddetalle:       d.iddetalle,
              cantidad:        cantidadParaBackend,
              precio_total:    parseSafe(d.precio_total),
              precio_unitario: d.precio_unitario !== "" ? parseSafe(d.precio_unitario) : null,
              kilogramos:      d.modo_cantidad === "kilo" ? kgs : null,
              modo_cantidad:   d.modo_cantidad,
            };
          }),
        })),
      });
      setExito(true);
      setTimeout(() => navigate("/pedido"), 1500);
    } catch (e: any) {
      setErrorGuardar(e.response?.data?.error || e.message || "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  // ── Estados especiales ─────────────────────────────────────────────────────
  if (cargando) return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Cargando pedido...</p>
      </div>
    </Dashboard>
  );

  if (error) return (
    <Dashboard>
      <div className="max-w-md mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <p className="text-red-700 font-semibold mb-4">{error}</p>
        <button onClick={() => navigate("/pedido")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          ← Volver a Pedidos
        </button>
      </div>
    </Dashboard>
  );

  if (exito) return (
    <Dashboard>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-green-700 font-semibold text-lg">Pedido actualizado correctamente</p>
        <p className="text-gray-400 text-sm">Redirigiendo...</p>
      </div>
    </Dashboard>
  );

  const productosActivos = productos.filter(p => !p._eliminado);
  const totalGeneral     = calcularTotal();

  return (
    <Dashboard>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/pedido")}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Pedido</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              <span className="font-semibold text-blue-600">{noPedido}</span>
              {pedidoOrig?.no_cotizacion && (
                <span className="ml-2 text-purple-500">• De {pedidoOrig.no_cotizacion}</span>
              )}
              {pedidoOrig && (
                <span className="ml-2 text-gray-400">
                  — {(pedidoOrig as any).impresion || pedidoOrig.cliente || pedidoOrig.empresa || ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-xs text-blue-500 font-medium">Total estimado</span>
          <span className="text-lg font-bold text-blue-700">${fmt(totalGeneral)}</span>
        </div>
      </div>

      {/* Error guardar */}
      {errorGuardar && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-red-700 text-sm">{errorGuardar}</p>
        </div>
      )}

      <div className="space-y-5">

        {productos.map((prod, pi) => {
          if (prod._eliminado) return (
            <div key={prod.idsolicitud_producto}
              className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl opacity-70">
              <div>
                <p className="text-sm font-semibold text-red-700 line-through">{prod.nombre}</p>
                <p className="text-xs text-red-400 mt-0.5">Marcado para eliminar al guardar</p>
              </div>
              <button onClick={() => setProductoField(pi, "_eliminado", false)}
                className="text-xs px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition">
                Restaurar
              </button>
            </div>
          );

          return (
            <ProductoEditable
              key={prod.idsolicitud_producto}
              prod={prod} pi={pi}
              setProductoField={setProductoField}
              setDetalleField={setDetalleField}
              agregarDetalle={agregarDetalle}
              eliminarDetalle={eliminarDetalle}
              suajes={suajes}
              coloresAsa={coloresAsa}
              medidasTroquel={medidasTroquel}
              catalogoTintas={catalogoTintas}
            />
          );
        })}

        {productos.some(p => p._eliminado) && (
          <p className="text-xs text-center text-gray-400 py-1">
            {productos.filter(p => p._eliminado).length} producto(s) marcado(s) para eliminar — se procesarán al guardar
          </p>
        )}

        {/* Resumen */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Resumen</h3>
            <span className="text-xs text-gray-400">{productosActivos.length} producto(s) activo(s)</span>
          </div>
          <div className="space-y-1.5 mb-4">
            {productosActivos.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-500 truncate flex-1 mr-2">
                  <span className="text-gray-300 mr-1">{i + 1}.</span>{p.nombre}
                </span>
                <span className="font-medium text-gray-800 flex-shrink-0">${fmt(calcularTotalProducto(p))}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">Total sin IVA</p>
            <p className="text-2xl font-bold text-gray-900">${fmt(totalGeneral)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              + IVA 16%: ${fmt(totalGeneral * 0.16)} →{" "}
              <span className="font-semibold text-gray-600">${fmt(totalGeneral * 1.16)}</span>
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <button onClick={() => navigate("/pedido")}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleGuardar}
            disabled={guardando || productosActivos.length === 0}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-semibold text-sm transition
              ${guardando || productosActivos.length === 0
                ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"}`}>
            {guardando
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar cambios
                </>
            }
          </button>
        </div>

      </div>
    </Dashboard>
  );
}