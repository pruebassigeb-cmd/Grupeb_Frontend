// src/components/papel/ModalCostosLaminado.tsx
//
// Versión "para todos" del costo de laminado: en vez de abrir un modal por
// producto, uno solo con una tabla de todos los productos, cada fila con
// sus propios campos (rollo, desarrollo, piezas de suaje) y su costo
// calculado en vivo. Cada fila guarda sola al perder el foco, igual que el
// modo "Editar costos base" de la tabla principal — aquí va en un modal
// aparte porque son 3 campos por producto en vez de uno solo.
import { useState, useEffect, useMemo, useRef } from "react";
import type { CatKey } from "../../types/papel/papel.types";
import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import { getCostoMetroLaminado } from "../../services/papel/preciosAcabadosPapel.service";
import { calcularCostoLaminado, formatearCostoLaminado } from "../../utils/papel/costoLaminado.utils";

export interface ProductoParaLaminado {
  idproducto_papel: number;
  tipo_producto: string;
  medida?: string | null;
  tamano_prod_nombre?: string | null;
  idrollo_lam?: number | null;
  rollo_lam_nombre?: string | null;
  rollo_lam_medida_ancho?: number | string | null;
  desarrollo_laminado?: number | string | null;
  piezas_suaje?: number | string | null;
}

interface Props {
  productos: ProductoParaLaminado[];
  onClose: () => void;
  onGuardado: (idProducto: number, nuevoCosto: number | null) => void;
}

