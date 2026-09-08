// src/pages/cotizadorLibre/CotizadorLibre.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getTiposCotizadorLibre,
  getMedidasPapelCotizadorLibre,
  getMedidasPlasticoCotizadorLibre,
  getDetalleProductoPapelCotizadorLibre,
  getDetalleProductoPlasticoCotizadorLibre,
} from "../../services/cotizadorLibre/cotizadorLibreCatalogo.service";
import { useCalcularPrecioCotizadorLibre } from "../../hooks/cotizadorLibre/useCalcularPrecioCotizadorLibre";
import { crearCotizacionCotizadorLibre, enviarPdfCotizadorLibre } from "../../services/cotizadorLibre/cotizadorLibreCotizaciones.service";
import {
  construirPayloadPdfCotizadorLibreCotizacion,
  construirPayloadPdfCotizadorLibrePedido,
} from "../../utils/cotizadorLibre/construirPayloadPdfCotizadorLibre";
import { generarPdfCotizacion } from "../../utils/generarPdfCotizacion";
import { generarPdfPedido } from "../../utils/generarPdfPedido";
import IdentificacionCliente from "../../components/cotizadorLibre/IdentificacionCliente";
import LandingCotizadorLibre from "../../components/cotizadorLibre/LandingCotizadorLibre";
import type {
  CategoriaCotizadorLibre,
  TipoCatalogoItem,
  MedidaPapelItem,
  MedidaPlasticoItem,
  DetalleProductoPapelResponse,
  DetalleProductoPlasticoResponse,
} from "../../types/cotizadorLibre/cotizadorLibre.types";
import type { CalcularPrecioCotizadorLibrePayload } from "../../services/cotizadorLibre/cotizadorLibrePrecio.service";
import { getCintaSeguridadCotizadorLibre } from "../../services/cotizadorLibre/cintaSeguridadCotizadorLibre.service";
import type { CintaSeguridadCotizadorLibreItem } from "../../types/cotizadorLibre/cintaSeguridadCotizadorLibre.types";
import type {
  ItemCarrito,
  ProductoGuardadoInput,
} from "../../types/cotizadorLibre/cotizadorLibreCotizaciones.types";

type Vista = "landing" | "wizard";
type AccionFinal = "cotizacion" | "pedido";

// Snapshot completo de la selección del wizard para un producto del
// carrito — se guarda aparte de ItemCarrito (que solo trae lo ya
// calculado/descriptivo) para poder "Editar": restaurar todo tal cual
// estaba seleccionado y dejar que el usuario lo modifique.
type ConfiguracionCarritoGuardada = {
  categoria: CategoriaCotizadorLibre;
  idTipoSeleccionado: number;
  idMedidaSeleccionada: number;
  idGrupoSeleccionado: number | null;
  idAsaSeleccionada: number | null;
  idLaminadoSeleccionado: number | null;
  idTexturaSeleccionada: number | null;
  idFoilSeleccionado: number | null;
  altoRelieve: boolean;
  uv: boolean;
  tintasFrente: number;
  tintasDentro: number;
  idTintasPlastico: number | null;
  idCintaSeguridadSeleccionada: number | null;
  cantidad: number | null;
};

// El cargo por asa solo aplica si el nombre de la opción contiene "listón"
// — misma regla de negocio ya usada en la herramienta interna
// (useCalculoPrecioPapel.ts). No es un booleano libre: depende del nombre.
const esAsaDeListon = (nombre: string | null): boolean =>
  String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("liston");

// Detección de "bolsa envíos" por nombre del tipo de producto — mismo
// normalizador y mismo criterio que usa el backend
// (incrementoPlasticoCotizadorLibre.service.ts), para que el paso
// obligatorio de cinta de seguridad se muestre exactamente en los mismos
// casos en los que el backend la va a exigir.
const esBolsaDeEnvios = (nombre: string | null): boolean =>
  String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .includes("envios");

const generarIdLocal = () => `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================
// Estilos compartidos del rediseño (solo presentación)
// ============================================================
const TARJETA = "bg-white border border-[#e4e4e4] rounded-lg";
const TITULO = "text-[15px] font-bold text-[#2f2f2f] mb-4";
const SUBTITULO = "text-[13px] font-semibold text-[#2f2f2f] mb-2.5";
const ETIQUETA = "text-[11px] text-[#8a8a8a] mb-2";
const TEXTO_MUDO = "text-[13px] text-[#8a8a8a]";
const TEXTO_ERROR = "text-[12px] text-[#b04a3a]";
const CAMPO =
  "border border-[#e4e4e4] rounded-md px-3 py-2.5 text-[13px] text-[#2f2f2f] placeholder:text-[#b3b3b3] focus:border-[#b8823c] outline-none transition-colors";

// Scroll independiente por columna, sin barra visible (misma técnica que ya
// usaba la pantalla) para que todo el cotizador quepa en una sola vista.
const SCROLL_COL =
  "lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pb-4 lg:[scrollbar-width:none] lg:[-ms-overflow-style:none] lg:[&::-webkit-scrollbar]:hidden";

const filaRadio = (activo: boolean) =>
  `flex items-center gap-2.5 px-2.5 py-2 rounded text-[13px] text-left transition-colors ${
    activo ? "text-[#2f2f2f] font-semibold bg-[#fdf8f1]" : "text-[#4a4a4a] hover:bg-[#faf9f7]"
  }`;

const filaCasilla = (activo: boolean) =>
  `flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-[13px] text-left transition-colors ${
    activo
      ? "border-[#b8823c] bg-[#fdf8f1] text-[#2f2f2f] font-semibold"
      : "border-[#e4e4e4] bg-white text-[#4a4a4a] hover:border-[#c9b18d]"
  }`;

const cajaOpcion = (activo: boolean) =>
  `rounded-md border px-2 py-2.5 flex flex-col items-center gap-2 transition-colors ${
    activo ? "border-[#b8823c] bg-white" : "border-[#e4e4e4] bg-white hover:border-[#c9b18d]"
  }`;

function Radio({ activo }: { activo: boolean }) {
  return (
    <span
      className={`w-[15px] h-[15px] rounded-full border flex items-center justify-center flex-shrink-0 ${
        activo ? "border-[#b8823c]" : "border-[#c4c4c4]"
      }`}
    >
      {activo && <span className="w-[7px] h-[7px] rounded-full bg-[#b8823c]" />}
    </span>
  );
}

function Casilla({ activo }: { activo: boolean }) {
  return (
    <span
      className={`w-[15px] h-[15px] rounded-[3px] border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
        activo ? "border-[#b8823c] bg-[#b8823c] text-white" : "border-[#c4c4c4] bg-white text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

// Mismo estilo de pastilla numérica para tintas — reutilizado tanto por
// papel (SelectorCantidadTintas, 0-6 fijo) como por plástico (número de
// tintas real que traiga el catálogo), para que ambos se vean idénticos.
const pildoraNumero = (activo: boolean) =>
  `w-8 h-8 rounded-md border text-[12px] font-semibold transition-colors flex items-center justify-center flex-shrink-0 ${
    activo
      ? "border-[#b8823c] bg-[#fdf8f1] text-[#2f2f2f]"
      : "border-[#e4e4e4] bg-white text-[#4a4a4a] hover:border-[#c9b18d]"
  }`;

// Selector de pastillas 0-6 para tintas de papel (frente/dentro) — mismo
// lenguaje visual que el resto de acabados seleccionables, en vez de un
// input numérico plano.
function SelectorCantidadTintas({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-[12px] text-[#6a6a6a] mb-1.5">{etiqueta}</p>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={pildoraNumero(valor === n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="px-5 first:pl-0 min-w-0">
      <p className="text-[12px] text-[#8a8a8a] leading-tight">{etiqueta}</p>
      <p className="text-[14px] font-semibold text-[#2f2f2f] leading-tight mt-0.5 truncate">{valor}</p>
    </div>
  );
}

function Separador() {
  return <span className="hidden lg:block w-px h-8 bg-[#ececec]" />;
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-3 text-[13px]">
      <span className="w-[76px] flex-shrink-0 font-bold text-[#2f2f2f]">{etiqueta}</span>
      <span className="text-[#4a4a4a] min-w-0">{valor}</span>
    </div>
  );
}

