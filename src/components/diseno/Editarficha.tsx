import { useState, useEffect, useRef } from "react";
import {
  guardarFicha,
  publicarFicha,
  getZonas,
  agregarZona,
  getCatalogoAcabados,
  agregarOpcionCatalogo,
  type FichaDiseno,
  type DetalleFicha,
  type PantoneFicha,
  type ZonaProducto,
  type OpcionCatalogo,
  type TipoElemento,
} from "../../services/diseno/fichaService";
import { showAlert } from "../CustomAlert";
import { leerBorrador, useAutoguardarBorrador, limpiarBorrador } from "../../hooks/useBorradorFormulario";

interface Props {
  ficha: FichaDiseno;
  onGuardado: (ficha: FichaDiseno) => void;
  onCancel: () => void;
}

/** Una fila del editor: un detalle con una sola ubicación visible. */
interface Fila {
  tipo_elemento: TipoElemento;
  nombre: string;
  detalle: string;
  url: string;
  zona: string;
  descripcion_libre: string;
  imagen_id: number | null;
  pin_x: number | null;
  pin_y: number | null;
}

const REDES = ["Instagram", "Facebook", "WhatsApp", "TikTok", "Sitio web", "Otra"];
const MAX_PANTONES: Record<string, number> = { papel: 8, plastico: 4 };

const COLOR_PIN: Record<TipoElemento, string> = {
  acabado: "bg-blue-600",
  red_social: "bg-purple-600",
  texto: "bg-emerald-600",
};

const aFilas = (detalles: DetalleFicha[]): Fila[] =>
  detalles.map((d) => {
    const u = d.ubicaciones?.[0];
    return {
      tipo_elemento: d.tipo_elemento,
      nombre: d.nombre,
      detalle: d.detalle ?? "",
      url: d.url ?? "",
      zona: u?.zona ?? "",
      descripcion_libre: u?.descripcion_libre ?? "",
      imagen_id: u?.imagen_id ?? null,
      pin_x: u?.pin_x !== null && u?.pin_x !== undefined ? Number(u.pin_x) : null,
      pin_y: u?.pin_y !== null && u?.pin_y !== undefined ? Number(u.pin_y) : null,
    };
  });

const aDetalles = (filas: Fila[]): DetalleFicha[] =>
  filas
    .filter((f) => f.nombre.trim() || (f.tipo_elemento === "texto" && f.detalle.trim()))
    .map((f) => ({
      tipo_elemento: f.tipo_elemento,
      nombre: f.nombre.trim() || "Texto",
      detalle: f.detalle.trim() || null,
      url: f.url.trim() || null,
      ubicaciones:
        f.zona || f.pin_x !== null
          ? [
              {
                zona: f.zona || null,
                descripcion_libre: f.descripcion_libre.trim() || null,
                imagen_id: f.pin_x !== null ? f.imagen_id : null,
                pin_x: f.pin_x,
                pin_y: f.pin_y,
              },
            ]
          : [],
    }));

// ============================================================
// SELECTOR AMPLIABLE
//
// Escribes y filtra. Si lo que escribiste no está en la lista,
// ofrece agregarlo — y desde ese momento queda disponible para
// todas las fichas siguientes.
// ============================================================