async function guardarCostoLaminado(
  idProducto: number,
  payload: { idrollo_lam: number | null; desarrollo_laminado: number | null; piezas_suaje: string | null; costo_laminado: number | null }
): Promise<boolean> {
  try {
    const BASE = (import.meta as any).env.VITE_API_URL;
    const res = await fetch(`${BASE}/productos-papel/${idProducto}/costo-laminado`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA — un producto, editable de forma independiente
// ═══════════════════════════════════════════════════════════════════════════
function FilaCostoLaminado({
  producto,
  costoMetro,
  rolloOptions,
  onGuardado,
}: {
  producto: ProductoParaLaminado;
  costoMetro: number | null;
  rolloOptions: { id: number; nombre: string; medida_ancho?: number | string }[];
  onGuardado: (idProducto: number, nuevoCosto: number | null) => void;
}) {
  const [idRollo, setIdRollo] = useState<number | null>(producto.idrollo_lam ?? null);
  const [desarrollo, setDesarrollo] = useState(
    producto.desarrollo_laminado != null ? String(producto.desarrollo_laminado) : ""
  );
  const [piezas, setPiezas] = useState(
    producto.piezas_suaje != null ? String(producto.piezas_suaje) : ""
  );
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<"idle" | "ok" | "error">("idle");

  const snapshotRef = useRef({ idRollo, desarrollo, piezas });

  const rolloSeleccionado = rolloOptions.find((r) => r.id === idRollo);
  const anchoRolloCm = useMemo(() => {
    const medida = Number(rolloSeleccionado?.medida_ancho);
    return Number.isFinite(medida) && medida > 0 ? medida : null;
  }, [rolloSeleccionado?.medida_ancho]);

  const costoCalculado = useMemo(
    () => calcularCostoLaminado({
      rolloCentimetros: anchoRolloCm,
      desarrolloCentimetros: desarrollo,
      costoMetro,
      tamanoProducto: producto.tamano_prod_nombre ?? "",
      piezasSuaje: piezas,
    }),
    [anchoRolloCm, desarrollo, costoMetro, producto.tamano_prod_nombre, piezas]
  );

  const desarrolloNumero = Number(desarrollo.replace(",", "."));
  const tieneDatos = anchoRolloCm !== null && Number.isFinite(desarrolloNumero) && desarrolloNumero > 0;
  const costoMostrado = tieneDatos ? costoCalculado : null;

  const limpiarNumero = (v: string) => {
    let limpio = v.replace(/[^0-9.]/g, "");
    const partes = limpio.split(".");
    if (partes.length > 2) limpio = `${partes[0]}.${partes.slice(1).join("")}`;
    return limpio;
  };

  const guardar = async () => {
    const snap = snapshotRef.current;
    if (snap.idRollo === idRollo && snap.desarrollo === desarrollo && snap.piezas === piezas) return;

    setGuardando(true);
    const ok = await guardarCostoLaminado(producto.idproducto_papel, {
      idrollo_lam: idRollo,
      desarrollo_laminado: desarrollo.trim() === "" ? null : Number(desarrollo),
      piezas_suaje: piezas.trim() === "" ? null : piezas,
      costo_laminado: costoMostrado,
    });
    setGuardando(false);

    if (ok) {
      snapshotRef.current = { idRollo, desarrollo, piezas };
      setEstado("ok");
      onGuardado(producto.idproducto_papel, costoMostrado);
      setTimeout(() => setEstado("idle"), 1200);
    } else {
      setEstado("error");
    }
  };

  const bordeInput = (activo: boolean) =>
    `1px solid ${estado === "error" ? "#FCA5A5" : estado === "ok" && activo ? "#86EFAC" : "#D1D5DB"}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 1.3fr 0.85fr 0.75fr 1fr", gap: 8, alignItems: "center", padding: "7px 10px", borderBottom: "1px solid #F3F4F6" }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={producto.tipo_producto}>
          {producto.tipo_producto}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: "#9CA3AF" }}>{producto.medida || "—"}</p>
      </div>

      <span style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}>{producto.tamano_prod_nombre || "—"}</span>

      <select
        value={idRollo ?? ""}
        onChange={(e) => setIdRollo(e.target.value === "" ? null : Number(e.target.value))}
        onBlur={guardar}
        disabled={guardando}
        style={{ width: "100%", height: 30, border: bordeInput(false), borderRadius: 5, fontSize: 12, color: "#111827", background: "#fff", outline: "none", boxSizing: "border-box" }}
      >
        <option value="">— sin rollo —</option>
        {rolloOptions.map((r) => (
          <option key={r.id} value={r.id}>{r.nombre}</option>
        ))}
      </select>

      <input
        type="text"
        inputMode="decimal"
        value={desarrollo}
        placeholder="cm"
        onChange={(e) => { setDesarrollo(limpiarNumero(e.target.value)); setEstado("idle"); }}
        onBlur={guardar}
        disabled={guardando}
        style={{ width: "100%", height: 30, padding: "0 6px", border: bordeInput(false), borderRadius: 5, fontSize: 12, color: "#111827", outline: "none", boxSizing: "border-box", textAlign: "right" }}
      />

      <input
        type="text"
        inputMode="decimal"
        value={piezas}
        placeholder="pzs"
        onChange={(e) => { setPiezas(limpiarNumero(e.target.value)); setEstado("idle"); }}
        onBlur={guardar}
        disabled={guardando}
        style={{ width: "100%", height: 30, padding: "0 6px", border: bordeInput(false), borderRadius: 5, fontSize: 12, color: "#111827", outline: "none", boxSizing: "border-box", textAlign: "right" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1E3A8A", whiteSpace: "nowrap" }}>
          {costoMostrado !== null ? formatearCostoLaminado(costoMostrado) : "—"}
        </span>
        {guardando && <span style={{ fontSize: 9, color: "#9CA3AF" }}>...</span>}
        {estado === "ok" && !guardando && <span style={{ fontSize: 9, color: "#16A34A", fontWeight: 600 }}>Guardado</span>}
        {estado === "error" && !guardando && <span style={{ fontSize: 9, color: "#DC2626", fontWeight: 600 }}>Error</span>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL — lista de todos los productos
// ═══════════════════════════════════════════════════════════════════════════
export default function ModalCostosLaminado({ productos, onClose, onGuardado }: Props) {
  const { catalogs } = useCatalogosPapel();
  const [search, setSearch] = useState("");
  const [costoMetro, setCostoMetro] = useState<number | null>(null);
  const [cargandoCostoMetro, setCargandoCostoMetro] = useState(true);
  const [errorCostoMetro, setErrorCostoMetro] = useState("");

  useEffect(() => {
    let cancelado = false;
    getCostoMetroLaminado()
      .then((data: any) => {
        if (cancelado) return;
        const costo = Number(data.costo);
        if (!Number.isFinite(costo) || costo < 0) throw new Error("El costo del laminado no es válido");
        setCostoMetro(costo);
        setErrorCostoMetro("");
      })
      .catch((e: any) => {
        if (cancelado) return;
        setCostoMetro(null);
        setErrorCostoMetro(e?.response?.data?.error || e?.message || "No se pudo cargar el costo del laminado");
      })
      .finally(() => { if (!cancelado) setCargandoCostoMetro(false); });
    return () => { cancelado = true; };
  }, []);

  const rolloOptions = (((catalogs as any)?.["rollo_lam" as CatKey]) ?? []) as {
    id: number; nombre: string; medida_ancho?: number;
  }[];

  const filtrados = productos.filter((p) =>
    p.tipo_producto.toLowerCase().includes(search.toLowerCase()) ||
    (p.medida ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.tamano_prod_nombre ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{
        background: "#fff", borderRadius: 12, width: "100%", maxWidth: 920, maxHeight: "85vh",
        display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      }}>
        <div style={{ padding: "18px 22px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF", margin: "0 0 2px", fontWeight: 700 }}>
            Editar costos de laminado
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>
              {filtrados.length} de {productos.length} producto{productos.length !== 1 ? "s" : ""}
            </p>
            <button onClick={onClose} style={{ height: 32, padding: "0 14px", border: "1px solid #E5E7EB", borderRadius: 6, background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>
              Cerrar
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tipo de producto, medida o tamaño..."
            style={{ width: "100%", height: 34, padding: "0 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 12, color: "#111827", outline: "none", boxSizing: "border-box", marginBottom: 8 }}
          />

          {errorCostoMetro && (
            <p style={{ fontSize: 11, color: "#B91C1C", margin: 0 }}>
              No se pudo cargar el costo por m² vigente ({errorCostoMetro}); los cálculos de esta pantalla no van a ser correctos hasta que se resuelva.
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.7fr 1.3fr 0.85fr 0.75fr 1fr", gap: 8, padding: "6px 10px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
          {["Producto", "Tamaño", "Rollo de laminado", "Desarrollo", "Piezas suaje", "Costo"].map((h, i) => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B7280", textAlign: i >= 1 && i !== 2 ? (i === 5 ? "right" : "center") : "left" }}>
              {h}
            </span>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {cargandoCostoMetro ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Cargando costo por m²...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Sin resultados.</div>
          ) : (
            filtrados.map((p) => (
              <FilaCostoLaminado
                key={p.idproducto_papel}
                producto={p}
                costoMetro={costoMetro}
                rolloOptions={rolloOptions}
                onGuardado={onGuardado}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}