export default function CotizadorLibre() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // El cliente externo (cuenta compartida cotizacionlibre@grupoeb.com) solo
  // puede generar cotizaciones — nunca pedidos directos. Staff interno
  // usando esta misma pantalla con su propia cuenta sí puede ambos.
  const esClienteExterno = user?.rol === "CotizadorLibre";

  // Salir del módulo: para el cliente externo (cuenta compartida) es un
  // cierre de sesión real. Para staff interno usando su propia cuenta,
  // en cambio, es simplemente volver al home del sistema — no tiene
  // sentido cerrarle la sesión de todo SIGEB por salir de este módulo.
  const salirDelCotizador = () => {
    if (esClienteExterno) {
      logout();
    } else {
      navigate("/home");
    }
  };

  const [vista, setVista] = useState<Vista>("landing");

  // ---- Paso 1: Categoría ----
  const [categoria, setCategoria] = useState<CategoriaCotizadorLibre | null>(null);

  // ---- Paso 2: Tipo ----
  const [tipos, setTipos] = useState<TipoCatalogoItem[]>([]);
  const [tiposLoading, setTiposLoading] = useState(false);
  const [tiposError, setTiposError] = useState<string | null>(null);
  const [idTipoSeleccionado, setIdTipoSeleccionado] = useState<number | null>(null);

  // ---- Paso 3: Medida ----
  const [medidas, setMedidas] = useState<(MedidaPapelItem | MedidaPlasticoItem)[]>([]);
  const [medidasLoading, setMedidasLoading] = useState(false);
  const [medidasError, setMedidasError] = useState<string | null>(null);
  const [idMedidaSeleccionada, setIdMedidaSeleccionada] = useState<number | null>(null);

  // ---- Paso 4: Detalle + Personalización ----
  const [detallePapel, setDetallePapel] = useState<DetalleProductoPapelResponse | null>(null);
  const [detallePlastico, setDetallePlastico] = useState<DetalleProductoPlasticoResponse | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  const [idGrupoSeleccionado, setIdGrupoSeleccionado] = useState<number | null>(null);
  const [idAsaSeleccionada, setIdAsaSeleccionada] = useState<number | null>(null);
  const [idLaminadoSeleccionado, setIdLaminadoSeleccionado] = useState<number | null>(null);
  const [idTexturaSeleccionada, setIdTexturaSeleccionada] = useState<number | null>(null);
  const [idFoilSeleccionado, setIdFoilSeleccionado] = useState<number | null>(null);
  const [altoRelieve, setAltoRelieve] = useState(false);
  const [uv, setUv] = useState(false);
  const [tintasFrente, setTintasFrente] = useState(0);
  const [tintasDentro, setTintasDentro] = useState(0);

  const [idTintasPlastico, setIdTintasPlastico] = useState<number | null>(null);

  // ✅ NUEVO — cinta de seguridad, obligatoria cuando el tipo detectado es
  // "bolsa envíos". El catálogo se carga una sola vez (es chico, no depende
  // de la medida/tipo elegido, solo se usa condicionalmente).
  const [cintasSeguridad, setCintasSeguridad] = useState<CintaSeguridadCotizadorLibreItem[]>([]);
  const [idCintaSeguridadSeleccionada, setIdCintaSeguridadSeleccionada] = useState<number | null>(null);

  useEffect(() => {
    getCintaSeguridadCotizadorLibre()
      .then(setCintasSeguridad)
      .catch((err) => console.error("Error al cargar cintas de seguridad:", err));
  }, []);

  // ---- Paso 5: Cantidad ----
  const [cantidad, setCantidad] = useState<number | null>(null);

  // ---- Carrito (Fase 4.5) ----
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  // Snapshot de selección por producto del carrito (idLocal → config),
  // para poder "Editar": restaurar todo el wizard tal como estaba.
  const [configuracionesCarrito, setConfiguracionesCarrito] = useState<
    Record<string, ConfiguracionCarritoGuardada>
  >({});

  // ---- Identificación de cliente ----
  const [panelIdentificacionAbierto, setPanelIdentificacionAbierto] = useState(false);
  const [clienteIdentificado, setClienteIdentificado] = useState<{
    clienteId: number;
    verificado: boolean;
    datosContacto: { empresa: string; telefono: string; correoMostrar: string };
  } | null>(null);
  const [accionPendiente, setAccionPendiente] = useState<AccionFinal | null>(null);

  // ---- Guardado final ----
  const [guardando, setGuardando] = useState(false);
  const [guardadoError, setGuardadoError] = useState<string | null>(null);
  const [resultadoGuardado, setResultadoGuardado] = useState<{
    no_cotizacion: string | null;
    no_pedido: string | null;
    estado: string;
    correoDestino: string | null;
    correoEnviado: boolean;
  } | null>(null);

  // ============================================================
  // Cargar tipos al elegir categoría
  // ============================================================
  // ✅ NUEVO — idTipoAtajoPendiente: cuando se entra por un atajo de la
  // landing, este efecto de todos modos resetea idTipoSeleccionado a null
  // en cuanto cambia `categoria` (para el flujo manual normal). Por eso el
  // tipo del atajo no se fija de una vez en entrarAlCotizadorConAtajo —
  // se guarda aquí y se aplica hasta que el catálogo real ya haya cargado,
  // validando además que ese id sí exista en la lista (por si el tipo se
  // desactivó o se borró después de configurar el atajo en la landing).
  const idTipoAtajoPendiente = useRef<number | null>(null);

  // ✅ NUEVO — mismo mecanismo que idTipoAtajoPendiente, pero para poder
  // "Editar" un producto ya agregado al carrito: se restauran medida y
  // acabados en cuanto cada catálogo dependiente termine de cargar (ver
  // los tres efectos de abajo).
  const idMedidaEdicionPendiente = useRef<number | null>(null);
  const configuracionRestanteEdicionPendiente = useRef<ConfiguracionCarritoGuardada | null>(null);

  useEffect(() => {
    if (!categoria) return;

    setTipos([]);
    setIdTipoSeleccionado(null);
    setMedidas([]);
    setIdMedidaSeleccionada(null);
    setTiposError(null);
    setTiposLoading(true);

    getTiposCotizadorLibre(categoria)
      .then((data) => {
        setTipos(data);

        const idPendiente = idTipoAtajoPendiente.current;
        idTipoAtajoPendiente.current = null;
        if (idPendiente !== null && data.some((t) => t.id === idPendiente)) {
          setIdTipoSeleccionado(idPendiente);
        }
      })
      .catch((err) => {
        console.error("Error al cargar tipos:", err);
        setTiposError("No se pudo cargar el catálogo. Intenta de nuevo.");
      })
      .finally(() => setTiposLoading(false));
  }, [categoria]);

  // ============================================================
  // Cargar medidas al elegir tipo
  // ============================================================
  useEffect(() => {
    if (!categoria || !idTipoSeleccionado) return;

    setMedidas([]);
    setIdMedidaSeleccionada(null);
    setMedidasError(null);
    setMedidasLoading(true);

    const promesa =
      categoria === "papel"
        ? getMedidasPapelCotizadorLibre(idTipoSeleccionado)
        : getMedidasPlasticoCotizadorLibre(idTipoSeleccionado);

    promesa
      .then((data) => {
        setMedidas(data);

        const idPendiente = idMedidaEdicionPendiente.current;
        idMedidaEdicionPendiente.current = null;
        if (idPendiente !== null && data.some((m) => m.id === idPendiente)) {
          setIdMedidaSeleccionada(idPendiente);
        }
      })
      .catch((err) => {
        console.error("Error al cargar medidas:", err);
        setMedidasError("No se pudieron cargar las medidas. Intenta de nuevo.");
      })
      .finally(() => setMedidasLoading(false));
  }, [categoria, idTipoSeleccionado]);

  // ============================================================
  // Cargar detalle de producto al elegir medida (resetea personalización)
  // ============================================================
  useEffect(() => {
    if (!categoria || !idMedidaSeleccionada) return;

    setDetallePapel(null);
    setDetallePlastico(null);
    setDetalleError(null);
    setIdGrupoSeleccionado(null);
    setIdAsaSeleccionada(null);
    setIdLaminadoSeleccionado(null);
    setIdTexturaSeleccionada(null);
    setIdFoilSeleccionado(null);
    setAltoRelieve(false);
    setUv(false);
    setTintasFrente(0);
    setTintasDentro(0);
    setIdTintasPlastico(null);
    setIdCintaSeguridadSeleccionada(null);
    setCantidad(null);
    setDetalleLoading(true);

    if (categoria === "papel") {
      getDetalleProductoPapelCotizadorLibre(idMedidaSeleccionada)
        .then((data) => {
          setDetallePapel(data);

          // Si venimos de "Editar" un producto del carrito, aquí es donde
          // ya se puede restaurar el resto de la personalización — recién
          // ahora existen los catálogos (asas, laminados, etc.) contra los
          // que validar que esos ids todavía sean válidos.
          const pendiente = configuracionRestanteEdicionPendiente.current;
          if (pendiente) {
            configuracionRestanteEdicionPendiente.current = null;
            setIdGrupoSeleccionado(
              pendiente.idGrupoSeleccionado !== null &&
                data.grupos.some((g) => g.idgrupo_papel === pendiente.idGrupoSeleccionado)
                ? pendiente.idGrupoSeleccionado
                : data.grupos.length === 1
                ? data.grupos[0].idgrupo_papel
                : null
            );
            setIdAsaSeleccionada(
              pendiente.idAsaSeleccionada !== null &&
                data.asas.some((a) => a.id === pendiente.idAsaSeleccionada)
                ? pendiente.idAsaSeleccionada
                : null
            );
            setIdLaminadoSeleccionado(
              pendiente.idLaminadoSeleccionado !== null &&
                data.laminados.some((l) => l.id === pendiente.idLaminadoSeleccionado)
                ? pendiente.idLaminadoSeleccionado
                : null
            );
            setIdTexturaSeleccionada(
              pendiente.idTexturaSeleccionada !== null &&
                data.texturas.some((t) => t.id === pendiente.idTexturaSeleccionada)
                ? pendiente.idTexturaSeleccionada
                : null
            );
            setIdFoilSeleccionado(
              pendiente.idFoilSeleccionado !== null &&
                data.foils.some((f) => f.id === pendiente.idFoilSeleccionado)
                ? pendiente.idFoilSeleccionado
                : null
            );
            setAltoRelieve(pendiente.altoRelieve);
            setUv(pendiente.uv);
            setTintasFrente(pendiente.tintasFrente);
            setTintasDentro(pendiente.tintasDentro);
            setIdCintaSeguridadSeleccionada(pendiente.idCintaSeguridadSeleccionada);
            setCantidad(pendiente.cantidad);
          } else if (data.grupos.length === 1) {
            setIdGrupoSeleccionado(data.grupos[0].idgrupo_papel);
          }
        })
        .catch((err) => {
          console.error("Error al cargar detalle:", err);
          setDetalleError("No se pudo cargar el detalle del producto.");
        })
        .finally(() => setDetalleLoading(false));
    } else {
      getDetalleProductoPlasticoCotizadorLibre(idMedidaSeleccionada)
        .then((data) => {
          setDetallePlastico(data);

          const pendiente = configuracionRestanteEdicionPendiente.current;
          if (pendiente) {
            configuracionRestanteEdicionPendiente.current = null;
            setIdTintasPlastico(
              pendiente.idTintasPlastico !== null &&
                data.tintas.some((t) => t.id === pendiente.idTintasPlastico)
                ? pendiente.idTintasPlastico
                : null
            );
            setIdCintaSeguridadSeleccionada(pendiente.idCintaSeguridadSeleccionada);
            setCantidad(pendiente.cantidad);
          }
        })
        .catch((err) => {
          console.error("Error al cargar detalle:", err);
          setDetalleError("No se pudo cargar el detalle del producto.");
        })
        .finally(() => setDetalleLoading(false));
    }
  }, [categoria, idMedidaSeleccionada]);

  // ============================================================
  // Payload de precio (Fase 4.3)
  // ============================================================
  // Mínimos reales — en Plástico no tiene sentido un mínimo fijo de piezas,
  // porque lo que de verdad limita es el peso total (la tabla de tarifas no
  // tiene rangos por debajo de 30kg, ver Fase 3). En Papel sí es un mínimo
  // fijo de piezas.
  const CANTIDAD_MINIMA_PAPEL = 500;
  const PESO_MINIMO_KG_PLASTICO = 30;

  const porKiloPlastico = useMemo(() => {
    if (!detallePlastico) return null;
    const v = Number(detallePlastico.producto.por_kilo);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [detallePlastico]);

  // ✅ NUEVO — mismo criterio que el backend: si el tipo de producto
  // seleccionado es "bolsa envíos", la cinta de seguridad es obligatoria
  // para poder calcular precio.
  const requiereCintaSeguridad = useMemo(() => {
    if (categoria !== "plastico" || !idTipoSeleccionado) return false;
    const tipo = tipos.find((t) => t.id === idTipoSeleccionado);
    return esBolsaDeEnvios(tipo?.nombre ?? null);
  }, [categoria, idTipoSeleccionado, tipos]);

  const cantidadMinimaPlastico = useMemo(() => {
    if (!porKiloPlastico) return null;
    const minimoExacto = PESO_MINIMO_KG_PLASTICO * porKiloPlastico;
    // Redondeo a bloques de 500 (antes era a centenas). La regla acordada
    // era "redondear al múltiplo de 500 más cercano usando el punto medio
    // (250) como corte" — PERO combinada con el requisito de nunca bajar
    // del mínimo real necesario para que exista tarifa (30kg de peso),
    // cualquier residuo > 0 al redondear hacia abajo caería por debajo de
    // ese mínimo real. Por eso la rama de "bajar" nunca puede aplicarse en
    // la práctica: matemáticamente equivale a redondear siempre hacia
    // arriba al siguiente múltiplo de 500 (salvo que ya sea exacto).
    return Math.ceil(minimoExacto / 500) * 500;
  }, [porKiloPlastico]);

  const cantidadMinimaActual =
    categoria === "plastico" ? cantidadMinimaPlastico : CANTIDAD_MINIMA_PAPEL;

  const cantidadValida =
    cantidad !== null && cantidadMinimaActual !== null && cantidad >= cantidadMinimaActual;

  const payloadPrecio: CalcularPrecioCotizadorLibrePayload | null = useMemo(() => {
    if (!cantidadValida || !cantidad) return null;

    if (categoria === "papel") {
      if (!idMedidaSeleccionada || !idGrupoSeleccionado) return null;

      const nombreAsa =
        detallePapel?.asas.find((a) => a.id === idAsaSeleccionada)?.nombre ?? null;

      return {
        categoria: "papel",
        cantidad,
        papel: {
          idproducto_papel: idMedidaSeleccionada,
          idgrupo_papel: idGrupoSeleccionado,
          acabados: {
            tintas_frente: tintasFrente,
            tintas_dentro: tintasDentro,
            laminado: idLaminadoSeleccionado !== null,
            hot_stamping: idFoilSeleccionado !== null,
            alto_relieve: altoRelieve,
            textura: idTexturaSeleccionada !== null,
            uv,
            asa: idAsaSeleccionada !== null && esAsaDeListon(nombreAsa),
          },
        },
      };
    }

    if (categoria === "plastico") {
      if (!detallePlastico || idTintasPlastico === null || !porKiloPlastico || !idTipoSeleccionado) {
        return null;
      }
      // Cinta de seguridad obligatoria en bolsa envíos — sin ella no se
      // arma el payload, así que no se dispara ningún cálculo de precio
      // hasta que el usuario la elija (el paso 4 se lo va a exigir).
      if (requiereCintaSeguridad && idCintaSeguridadSeleccionada === null) return null;

      return {
        categoria: "plastico",
        cantidad,
        plastico: {
          porKilo: porKiloPlastico,
          tintasId: idTintasPlastico,
          idTipoProductoPlastico: idTipoSeleccionado,
          ...(requiereCintaSeguridad && idCintaSeguridadSeleccionada !== null
            ? { cintaSeguridadId: idCintaSeguridadSeleccionada }
            : {}),
        },
      };
    }

    return null;
  }, [
    categoria,
    cantidad,
    idMedidaSeleccionada,
    idGrupoSeleccionado,
    idAsaSeleccionada,
    idLaminadoSeleccionado,
    idFoilSeleccionado,
    idTexturaSeleccionada,
    altoRelieve,
    uv,
    tintasFrente,
    tintasDentro,
    detallePapel,
    detallePlastico,
    idTintasPlastico,
    cantidadValida,
    porKiloPlastico,
    idTipoSeleccionado,
    requiereCintaSeguridad,
    idCintaSeguridadSeleccionada,
  ]);

  const { resultado: precio, loading: precioLoading, error: precioError } =
    useCalcularPrecioCotizadorLibre({ payload: payloadPrecio });

  // ============================================================
  // Carrito — agregar producto configurado
  // ============================================================
  const puedeAgregarAlCarrito =
    !!payloadPrecio && !!precio?.disponible && precio.precio_unitario !== null && !!cantidad;

  const resetearConfiguracion = () => {
    setCategoria(null);
    setIdTipoSeleccionado(null);
    setIdMedidaSeleccionada(null);
    setCantidad(null);
  };

  const construirItemDesdeConfiguracionActual = (): {
    item: ItemCarrito;
    configuracion: ConfiguracionCarritoGuardada;
  } | null => {
    if (!puedeAgregarAlCarrito || !payloadPrecio || !precio?.precio_unitario || !categoria) return null;

    let payload: ProductoGuardadoInput;
    let descripcion: string;

    if (payloadPrecio.categoria === "papel") {
      descripcion =
        [detallePapel?.producto.descripcion_papel, detallePapel?.producto.medida]
          .filter(Boolean)
          .join(" - ") || "Producto de papel";
      payload = {
        categoria: "papel",
        idproducto_papel: payloadPrecio.papel.idproducto_papel,
        idgrupo_papel: payloadPrecio.papel.idgrupo_papel,
        cantidad: payloadPrecio.cantidad,
        acabados: {
          tintas_frente: tintasFrente,
          tintas_dentro: tintasDentro,
          idcat_laminado: idLaminadoSeleccionado,
          idfoil: idFoilSeleccionado,
          idcat_textura: idTexturaSeleccionada,
          id_asa: idAsaSeleccionada,
          alto_relieve: altoRelieve,
          uv,
        },
      };
    } else {
      descripcion = detallePlastico?.producto.medida || "Producto de plástico";
      payload = {
        categoria: "plastico",
        idconfiguracion_plastico: idMedidaSeleccionada as number,
        cantidad: payloadPrecio.cantidad,
        tintasId: idTintasPlastico as number,
      };
    }

    const materialNombre =
      detallePapel?.grupos.find((g) => g.idgrupo_papel === idGrupoSeleccionado)?.material ??
      detallePlastico?.producto.material ??
      null;
    const asaNombre = detallePapel?.asas.find((a) => a.id === idAsaSeleccionada)?.nombre ?? null;
    const laminadoNombre = detallePapel?.laminados.find((l) => l.id === idLaminadoSeleccionado)?.nombre ?? null;
    const texturaNombre = detallePapel?.texturas.find((t) => t.id === idTexturaSeleccionada)?.nombre ?? null;
    const foilNombre = detallePapel?.foils.find((f) => f.id === idFoilSeleccionado)?.nombre ?? null;
    const tintasCantidad = detallePlastico?.tintas.find((t) => t.id === idTintasPlastico)?.cantidad ?? null;

    const idLocal = generarIdLocal();

    return {
      item: {
        idLocal,
        descripcion,
        cantidad: cantidad as number,
        precioUnitario: precio.precio_unitario,
        payload,
        materialNombre,
        asaNombre,
        laminadoNombre,
        texturaNombre,
        foilNombre,
        tintasCantidad,
      },
      configuracion: {
        categoria,
        idTipoSeleccionado: idTipoSeleccionado as number,
        idMedidaSeleccionada: idMedidaSeleccionada as number,
        idGrupoSeleccionado,
        idAsaSeleccionada,
        idLaminadoSeleccionado,
        idTexturaSeleccionada,
        idFoilSeleccionado,
        altoRelieve,
        uv,
        tintasFrente,
        tintasDentro,
        idTintasPlastico,
        idCintaSeguridadSeleccionada,
        cantidad,
      },
    };
  };

  const handleAgregarAlCarrito = () => {
    const resultado = construirItemDesdeConfiguracionActual();
    if (!resultado) return;
    const { item, configuracion } = resultado;
    setCarrito((prev) => [...prev, item]);
    setConfiguracionesCarrito((prev) => ({ ...prev, [item.idLocal]: configuracion }));
    resetearConfiguracion();
  };

  const quitarDelCarrito = (idLocal: string) => {
    setCarrito((prev) => prev.filter((item) => item.idLocal !== idLocal));
    setConfiguracionesCarrito((prev) => {
      const { [idLocal]: _quitado, ...resto } = prev;
      return resto;
    });
  };

  // Restaura en el wizard, tal cual, la selección con la que se agregó este
  // producto — para poder corregir cantidad, tintas, acabados, etc. — y lo
  // quita del carrito mientras tanto (se vuelve a agregar al terminar).
  const editarItemCarrito = (idLocal: string) => {
    const configuracion = configuracionesCarrito[idLocal];
    if (!configuracion) return;

    setCarrito((prev) => prev.filter((item) => item.idLocal !== idLocal));
    setConfiguracionesCarrito((prev) => {
      const { [idLocal]: _quitado, ...resto } = prev;
      return resto;
    });

    // Se limpia cualquier otra configuración a medio hacer antes de
    // restaurar esta — así, aunque la categoría termine siendo la misma,
    // el efecto de "cargar tipos" (dependiente de `categoria`) sí se
    // vuelve a disparar al pasar por null.
    resetearConfiguracion();
    idTipoAtajoPendiente.current = configuracion.idTipoSeleccionado;
    idMedidaEdicionPendiente.current = configuracion.idMedidaSeleccionada;
    configuracionRestanteEdicionPendiente.current = configuracion;

    setCarritoAbierto(false);
    setCategoria(configuracion.categoria);
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);

  // ---- Carrito flotante (Fase 4.5) ----
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  // ============================================================
  // Acciones finales — Generar cotización / Convertir a pedido
  // ============================================================
  const [confirmacionAccionPendiente, setConfirmacionAccionPendiente] = useState<AccionFinal | null>(null);
  // Los productos sobre los que realmente se va a ejecutar la acción final —
  // normalmente es el carrito completo, pero en el flujo rápido (un solo
  // producto, sin pasar por el carrito) puede ser carrito + el producto que
  // se está configurando en ese momento. Se guarda en un ref porque la
  // identificación del cliente es un paso async intermedio (modal), y
  // `carrito` como state puede no reflejar todavía el producto recién
  // agregado cuando se lee justo después de un setCarrito.
  const itemsAccionFinalRef = useRef<ItemCarrito[]>([]);

  const iniciarAccionFinal = (accion: AccionFinal, itemsOverride?: ItemCarrito[]) => {
    const items = itemsOverride ?? carrito;
    setGuardadoError(null);
    if (items.length === 0) {
      setGuardadoError(
        accion === "pedido"
          ? "Agrega al menos un producto a tu pedido antes de continuar."
          : "Agrega al menos un producto a tu cotización antes de continuar."
      );
      return;
    }
    itemsAccionFinalRef.current = items;

    // Si ya está identificado, no hace falta pasar por el panel de nuevo —
    // se pide confirmación de una vez, justo antes de crear.
    if (clienteIdentificado) {
      setConfirmacionAccionPendiente(accion);
      return;
    }

    // Si no, primero identificación — la confirmación se pide DESPUÉS de
    // identificarse (ver handleIdentificacionCompletada), justo antes de
    // crear, no antes: pedirla aquí no tenía sentido, porque de cualquier
    // forma el usuario todavía tenía que pasar por todo el formulario.
    setAccionPendiente(accion);
    setPanelIdentificacionAbierto(true);
  };

  // Atajo: agrega el producto que se está configurando ahora mismo (junto
  // con lo que ya hubiera en el carrito) y de una vez arranca la acción
  // final — así, cotizar un solo producto no obliga a pasar por el carrito
  // como paso extra.
  const iniciarAccionRapida = (accion: AccionFinal) => {
    const resultado = construirItemDesdeConfiguracionActual();
    if (!resultado) return;
    const { item, configuracion } = resultado;
    const itemsFinal = [...carrito, item];
    setCarrito(itemsFinal);
    setConfiguracionesCarrito((prev) => ({ ...prev, [item.idLocal]: configuracion }));
    resetearConfiguracion();
    iniciarAccionFinal(accion, itemsFinal);
  };

  const confirmarAccionFinal = () => {
    const accion = confirmacionAccionPendiente;
    setConfirmacionAccionPendiente(null);
    if (!accion || !clienteIdentificado) return;
    ejecutarGuardado(accion, clienteIdentificado, itemsAccionFinalRef.current);
  };

  const ejecutarGuardado = async (
    accion: AccionFinal,
    identificacion: {
      clienteId: number;
      verificado: boolean;
      datosContacto: { empresa: string; telefono: string; correoMostrar: string };
    },
    items: ItemCarrito[]
  ) => {
    setGuardando(true);
    setGuardadoError(null);

    // El carrito se limpia al terminar, así que lo guardamos aparte antes
    // de que eso pase — el PDF se arma con estos mismos productos.
    const carritoUsado = items;

    try {
      const resultado = await crearCotizacionCotizadorLibre({
        clienteId: identificacion.clienteId,
        tipo: accion,
        verificado: identificacion.verificado,
        productos: carritoUsado.map((item) => item.payload),
      });

      setResultadoGuardado({
        no_cotizacion: resultado.no_cotizacion,
        no_pedido: resultado.no_pedido,
        estado: resultado.estado,
        correoDestino: resultado.cliente?.correo ?? null,
        correoEnviado: false,
      });
      // Solo se quitan del carrito los productos que de verdad se acaban de
      // guardar — si algo se agregó al carrito durante el trámite de
      // identificación, no se pierde.
      const idsUsados = new Set(carritoUsado.map((item) => item.idLocal));
      setCarrito((prev) => prev.filter((item) => !idsUsados.has(item.idLocal)));
      setConfiguracionesCarrito((prev) => {
        const resto = { ...prev };
        idsUsados.forEach((id) => delete resto[id]);
        return resto;
      });
      setCarritoAbierto(false);

      // ---- Generar PDF (en el navegador) + descargar + enviar por correo ----
      // Si algo falla aquí, NO se revierte el guardado (ya está hecho y es lo
      // importante) — solo se avisa que el PDF/correo no se pudo procesar.
      try {
        const fechaHoy = new Date().toISOString();
        const folio = resultado.no_pedido || resultado.no_cotizacion || "";
        const nombreArchivo =
          accion === "pedido" ? `Pedido_${folio}.pdf` : `Cotizacion_${folio}.pdf`;

        const blob =
          accion === "pedido"
            ? await generarPdfPedido(
                construirPayloadPdfCotizadorLibrePedido(
                  carritoUsado,
                  resultado.no_pedido || "",
                  resultado.no_cotizacion,
                  fechaHoy,
                  resultado.cliente
                ) as any,
                true,
                true
              )
            : await generarPdfCotizacion(
                construirPayloadPdfCotizadorLibreCotizacion(
                  carritoUsado,
                  resultado.no_cotizacion || "",
                  fechaHoy,
                  resultado.cliente
                ) as any,
                true,
                true
              );

        const pdfBase64 = await blobABase64(blob);

        await enviarPdfCotizadorLibre(resultado.idsolicitud, {
          tipo: accion,
          folio,
          pdfBase64,
          nombreArchivo,
        });

        // Solo se marca como enviado una vez que el backend confirmó que sí
        // se mandó — nunca de forma optimista.
        setResultadoGuardado((prev) => (prev ? { ...prev, correoEnviado: true } : prev));
      } catch (pdfErr) {
        console.error("Error al generar/enviar el PDF:", pdfErr);
        // No bloquea el flujo — la cotización/pedido ya se guardó bien.
        // correoEnviado se queda en false, y la pantalla de confirmación ya
        // avisa que el correo no se pudo mandar (ver más abajo).
      }
    } catch (err: any) {
      console.error("Error al guardar:", err);
      setGuardadoError(
        err?.response?.data?.error ||
          (accion === "pedido"
            ? "No se pudo guardar tu pedido. Intenta de nuevo."
            : "No se pudo guardar tu cotización. Intenta de nuevo.")
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleIdentificacionCompletada = (resultado: {
    clienteId: number;
    verificado: boolean;
    datosContacto: { empresa: string; telefono: string; correoMostrar: string };
  }) => {
    setClienteIdentificado(resultado);
    if (accionPendiente) {
      // Justo aquí es donde debía ir la confirmación: ya identificado,
      // a punto de crear — no antes de empezar todo el formulario.
      setConfirmacionAccionPendiente(accionPendiente);
      setAccionPendiente(null);
    }
  };

  const entrarAlCotizador = () => setVista("wizard");

  // ✅ NUEVO — atajo desde la landing: fija la categoría y deja el tipo
  // "pendiente" (ver idTipoAtajoPendiente arriba) para que se aplique justo
  // cuando el catálogo real de esa categoría termine de cargar — fijarlo
  // aquí directo se perdería, porque el efecto de "cargar tipos al elegir
  // categoría" resetea idTipoSeleccionado a null en cuanto cambia categoria.
  const entrarAlCotizadorConAtajo = (categoriaDestino: CategoriaCotizadorLibre, idTipo: number) => {
    idTipoAtajoPendiente.current = idTipo;
    setCategoria(categoriaDestino);
    setVista("wizard");
  };

  const volverAlInicio = () => {
    setVista("landing");
    resetearConfiguracion();
    setCarrito([]);
    setConfiguracionesCarrito({});
    setResultadoGuardado(null);
    setClienteIdentificado(null);
  };

  // ============================================================
  // LANDING
  // ============================================================
  if (vista === "landing") {
    return (
      <LandingCotizadorLibre
        esClienteExterno={esClienteExterno}
        onComenzar={entrarAlCotizador}
        onSalir={salirDelCotizador}
        onSeleccionarAtajo={entrarAlCotizadorConAtajo}
      />
    );
  }

  // ============================================================
  // CONFIRMACIÓN FINAL (tras guardar exitosamente)
  // ============================================================
  if (resultadoGuardado) {
    return (
      <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-6 py-10">
        <div className={`${TARJETA} p-8 max-w-md w-full text-center flex flex-col gap-4`}>
          <h2 className="text-[19px] font-bold text-[#2f2f2f]">
            {resultadoGuardado.estado === "en_revision"
              ? resultadoGuardado.no_pedido
                ? "Tu pedido quedó en revisión"
                : "Tu cotización quedó en revisión"
              : "¡Todo listo!"}
          </h2>
          {resultadoGuardado.no_cotizacion && (
            <p className="text-[13px] text-[#6a6a6a]">
              Folio de cotización: <b className="text-[#2f2f2f]">{resultadoGuardado.no_cotizacion}</b>
            </p>
          )}
          {resultadoGuardado.no_pedido && (
            <p className="text-[13px] text-[#6a6a6a]">
              Folio de pedido: <b className="text-[#2f2f2f]">{resultadoGuardado.no_pedido}</b>
            </p>
          )}
          {resultadoGuardado.estado === "en_revision" && (
            <p className="text-[13px] text-[#7a5c00] bg-[#fdf8f1] border border-[#e8d9bd] rounded-md p-3">
              Un asesor se pondrá en contacto contigo para confirmar tus datos.
            </p>
          )}
          {resultadoGuardado.correoEnviado && resultadoGuardado.correoDestino && (
            <p className="text-[13px] text-[#2f6b45] bg-[#f1f8f3] border border-[#cde3d5] rounded-md p-3">
              Tu {resultadoGuardado.no_pedido ? "pedido" : "cotización"} fue enviada a{" "}
              <b>{resultadoGuardado.correoDestino}</b>.
            </p>
          )}
          {!resultadoGuardado.correoEnviado && (
            <p className="text-[12px] text-[#8a8a8a]">
              Tu documento ya se descargó en este dispositivo. Si no te llegó por correo, un asesor puede reenviártelo.
            </p>
          )}
          {esClienteExterno && (
            <p className="text-[12px] text-[#7a5c00] bg-[#fdf8f1] border border-[#e8d9bd] rounded-md p-2.5">
              Recuerda que esta es una estimación — un asesor te confirmará especificaciones y precio final.
            </p>
          )}
          <button
            onClick={volverAlInicio}
            className="bg-[#b8823c] text-white rounded-md py-3 text-[14px] font-semibold mt-2 hover:bg-[#a5732f] transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // WIZARD
  // ============================================================
  const medidaSel = medidas.find((m) => m.id === idMedidaSeleccionada);
  const tipoSel = tipos.find((t) => t.id === idTipoSeleccionado);
  const imagenMedidaSel = medidaSel && "imagenUrl" in medidaSel ? medidaSel.imagenUrl : null;
  const descripcionMedidaSel =
    medidaSel && "descripcion_papel" in medidaSel
      ? medidaSel.descripcion_papel
      : medidaSel && "descripcion" in medidaSel
      ? (medidaSel as any).descripcion
      : null;
  const imagenMostrar = imagenMedidaSel || tipoSel?.imagenUrl || null;

  const materialNombreSel =
    detallePapel?.grupos.find((g) => g.idgrupo_papel === idGrupoSeleccionado)?.material ??
    detallePlastico?.producto.material ??
    null;
  const asaNombreSel = detallePapel?.asas.find((a) => a.id === idAsaSeleccionada)?.nombre ?? null;
  const acabadosSel = [
    detallePapel?.laminados.find((l) => l.id === idLaminadoSeleccionado)?.nombre,
    detallePapel?.texturas.find((t) => t.id === idTexturaSeleccionada)?.nombre,
    detallePapel?.foils.find((f) => f.id === idFoilSeleccionado)?.nombre,
    uv ? "Barniz UV" : null,
    altoRelieve ? "Relieve" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-[#f4f4f4] pb-24 sm:pb-24 lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:flex lg:flex-col lg:pb-0">
      {/* Barra superior: migas de pan */}
      <div className="shrink-0 sticky top-0 z-20 bg-white border-b border-[#e4e4e4] px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-[15px]">
          <button
            onClick={volverAlInicio}
            className="text-[#b8823c] font-semibold hover:underline"
          >
            Cotizaciones
          </button>
          <span className="text-[#cfcfcf]">/</span>
          <span className="font-semibold text-[#2f2f2f]">Nueva cotización</span>
        </div>
        <div className="flex items-center gap-3">
          {carrito.length > 0 && (
            <span className="bg-[#fdf8f1] border border-[#e0c9a3] text-[#8a5f1c] text-[12px] font-bold px-3 py-1 rounded-full">
              {carrito.length} en cotización
            </span>
          )}
          <button
            onClick={salirDelCotizador}
            className="text-[12px] text-[#8a8a8a] hover:text-[#b8823c] font-semibold transition-colors"
            title={esClienteExterno ? "Cerrar sesión" : "Volver al inicio"}
          >
            {esClienteExterno ? "Salir" : "Volver a inicio"}
          </button>
        </div>
      </div>

      {/* Datos del prospecto — solo cuando el cliente ya se identificó */}
      {clienteIdentificado && (
        <div className="shrink-0 px-4 sm:px-6 pt-4">
          <div className={`${TARJETA} px-5 py-3.5 flex flex-wrap items-center gap-y-3`}>
            <Dato etiqueta="Prospecto:" valor={clienteIdentificado.datosContacto.empresa || "—"} />
            <Separador />
            <Dato etiqueta="WhatsApp:" valor={clienteIdentificado.datosContacto.telefono || "—"} />
            <Separador />
            <Dato etiqueta="Email:" valor={clienteIdentificado.datosContacto.correoMostrar || "—"} />
            <Separador />
            <div className="flex items-center gap-2.5 px-5">
              <span className="text-[13px] text-[#6a6a6a]">Estado:</span>
              <span
                className={`text-[13px] font-bold px-3 py-1 rounded-md border ${
                  clienteIdentificado.verificado
                    ? "border-[#b8823c] text-[#8a5f1c] bg-[#fdf8f1]"
                    : "border-[#e4e4e4] text-[#8a8a8a] bg-white"
                }`}
              >
                {clienteIdentificado.verificado ? "Verificado" : "En revisión"}
              </span>
            </div>
            {/* ✅ NUEVO — antes, una vez identificado, no había ninguna forma
                de corregir/cambiar esos datos (ni reabrir el panel). */}
            <button
              onClick={() => {
                setClienteIdentificado(null);
                setPanelIdentificacionAbierto(true);
              }}
              className="text-[13px] font-semibold text-[#1e3a2b] hover:underline ml-auto"
            >
              ✏️ Cambiar datos
            </button>
          </div>
        </div>
      )}

      {esClienteExterno && (
        <div className="shrink-0 px-4 sm:px-6 pt-4">
          <p className="text-[12px] text-[#7a5c00] bg-[#fdf8f1] border border-[#e8d9bd] rounded-md px-4 py-2.5">
            Esta es una cotización estimada — las especificaciones o el precio final pueden variar
            ligeramente al confirmarse con un asesor.
          </p>
        </div>
      )}

      <div className="px-4 sm:px-6 py-4 lg:py-5 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:h-full lg:min-h-0">
          {/* ---------- Columna 1 ---------- */}
          <div className={`flex flex-col gap-4 lg:col-start-1 lg:row-start-1 [&>*]:shrink-0 ${SCROLL_COL}`}>
            {/* Producto: categoría + tipo (pasos previos, sin numerar) */}
            <div className={`${TARJETA} p-5`}>
              <h2 className={TITULO}>Producto</h2>
              <p className={ETIQUETA}>Categoría</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(["papel", "plastico"] as CategoriaCotizadorLibre[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoria(c)}
                    className={`rounded-md border px-3 py-2.5 text-[13px] font-semibold capitalize transition-colors ${
                      categoria === c
                        ? "border-[#b8823c] bg-[#fdf8f1] text-[#2f2f2f]"
                        : "border-[#e4e4e4] bg-white text-[#5a5a5a] hover:border-[#c9b18d]"
                    }`}
                  >
                    {c === "papel" ? "Papel" : "Plástico"}
                  </button>
                ))}
              </div>

              {categoria && (
                <>
                  <p className={ETIQUETA}>Tipo de producto</p>
                  {tiposLoading && <p className={TEXTO_MUDO}>Cargando opciones...</p>}
                  {tiposError && <p className={TEXTO_ERROR}>{tiposError}</p>}
                  {!tiposLoading && !tiposError && (
                    <div className="grid grid-cols-2 gap-2">
                      {tipos.map((tipo) => (
                        <button
                          key={tipo.id}
                          onClick={() => setIdTipoSeleccionado(tipo.id)}
                          className={`rounded-md border px-2.5 py-2 flex items-center gap-2 text-left text-[12px] font-semibold transition-colors ${
                            idTipoSeleccionado === tipo.id
                              ? "border-[#b8823c] bg-[#fdf8f1] text-[#2f2f2f]"
                              : "border-[#e4e4e4] bg-white text-[#5a5a5a] hover:border-[#c9b18d]"
                          }`}
                        >
                          {tipo.imagenUrl ? (
                            <img
                              src={tipo.imagenUrl}
                              alt=""
                              className="w-8 h-8 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <span className="w-8 h-8 rounded bg-[#f1efea] flex-shrink-0" />
                          )}
                          <span className="leading-snug">{tipo.nombre}</span>
                        </button>
                      ))}
                      {tipos.length === 0 && (
                        <p className={`${TEXTO_MUDO} col-span-full`}>
                          No hay opciones disponibles en este momento.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 1. Medida */}
            {idTipoSeleccionado && (
              <div className={`${TARJETA} p-5`}>
                <h2 className={TITULO}>1. Selecciona la medida</h2>
                <p className={ETIQUETA}>Medidas disponibles</p>
                {medidasLoading && <p className={TEXTO_MUDO}>Cargando medidas...</p>}
                {medidasError && <p className={TEXTO_ERROR}>{medidasError}</p>}
                {!medidasLoading && !medidasError && (
                  <div className="flex flex-col gap-2">
                    {medidas.map((m) => {
                      // descripcion_papel (papel) y descripcion (plástico) son
                      // los mismos datos con distinto nombre de columna.
                      const descripcion =
                        "descripcion_papel" in m
                          ? m.descripcion_papel
                          : "descripcion" in m
                          ? (m as any).descripcion
                          : null;
                      const imagenUrl = "imagenUrl" in m ? m.imagenUrl : null;
                      const activo = idMedidaSeleccionada === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setIdMedidaSeleccionada(m.id)}
                          disabled={!m.medida}
                          className={`relative rounded-md border px-2.5 py-2.5 text-left flex items-center gap-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            activo
                              ? "border-[#b8823c] bg-white"
                              : "border-[#e4e4e4] bg-white hover:border-[#c9b18d]"
                          }`}
                        >
                          {imagenUrl ? (
                            <img
                              src={imagenUrl}
                              alt=""
                              className="w-11 h-11 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <span className="w-11 h-11 rounded bg-[#f1efea] flex-shrink-0" />
                          )}
                          <span className="min-w-0">
                            <span className="block text-[14px] font-semibold text-[#2f2f2f]">
                              {m.medida ?? "Medida sin datos"}
                            </span>
                            {descripcion && (
                              <span className="block text-[11px] text-[#8a8a8a] mt-0.5 truncate">
                                {descripcion}
                              </span>
                            )}
                          </span>
                          {activo && (
                            <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-[#b8823c] text-white text-[10px] font-bold flex items-center justify-center">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {medidas.length === 0 && (
                      <p className={TEXTO_MUDO}>
                        No hay medidas disponibles para este tipo todavía.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------- Columna 2: vista previa ---------- */}
          <div className={`${TARJETA} p-5 lg:col-start-2 lg:row-start-1 ${SCROLL_COL}`}>
            <h2 className={TITULO}>2. Vista previa del producto</h2>
            {!idMedidaSeleccionada ? (
              <div className="bg-[#f7f6f4] rounded-md aspect-square flex items-center justify-center text-center p-8">
                <p className="text-[13px] text-[#9a9a9a] max-w-[220px]">
                  Selecciona una categoría, un tipo y una medida para ver la vista previa.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="bg-[#f7f6f4] rounded-md aspect-square overflow-hidden flex items-center justify-center">
                  {imagenMostrar ? (
                    <img src={imagenMostrar} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[12px] tracking-widest uppercase text-[#b3b3b3]">
                      sin imagen
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b8823c]">
                    Medida seleccionada
                  </p>
                  <p className="text-[26px] leading-tight font-bold text-[#2f2f2f] mt-1.5">
                    {medidaSel?.medida ?? "—"}
                  </p>
                  {descripcionMedidaSel && (
                    <p className="text-[13px] text-[#8a8a8a] mt-1">{descripcionMedidaSel}</p>
                  )}
                </div>
                {detallePapel && detallePapel.grupos.length > 0 && (
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-[#4a4a4a] mb-2.5">
                      Material recomendado:
                    </p>
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {detallePapel.grupos.slice(0, 3).map((g) => (
                        <span
                          key={g.idgrupo_papel}
                          className="border border-[#e0c9a3] bg-white px-4 py-2 rounded-md text-[13px] font-medium text-[#4a4a4a]"
                        >
                          {g.material ?? "Material"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------- Columna 3: personalización + resumen ---------- */}
          <div className={`flex flex-col gap-4 lg:col-start-3 lg:row-start-1 [&>*]:shrink-0 ${SCROLL_COL}`}>
            {/* 3. Personaliza */}
            {idMedidaSeleccionada && (
              <div className={`${TARJETA} p-5`}>
                <h2 className={TITULO}>3. Personaliza tu producto</h2>

                {detalleLoading && <p className={TEXTO_MUDO}>Cargando opciones...</p>}
                {detalleError && <p className={TEXTO_ERROR}>{detalleError}</p>}

                {!detalleLoading && detallePapel && (
                  <div className="flex flex-col gap-5">
                    {/* Material */}
                    <div>
                      <p className={SUBTITULO}>Material</p>
                      {detallePapel.grupos.length === 0 ? (
                        <p className={TEXTO_MUDO}>Este producto no tiene materiales configurados.</p>
                      ) : (
                        <div className="border border-[#e4e4e4] rounded-md p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {detallePapel.grupos.map((g) => (
                            <button
                              key={g.idgrupo_papel}
                              onClick={() => setIdGrupoSeleccionado(g.idgrupo_papel)}
                              className={filaRadio(idGrupoSeleccionado === g.idgrupo_papel)}
                            >
                              <Radio activo={idGrupoSeleccionado === g.idgrupo_papel} />
                              {g.imagenUrl && (
                                <img
                                  src={g.imagenUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <span className="truncate">{g.material ?? "Material"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tipo de asa */}
                    {detallePapel.asas.length > 0 && (
                      <div>
                        <p className={SUBTITULO}>Tipo de asa</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {detallePapel.asas.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => setIdAsaSeleccionada(a.id)}
                              className={cajaOpcion(idAsaSeleccionada === a.id)}
                            >
                              {a.imagenUrl ? (
                                <img
                                  src={a.imagenUrl}
                                  alt=""
                                  className="w-full h-12 object-contain"
                                />
                              ) : (
                                <span className="w-full h-12 rounded bg-[#f1efea]" />
                              )}
                              <span className="flex items-center gap-1.5 w-full justify-center">
                                <Radio activo={idAsaSeleccionada === a.id} />
                                <span className="text-[12px] font-medium text-[#4a4a4a] truncate">
                                  {a.nombre}
                                </span>
                              </span>
                            </button>
                          ))}
                          <button
                            onClick={() => setIdAsaSeleccionada(null)}
                            className={cajaOpcion(idAsaSeleccionada === null)}
                          >
                            <span className="w-full h-12 flex items-center justify-center">
                              <span className="w-9 h-9 rounded-full border-2 border-[#c4c4c4]" />
                            </span>
                            <span className="flex items-center gap-1.5 w-full justify-center">
                              <Radio activo={idAsaSeleccionada === null} />
                              <span className="text-[12px] font-medium text-[#4a4a4a]">Sin asa</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Acabados — cada tipo en su propia sección */}
                    {detallePapel.laminados.length > 0 && (
                      <div>
                        <p className={SUBTITULO}>Laminado</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detallePapel.laminados.map((l) => {
                            const activo = idLaminadoSeleccionado === l.id;
                            return (
                              <button
                                key={`lam-${l.id}`}
                                onClick={() => setIdLaminadoSeleccionado(activo ? null : l.id)}
                                className={filaCasilla(activo)}
                              >
                                <Casilla activo={activo} />
                                {l.imagenUrl && (
                                  <img
                                    src={l.imagenUrl}
                                    alt=""
                                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <span className="truncate">{l.nombre}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {detallePapel.acabadosPermitidos.textura &&
                      detallePapel.texturas.length > 0 && (
                        <div>
                          <p className={SUBTITULO}>
                            Textura <span className="font-normal text-[#8a8a8a]">(opcional)</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {detallePapel.texturas.map((t) => {
                              const activo = idTexturaSeleccionada === t.id;
                              return (
                                <button
                                  key={`tex-${t.id}`}
                                  onClick={() => setIdTexturaSeleccionada(activo ? null : t.id)}
                                  className={filaCasilla(activo)}
                                >
                                  <Casilla activo={activo} />
                                  {t.imagenUrl && (
                                    <img
                                      src={t.imagenUrl}
                                      alt=""
                                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <span className="truncate">{t.nombre}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {detallePapel.acabadosPermitidos.hot_stamping &&
                      detallePapel.foils.length > 0 && (
                        <div>
                          <p className={`${SUBTITULO} flex items-center gap-2`}>
                            {detallePapel.imagenesGlobales.hotStamping && (
                              <img
                                src={detallePapel.imagenesGlobales.hotStamping}
                                alt=""
                                className="w-7 h-7 rounded object-cover flex-shrink-0"
                              />
                            )}
                            <span>
                              Hot stamping / Foil{" "}
                              <span className="font-normal text-[#8a8a8a]">(opcional)</span>
                            </span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {detallePapel.foils.map((f) => {
                              const activo = idFoilSeleccionado === f.id;
                              return (
                                <button
                                  key={`foil-${f.id}`}
                                  onClick={() => setIdFoilSeleccionado(activo ? null : f.id)}
                                  className={filaCasilla(activo)}
                                >
                                  <Casilla activo={activo} />
                                  {f.imagenUrl && (
                                    <img
                                      src={f.imagenUrl}
                                      alt=""
                                      className="w-6 h-6 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <span className="truncate">{f.nombre}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {(detallePapel.acabadosPermitidos.uv ||
                      detallePapel.acabadosPermitidos.alto_relieve) && (
                      <div>
                        <p className={SUBTITULO}>Otros acabados</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detallePapel.acabadosPermitidos.uv && (
                            <button onClick={() => setUv(!uv)} className={filaCasilla(uv)}>
                              <Casilla activo={uv} />
                              {detallePapel.imagenesGlobales.uv && (
                                <img
                                  src={detallePapel.imagenesGlobales.uv}
                                  alt=""
                                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <span>Barniz UV</span>
                            </button>
                          )}
                          {detallePapel.acabadosPermitidos.alto_relieve && (
                            <button
                              onClick={() => setAltoRelieve(!altoRelieve)}
                              className={filaCasilla(altoRelieve)}
                            >
                              <Casilla activo={altoRelieve} />
                              {detallePapel.imagenesGlobales.altoRelieve && (
                                <img
                                  src={detallePapel.imagenesGlobales.altoRelieve}
                                  alt=""
                                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <span>Relieve</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tintas */}
                    <div>
                      <p className={SUBTITULO}>Tintas</p>
                      <div className="flex flex-wrap gap-4">
                        <SelectorCantidadTintas
                          etiqueta="Frente (0-6)"
                          valor={tintasFrente}
                          onChange={setTintasFrente}
                        />
                        <SelectorCantidadTintas
                          etiqueta="Dentro (0-6)"
                          valor={tintasDentro}
                          onChange={setTintasDentro}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!detalleLoading && detallePlastico && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <p className={SUBTITULO}>Número de tintas</p>
                      <div className="flex gap-1.5">
                        {detallePlastico.tintas
                          .filter((t) => t.cantidad !== null && t.cantidad <= 4)
                          .map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setIdTintasPlastico(t.id)}
                              className={pildoraNumero(idTintasPlastico === t.id)}
                            >
                              {t.cantidad}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Cinta de seguridad — obligatoria en bolsa envíos, mismo
                        criterio de detección que el backend (esBolsaDeEnvios).
                        Sin elegir una cinta aquí, payloadPrecio se queda en
                        null y no se calcula ningún precio. */}
                    {requiereCintaSeguridad && (
                      <div>
                        <p className={SUBTITULO}>
                          Cinta de seguridad{" "}
                          <span className="font-normal text-[#8a8a8a]">(obligatoria en bolsa envíos)</span>
                        </p>
                        {cintasSeguridad.length === 0 ? (
                          <p className={TEXTO_MUDO}>
                            No hay cintas de seguridad disponibles en este momento.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cintasSeguridad.map((cinta) => (
                              <button
                                key={cinta.id}
                                onClick={() => setIdCintaSeguridadSeleccionada(cinta.id)}
                                className={filaCasilla(idCintaSeguridadSeleccionada === cinta.id)}
                              >
                                <Radio activo={idCintaSeguridadSeleccionada === cinta.id} />
                                {cinta.imagenUrl && (
                                  <img
                                    src={cinta.imagenUrl}
                                    alt=""
                                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <span className="truncate">
                                  {cinta.nombre}
                                  {cinta.medida && (
                                    <span className="text-[11px] text-[#8a8a8a]"> · {cinta.medida}</span>
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. Cantidad — junto al resumen, dentro de la columna 3 */}
            {idMedidaSeleccionada && (
              <div className={`${TARJETA} p-5`}>
                <h2 className={TITULO}>4. Selecciona la cantidad</h2>
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className={ETIQUETA}>Cantidades sugeridas</p>
                    <div className="flex flex-wrap gap-2.5">
                      {(categoria === "plastico" && cantidadMinimaPlastico
                        ? [0, 500, 1000, 1500, 2000].map((extra) => cantidadMinimaPlastico + extra)
                        : [500, 1000, 3000, 5000, 10000]
                      ).map((c) => (
                        <button
                          key={c}
                          onClick={() => setCantidad(c)}
                          className={`rounded-md border px-4 py-2.5 text-[13px] transition-colors ${
                            cantidad === c
                              ? "border-[#b8823c] bg-white text-[#2f2f2f] font-bold"
                              : "border-[#e4e4e4] bg-white text-[#4a4a4a] font-medium hover:border-[#c9b18d]"
                          }`}
                        >
                          {c.toLocaleString()} pzas
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={ETIQUETA}>Cantidad personalizada</p>
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej. 2,500"
                        value={cantidad ?? ""}
                        onChange={(e) => {
                          const soloDigitos = e.target.value.replace(/[^0-9]/g, "");
                          setCantidad(soloDigitos === "" ? null : Number(soloDigitos));
                        }}
                        className={`${CAMPO} w-full pr-12`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#a5a5a5]">
                        pzas
                      </span>
                    </div>
                  </div>
                </div>
                {categoria === "plastico" && cantidadMinimaPlastico && (
                  <p className="text-[11px] text-[#8a8a8a] mt-3">
                    Este producto requiere un mínimo de {cantidadMinimaPlastico.toLocaleString()} piezas
                    (equivalente a {PESO_MINIMO_KG_PLASTICO} kg) para poder cotizarse.
                  </p>
                )}
                {cantidad !== null && !cantidadValida && (
                  <p className={`${TEXTO_ERROR} mt-2`}>
                    La cantidad mínima para este producto es {cantidadMinimaActual?.toLocaleString()} piezas.
                  </p>
                )}
              </div>
            )}

            {/* Resumen de tu cotización */}
            {idMedidaSeleccionada && (
              <div className={`${TARJETA} p-5`}>
                <h2 className={TITULO}>Resumen de tu cotización</h2>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <FilaResumen
                      etiqueta="Producto:"
                      valor={
                        tipoSel?.nombre ??
                        (categoria === "papel" ? "Producto de papel" : "Producto de plástico")
                      }
                    />
                    <FilaResumen etiqueta="Medida:" valor={medidaSel?.medida ?? "—"} />
                    <FilaResumen etiqueta="Material:" valor={materialNombreSel ?? "—"} />
                    {categoria === "papel" && (
                      <FilaResumen etiqueta="Asa:" valor={asaNombreSel ?? "Sin asa"} />
                    )}
                    {categoria === "papel" && (
                      <FilaResumen
                        etiqueta="Acabados:"
                        valor={acabadosSel.length > 0 ? acabadosSel.join(", ") : "Sin acabados"}
                      />
                    )}
                    {categoria === "plastico" && (
                      <FilaResumen
                        etiqueta="Tintas:"
                        valor={
                          detallePlastico?.tintas.find((t) => t.id === idTintasPlastico)?.cantidad?.toString() ??
                          "—"
                        }
                      />
                    )}
                    <FilaResumen
                      etiqueta="Cantidad:"
                      valor={cantidad ? `${cantidad.toLocaleString()} pzas` : "—"}
                    />
                  </div>
                  {imagenMostrar && (
                    <img
                      src={imagenMostrar}
                      alt=""
                      className="w-20 h-24 object-contain flex-shrink-0"
                    />
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-[#eeeeee]">
                  {!payloadPrecio && (
                    <p className={TEXTO_MUDO}>
                      Completa la personalización y la cantidad para ver el precio estimado.
                    </p>
                  )}
                  {payloadPrecio && precioLoading && (
                    <p className="text-[14px] font-semibold text-[#8a8a8a]">Calculando precio...</p>
                  )}
                  {payloadPrecio && !precioLoading && precioError && (
                    <p className={TEXTO_ERROR}>{precioError}</p>
                  )}
                  {payloadPrecio && !precioLoading && !precioError && precio && (
                    <>
                      {precio.disponible && precio.precio_unitario !== null ? (
                        <>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="text-[13px] font-bold text-[#2f2f2f]">
                              Precio estimado:
                            </span>
                            <span className="text-[30px] leading-none font-bold text-[#b8823c]">
                              ${precio.precio_unitario.toFixed(2)}
                            </span>
                            <span className="text-[14px] font-semibold text-[#4a4a4a]">MXN / pza</span>
                          </div>
                          <p className="text-[11px] text-[#a08a68] mt-2">
                            *Precio estimado, puede variar según diseño y acabados.
                          </p>
                          {esClienteExterno ? (
                            <div className="mt-4 flex flex-col gap-2">
                              <button
                                onClick={handleAgregarAlCarrito}
                                disabled={guardando}
                                className="w-full bg-[#177f0e] hover:bg-[#136b0c] text-white font-semibold px-6 py-3 rounded-md transition-colors disabled:opacity-50"
                              >
                                + Añadir a cotización
                              </button>
                              <button
                                onClick={() => iniciarAccionRapida("cotizacion")}
                                disabled={guardando}
                                className="w-full border border-[#b8823c] text-[#8a5f1c] font-semibold px-6 py-2.5 rounded-md hover:bg-[#fdf8f1] transition-colors disabled:opacity-50"
                              >
                                {guardando ? "Guardando..." : "Crear cotización"}
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 flex flex-col gap-2">
                              <button
                                onClick={handleAgregarAlCarrito}
                                disabled={guardando}
                                className="w-full bg-[#177f0e] hover:bg-[#136b0c] text-white font-semibold px-6 py-3 rounded-md transition-colors disabled:opacity-50"
                              >
                                + Añadir a cotización o pedido
                              </button>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => iniciarAccionRapida("cotizacion")}
                                  disabled={guardando}
                                  className="flex-1 border border-[#b8823c] text-[#8a5f1c] font-semibold px-4 py-2.5 rounded-md text-[13px] hover:bg-[#fdf8f1] transition-colors disabled:opacity-50"
                                >
                                  {guardando ? "Guardando..." : "Crear cotización"}
                                </button>
                                <button
                                  onClick={() => iniciarAccionRapida("pedido")}
                                  disabled={guardando}
                                  className="flex-1 bg-[#b8823c] text-white font-semibold px-4 py-2.5 rounded-md text-[13px] hover:bg-[#a5732f] transition-colors disabled:opacity-50"
                                >
                                  {guardando ? "Guardando..." : "Crear pedido"}
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px] text-[#8a5f1c] bg-[#fdf8f1] border border-[#e8d9bd] rounded-md px-3 py-2">
                          {precio.mensaje ?? "Precio no disponible por el momento."}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {guardadoError && (
              <div className="bg-[#fdf3f2] border border-[#e8c4bf] rounded-md p-4 text-[13px] text-[#a3392a]">
                {guardadoError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Carrito flotante — botón con el número de productos añadidos.
          Sustituye a la tarjeta fija + barra inferior de antes: al tener
          más de un producto, ya no ocupa espacio permanente en la
          columna 3, solo aparece cuando el usuario quiere revisarlo. */}
      {carrito.length > 0 && !carritoAbierto && (
        <button
          onClick={() => setCarritoAbierto(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 bg-[#b8823c] hover:bg-[#a5732f] text-white font-semibold pl-4 pr-5 py-3 rounded-full shadow-lg transition-colors"
        >
          <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white text-[#8a5f1c] text-[12px] font-bold">
            {carrito.length}
          </span>
          <span className="text-[14px]">Ver cotización</span>
        </button>
      )}

      {/* Panel del carrito — se abre al tocar el botón flotante. Aquí viven
          la lista de productos agregados y las acciones finales
          (Generar cotización / Convertir a pedido), que antes vivían en
          una barra fija siempre visible. */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className={`${TARJETA} w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-b-none sm:rounded-b-lg`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#eeeeee]">
              <h2 className={`${TITULO} mb-0`}>Tu cotización ({carrito.length})</h2>
              <button
                onClick={() => setCarritoAbierto(false)}
                className="text-[13px] font-semibold text-[#8a8a8a] hover:text-[#4a4a4a]"
              >
                Cerrar
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-2">
                {carrito.map((item) => (
                  <div
                    key={item.idLocal}
                    className="flex items-center justify-between border border-[#e4e4e4] rounded-md px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#2f2f2f] truncate">
                        {item.descripcion}
                      </p>
                      <p className="text-[11px] text-[#8a8a8a]">
                        {item.cantidad.toLocaleString()} pzas × ${item.precioUnitario.toFixed(2)} = $
                        {(item.cantidad * item.precioUnitario).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      {configuracionesCarrito[item.idLocal] && (
                        <button
                          onClick={() => editarItemCarrito(item.idLocal)}
                          className="text-[12px] font-semibold text-[#8a5f1c] hover:underline"
                        >
                          Editar
                        </button>
                      )}
                      <button
                        onClick={() => quitarDelCarrito(item.idLocal)}
                        className="text-[12px] font-semibold text-[#b04a3a] hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
                {carrito.length === 0 && (
                  <p className={TEXTO_MUDO}>Tu cotización está vacía.</p>
                )}
              </div>

              {guardadoError && (
                <div className="mt-3 bg-[#fdf3f2] border border-[#e8c4bf] rounded-md p-3 text-[13px] text-[#a3392a]">
                  {guardadoError}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#eeeeee]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-[#6a6a6a]">Total:</span>
                <span className="text-[18px] font-bold text-[#2f2f2f]">
                  ${totalCarrito.toFixed(2)} MXN
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => iniciarAccionFinal("cotizacion")}
                  disabled={guardando}
                  className="w-full border border-[#b8823c] text-[#8a5f1c] font-semibold px-6 py-2.5 rounded-md text-[14px] hover:bg-[#fdf8f1] transition-colors disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Generar cotización"}
                </button>
                {!esClienteExterno && (
                  <button
                    onClick={() => iniciarAccionFinal("pedido")}
                    disabled={guardando}
                    className="w-full bg-[#b8823c] text-white font-semibold px-6 py-2.5 rounded-md text-[14px] hover:bg-[#a5732f] transition-colors disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : "Convertir a pedido"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <IdentificacionCliente
        abierto={panelIdentificacionAbierto}
        esInterno={!esClienteExterno}
        onCerrar={() => {
          setPanelIdentificacionAbierto(false);
          setAccionPendiente(null);
        }}
        onCompletado={handleIdentificacionCompletada}
      />

      {/* Confirmación antes de generar — cotización y pedido son acciones
          distintas (un pedido no se puede deshacer tan fácil), así que
          ambas piden confirmación explícita antes de ejecutarse. */}
      {confirmacionAccionPendiente && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className={`${TARJETA} p-6 max-w-sm w-full flex flex-col gap-3`}>
            <h3 className="text-[16px] font-bold text-[#2f2f2f]">
              {confirmacionAccionPendiente === "pedido"
                ? "¿Confirmas convertir a pedido?"
                : "¿Confirmas generar la cotización?"}
            </h3>
            {clienteIdentificado && (
              <p className="text-[13px] text-[#6a6a6a]">
                Cliente:{" "}
                <span className="font-semibold text-[#2f2f2f]">
                  {clienteIdentificado.datosContacto.empresa || clienteIdentificado.datosContacto.correoMostrar || "—"}
                </span>
              </p>
            )}
            <p className="text-[13px] text-[#6a6a6a]">
              {confirmacionAccionPendiente === "pedido"
                ? "Esto va a generar un pedido en firme con los productos de tu carrito."
                : "Esto va a generar una cotización con los productos de tu carrito."}
              {" "}({carrito.length} {carrito.length === 1 ? "producto" : "productos"}, total $
              {totalCarrito.toFixed(2)} MXN)
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    // "Cancelar" aquí no solo cierra el modal — regresa al
                    // panel de identificación para poder corregir los
                    // datos o elegir otro cliente, no solo agregar otro
                    // producto sin tocar el cliente equivocado.
                    setConfirmacionAccionPendiente(null);
                    setClienteIdentificado(null);
                    setPanelIdentificacionAbierto(true);
                  }}
                  className="px-4 py-2 rounded-md border border-[#e4e4e4] text-[#4a4a4a] text-[13px] font-semibold hover:bg-[#f4f4f4] transition-colors"
                >
                  Cancelar y corregir cliente
                </button>
                <button
                  onClick={confirmarAccionFinal}
                  className={`px-4 py-2 rounded-md text-white text-[13px] font-semibold transition-colors ${
                    confirmacionAccionPendiente === "pedido"
                      ? "bg-[#b8823c] hover:bg-[#a5732f]"
                      : "bg-[#2f2f2f] hover:bg-[#1c1c1c]"
                  }`}
                >
                  {confirmacionAccionPendiente === "pedido" ? "Sí, convertir a pedido" : "Sí, generar cotización"}
                </button>
              </div>
              <button
                onClick={() => setConfirmacionAccionPendiente(null)}
                className="text-[12px] text-[#8a8a8a] hover:text-[#4a4a4a] text-center"
              >
                Solo cerrar (el cliente actual queda igual)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