function SelectorAmpliable({
  valor,
  opciones,
  onChange,
  onCrear,
  placeholder,
  className = "",
}: {
  valor: string;
  opciones: string[];
  onChange: (v: string) => void;
  onCrear: (v: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(valor);
  const [creando, setCreando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => setTexto(valor), [valor]);

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  const filtradas = opciones.filter((o) =>
    o.toLowerCase().includes(texto.trim().toLowerCase())
  );

  const existeExacta = opciones.some(
    (o) => o.toLowerCase() === texto.trim().toLowerCase()
  );

  const handleCrear = async () => {
    setCreando(true);
    try {
      await onCrear(texto.trim());
      onChange(texto.trim());
      setAbierto(false);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div ref={caja} className={`relative ${className}`}>
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          onChange(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
      />

      {abierto && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtradas.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(o);
                setTexto(o);
                setAbierto(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 text-gray-700"
            >
              {o}
            </button>
          ))}

          {texto.trim() && !existeExacta && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCrear}
              disabled={creando}
              className="w-full text-left px-3 py-2 text-sm bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-t border-emerald-100 disabled:opacity-50"
            >
              {creando ? "Agregando..." : `+ Agregar «${texto.trim()}» al catálogo`}
            </button>
          )}

          {filtradas.length === 0 && !texto.trim() && (
            <p className="px-3 py-2 text-xs text-gray-400">Sin opciones todavía</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EDITOR
// ============================================================

interface BorradorFicha {
  compromiso: string;
  conclusion: string;
  comentarios: string;
  pantones: PantoneFicha[];
  filas: Fila[];
  escalaPin: number;
}

export default function EditarFicha({ ficha, onGuardado, onCancel }: Props) {
  const claveBorrador = `ficha-editar-${ficha.idficha}`;
  const [borradorInicial] = useState(() => leerBorrador<BorradorFicha>(claveBorrador));

  const [compromiso, setCompromiso] = useState(borradorInicial?.compromiso ?? ficha.compromiso_entrega ?? "");
  const [conclusion, setConclusion] = useState(borradorInicial?.conclusion ?? ficha.fecha_conclusion ?? "");
  const [comentarios, setComentarios] = useState(borradorInicial?.comentarios ?? ficha.comentarios ?? "");
  const [pantones, setPantones] = useState<PantoneFicha[]>(borradorInicial?.pantones ??
    (ficha.pantones.length
      ? ficha.pantones
      : [{ codigo: "", hex_referencia: "#cccccc", cara: null }])
  );
  const [filas, setFilas] = useState<Fila[]>(borradorInicial?.filas ?? aFilas(ficha.detalles));
  const [zonas, setZonas] = useState<ZonaProducto[]>([]);
  const [catalogo, setCatalogo] = useState<OpcionCatalogo[]>([]);
  const [imagenActiva, setImagenActiva] = useState<number>(
    ficha.imagenes.find((i) => i.es_principal)?.idficha_imagen ??
      ficha.imagenes[0]?.idficha_imagen ??
      0
  );
  const [escalaPin, setEscalaPin] = useState<number>(
    borradorInicial?.escalaPin ?? (Number(ficha.escala_pin ?? 1) || 1)
  );

  useAutoguardarBorrador<BorradorFicha>(claveBorrador, {
    compromiso, conclusion, comentarios, pantones, filas, escalaPin,
  }, true);
  const [armado, setArmado] = useState<number | null>(null);
  const [aviso, setAviso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const lienzoRef = useRef<HTMLDivElement>(null);

  const maxPantones = MAX_PANTONES[ficha.tipo_material] ?? 8;
  const imagen = ficha.imagenes.find((i) => i.idficha_imagen === imagenActiva);

  const cargarCatalogos = async () => {
    try {
      const [z, c] = await Promise.all([
        getZonas(ficha.familia),
        getCatalogoAcabados(ficha.tipo_material),
      ]);
      setZonas(z);
      setCatalogo(c);
    } catch {
      /* si fallan, se puede seguir escribiendo libre */
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, [ficha.familia, ficha.tipo_material]);

  // ── Filas ──────────────────────────────────────────────

  const cambiar = (i: number, campo: keyof Fila, valor: any) =>
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f)));

  const agregar = (tipo: TipoElemento) =>
    setFilas((prev) => [
      ...prev,
      {
        tipo_elemento: tipo,
        nombre: tipo === "red_social" ? "Instagram" : tipo === "texto" ? "Texto" : "",
        detalle: "",
        url: "",
        zona: "",
        descripcion_libre: "",
        imagen_id: null,
        pin_x: null,
        pin_y: null,
      },
    ]);

  const eliminar = (i: number) => {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
    setArmado(null);
  };

  const colocarPin = (e: React.MouseEvent<HTMLDivElement>) => {
    if (armado === null || !imagen) return;
    const caja = lienzoRef.current?.getBoundingClientRect();
    if (!caja) return;

    const x = Math.round(((e.clientX - caja.left) / caja.width) * 10000) / 100;
    const y = Math.round(((e.clientY - caja.top) / caja.height) * 10000) / 100;

    setFilas((prev) =>
      prev.map((f, idx) =>
        idx === armado ? { ...f, pin_x: x, pin_y: y, imagen_id: imagen.idficha_imagen } : f
      )
    );
    setArmado(null);
  };

  // ── Catálogo ───────────────────────────────────────────

  const crearAcabado = async (nombre: string) => {
    try {
      const nueva = await agregarOpcionCatalogo({
        nombre,
        aplica_a: ficha.tipo_material,
      });
      setCatalogo((prev) =>
        prev.some((o) => o.nombre.toLowerCase() === nueva.nombre.toLowerCase())
          ? prev
          : [...prev, nueva]
      );
    } catch (error: any) {
      showAlert(error.response?.data?.error || "No se pudo agregar la opción");
    }
  };

  const crearZonaNueva = async (i: number, nombre: string) => {
    try {
      const nueva = await agregarZona(ficha.familia, nombre);
      setZonas((prev) =>
        prev.some((z) => z.clave === nueva.clave) ? prev : [...prev, nueva]
      );
      cambiar(i, "zona", nueva.clave);
    } catch (error: any) {
      showAlert(error.response?.data?.error || "No se pudo agregar la zona");
    }
  };

  // ── Pantones ───────────────────────────────────────────

  const cambiarPantone = (i: number, campo: keyof PantoneFicha, valor: any) =>
    setPantones((prev) => prev.map((p, idx) => (idx === i ? { ...p, [campo]: valor } : p)));

  const agregarPantone = () => {
    if (pantones.length >= maxPantones) return;
    setPantones((prev) => [...prev, { codigo: "", hex_referencia: "#cccccc", cara: null }]);
  };

  // ── Guardado ───────────────────────────────────────────

  const sinUbicar = filas.filter(
    (f) => (f.nombre.trim() || f.detalle.trim()) && f.pin_x === null
  );

  const intentarGuardar = (publicar: boolean) => {
    if (sinUbicar.length > 0 && !aviso) {
      setAviso(true);
      return;
    }
    ejecutarGuardado(publicar);
  };

  const ejecutarGuardado = async (publicar: boolean) => {
    setGuardando(true);
    setAviso(false);
    try {
      const actualizada = await guardarFicha(ficha.idficha, {
        compromiso_entrega: compromiso || null,
        fecha_conclusion: conclusion || null,
        comentarios: comentarios.trim() || null,
        escala_pin: escalaPin,
        pantones: pantones.filter((p) => p.codigo.trim()),
        detalles: aDetalles(filas),
      });

      if (publicar) await publicarFicha(ficha.idficha);

      limpiarBorrador(claveBorrador);
      onGuardado(actualizada);
    } catch (error: any) {
      showAlert(error.response?.data?.error || "Error al guardar la ficha");
    } finally {
      setGuardando(false);
    }
  };

  const nombreZona = (clave: string) =>
    zonas.find((z) => z.clave === clave)?.nombre ?? clave;

  // Índices reales dentro de filas, para que la numeración de los
  // pines sea continua entre acabados, textos y redes.
  const indices = (tipo: TipoElemento) =>
    filas.map((f, i) => ({ f, i })).filter((x) => x.f.tipo_elemento === tipo);

  const selectorZona = (i: number, f: Fila) => (
    <div className="flex gap-2 flex-wrap">
      <SelectorAmpliable
        className="flex-1 min-w-[130px]"
        valor={nombreZona(f.zona)}
        opciones={zonas.map((z) => z.nombre)}
        placeholder="¿Dónde va?"
        onChange={(v) => {
          const z = zonas.find((x) => x.nombre.toLowerCase() === v.toLowerCase());
          cambiar(i, "zona", z ? z.clave : v);
        }}
        onCrear={(v) => crearZonaNueva(i, v)}
      />
      {f.zona === "personalizado" && (
        <input
          value={f.descripcion_libre}
          onChange={(e) => cambiar(i, "descripcion_libre", e.target.value)}
          placeholder="Describe dónde va"
          className="flex-1 min-w-[140px] text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
        />
      )}
    </div>
  );

  const botonesFila = (i: number, f: Fila) => (
    <>
      <button
        onClick={() => setArmado(armado === i ? null : i)}
        className="text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 flex-shrink-0"
      >
        {f.pin_x !== null ? "mover" : "ubicar"}
      </button>
      <button
        onClick={() => eliminar(i)}
        className="text-gray-400 hover:text-red-500 flex-shrink-0 px-1"
      >
        ✕
      </button>
    </>
  );

  const numero = (i: number, f: Fila) => (
    <span
      className={`w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
        f.pin_x === null ? "bg-gray-300" : COLOR_PIN[f.tipo_elemento]
      }`}
    >
      {i + 1}
    </span>
  );

  return (
    <div className="space-y-5">

      {/* ── Fechas ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Compromiso de entrega
          </label>
          <input
            type="date"
            value={compromiso?.slice(0, 10) ?? ""}
            onChange={(e) => setCompromiso(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Fecha de conclusión
          </label>
          <input
            type="date"
            value={conclusion?.slice(0, 10) ?? ""}
            onChange={(e) => setConclusion(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
          />
        </div>
      </div>

      {/* ── Especificación ── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Especificación
          </h3>
          <span className="text-xs text-gray-400">
            {ficha.tipo_material === "papel" ? "Papel" : "Plástico"} · congelada
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(ficha.especificacion ?? {}).map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
              <div className="text-[11px] text-gray-400 capitalize">
                {k.replace(/_/g, " ")}
              </div>
              <div className="text-sm text-gray-900">
                {v === null || v === "" ? "—" : String(v)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pantones ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Pantones
          </h3>
          <span className="text-xs text-gray-400">
            {pantones.filter((p) => p.codigo.trim()).length} de {maxPantones}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {pantones.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <input
                type="color"
                value={p.hex_referencia ?? "#cccccc"}
                onChange={(e) => cambiarPantone(i, "hex_referencia", e.target.value)}
                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0 bg-transparent p-0"
              />
              <input
                value={p.codigo}
                onChange={(e) => cambiarPantone(i, "codigo", e.target.value)}
                placeholder="Pantone"
                className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none"
              />
              <button
                onClick={() => setPantones((prev) => prev.filter((_, x) => x !== i))}
                className="text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
          {pantones.length < maxPantones && (
            <button
              onClick={agregarPantone}
              className="border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 py-2"
            >
              + Pantone
            </button>
          )}
        </div>
      </div>

      {/* ── Imagen + acabados ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
          Acabados y ubicación
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {armado !== null
            ? `Haz clic sobre la imagen para ubicar: ${
                filas[armado]?.nombre || "este elemento"
              }`
            : "Escribe libremente o elige del catálogo. Ubicar es opcional."}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Imagen */}
          <div className="lg:col-span-2">
            {ficha.imagenes.length > 1 && (
              <div className="flex gap-1 mb-2 flex-wrap">
                {ficha.imagenes.map((img) => (
                  <button
                    key={img.idficha_imagen}
                    onClick={() => setImagenActiva(img.idficha_imagen)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      imagenActiva === img.idficha_imagen
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {img.vista}
                  </button>
                ))}
              </div>
            )}

            {imagen?.url ? (
              <div
                ref={lienzoRef}
                onClick={colocarPin}
                className={`relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 ${
                  armado !== null ? "cursor-crosshair ring-2 ring-blue-400" : ""
                }`}
              >
                <img src={imagen.url} alt={imagen.vista} className="w-full block" />
                {filas.map((f, i) =>
                  f.pin_x !== null && f.pin_y !== null && f.imagen_id === imagenActiva ? (
                    <div
                      key={i}
                      style={{
                        left: `${f.pin_x}%`,
                        top: `${f.pin_y}%`,
                        width: `${24 * escalaPin}px`,
                        height: `${24 * escalaPin}px`,
                        fontSize: `${Math.max(11 * escalaPin, 7)}px`,
                        borderWidth: escalaPin < 0.7 ? 1 : 2,
                      }}
                      title={f.nombre}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full text-white font-bold flex items-center justify-center border-white ${
                        COLOR_PIN[f.tipo_elemento]
                      }`}
                    >
                      {i + 1}
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-xs text-gray-400">
                Este producto no tiene imagen registrada. Los detalles se guardan con
                su zona, pero sin pin.
              </div>
            )}

            <div className="flex gap-3 justify-center mt-2 text-[11px] text-gray-400">
              <span>● acabado</span>
              <span className="text-emerald-600">● texto</span>
              <span className="text-purple-600">● red</span>
            </div>

            {/* El tamaño que elijas aquí es el que sale en el PDF */}
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-gray-600">
                  Tamaño de los pines
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">
                    {Math.round(escalaPin * 100)}%
                  </span>
                  {escalaPin !== 1 && (
                    <button
                      onClick={() => setEscalaPin(1)}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      restablecer
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={40}
                max={200}
                step={5}
                value={Math.round(escalaPin * 100)}
                onChange={(e) => setEscalaPin(Number(e.target.value) / 100)}
                className="w-full accent-blue-600"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                El PDF usa este mismo tamaño.
              </p>
            </div>
          </div>

          {/* Lista de acabados */}
          <div className="lg:col-span-3 space-y-2">
            {indices("acabado").map(({ f, i }) => (
              <div
                key={i}
                className={`rounded-lg border p-2.5 bg-gray-50 ${
                  armado === i ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {numero(i, f)}
                  <SelectorAmpliable
                    className="flex-1 min-w-0"
                    valor={f.nombre}
                    opciones={catalogo.map((o) => o.nombre)}
                    placeholder="¿Qué lleva?"
                    onChange={(v) => cambiar(i, "nombre", v)}
                    onCrear={crearAcabado}
                  />
                  {botonesFila(i, f)}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    value={f.detalle}
                    onChange={(e) => cambiar(i, "detalle", e.target.value)}
                    placeholder="Color, medida, detalle..."
                    className="flex-[2] min-w-[120px] text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                  />
                  <div className="flex-1 min-w-[140px]">{selectorZona(i, f)}</div>
                </div>
              </div>
            ))}

            <button
              onClick={() => agregar("acabado")}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600"
            >
              + Acabado
            </button>
          </div>
        </div>
      </div>

      {/* ── Textos del producto ── */}
      <div className="bg-white border border-emerald-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
          Texto del producto
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Lo que va impreso, tal cual lo pidió el cliente. Cada Enter se marca con ¶
          para que el diseñador respete el salto de línea.
        </p>

        <div className="space-y-3">
          {indices("texto").map(({ f, i }) => {
            const lineas = f.detalle.split("\n");
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 bg-emerald-50/40 ${
                  armado === i
                    ? "border-emerald-500 ring-1 ring-emerald-300"
                    : "border-emerald-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {numero(i, f)}
                  <input
                    value={f.nombre}
                    onChange={(e) => cambiar(i, "nombre", e.target.value)}
                    placeholder="Etiqueta: Leyenda, Instructivo, Contenido..."
                    className="flex-1 min-w-0 text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                  />
                  {botonesFila(i, f)}
                </div>

                <textarea
                  value={f.detalle}
                  onChange={(e) => cambiar(i, "detalle", e.target.value)}
                  rows={Math.min(Math.max(lineas.length + 1, 3), 12)}
                  placeholder="Escribe el texto exacto. Cada Enter es un salto de línea en el diseño."
                  className="w-full text-sm border border-gray-200 rounded-md px-2 py-2 bg-white font-mono leading-relaxed"
                />

                <div className="flex items-center justify-between gap-2 mt-1 mb-2">
                  <span className="text-[11px] text-gray-400">
                    {f.detalle.length} caracteres · {lineas.length} línea
                    {lineas.length !== 1 ? "s" : ""}
                  </span>
                  {f.detalle.length > 600 && (
                    <span className="text-[11px] text-amber-600">
                      Texto largo: revisa que quepa en la cara
                    </span>
                  )}
                </div>

                {/* Vista previa con los saltos marcados */}
                {f.detalle.trim() && (
                  <div className="bg-white border border-emerald-100 rounded-md px-3 py-2 mb-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                      Como se leerá en el PDF
                    </p>
                    {lineas.map((linea, k) => (
                      <div key={k} className="text-sm text-gray-800 leading-relaxed">
                        {linea || <span className="text-gray-300">línea vacía</span>}
                        {k < lineas.length - 1 && (
                          <span className="text-emerald-500 ml-1 select-none">¶</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectorZona(i, f)}
              </div>
            );
          })}

          <button
            onClick={() => agregar("texto")}
            className="w-full border-2 border-dashed border-emerald-300 rounded-lg py-2 text-xs text-emerald-700 hover:border-emerald-500 hover:bg-emerald-50"
          >
            + Texto
          </button>
        </div>
      </div>

      {/* ── Redes sociales ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Redes sociales
        </h3>
        <div className="space-y-2">
          {indices("red_social").map(({ f, i }) => (
            <div
              key={i}
              className={`rounded-lg border p-2.5 bg-gray-50 ${
                armado === i ? "border-purple-400 ring-1 ring-purple-300" : "border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {numero(i, f)}
                <select
                  value={f.nombre}
                  onChange={(e) => cambiar(i, "nombre", e.target.value)}
                  className="w-32 text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                >
                  {REDES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input
                  value={f.detalle}
                  onChange={(e) => cambiar(i, "detalle", e.target.value)}
                  placeholder="usuario"
                  className="flex-1 min-w-0 text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                />
                {botonesFila(i, f)}
              </div>
              {selectorZona(i, f)}
            </div>
          ))}

          <button
            onClick={() => agregar("red_social")}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600"
          >
            + Red social
          </button>
        </div>
      </div>

      {/* ── Comentarios ── */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Comentarios</label>
        <textarea
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          rows={3}
          placeholder="Instrucciones que no van amarradas a una zona..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white resize-none"
        />
      </div>

      {/* ── Aviso de elementos sin ubicar ── */}
      {aviso && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            {sinUbicar.length} elemento(s) sin ubicar en la imagen
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Saldrán en el PDF con su zona, pero sin número de pin. Puedes guardar así si
            no aplican a un punto específico.
          </p>
          <div className="space-y-1 mb-3">
            {sinUbicar.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-amber-100"
              >
                <span className="text-xs text-gray-700 flex-1 truncate">{f.nombre}</span>
                <span className="text-xs text-gray-400">
                  {f.zona ? nombreZona(f.zona) : "sin zona"}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAviso(false)}
              className="px-4 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Volver a revisar
            </button>
            <button
              onClick={() => ejecutarGuardado(false)}
              className="px-4 py-1.5 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold"
            >
              Guardar así
            </button>
          </div>
        </div>
      )}

      {/* ── Botones ── */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={guardando}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={() => intentarGuardar(false)}
          disabled={guardando}
          className="flex-1 px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          onClick={() => intentarGuardar(true)}
          disabled={guardando}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          Guardar y publicar
        </button>
      </div>
    </div>
  );
}