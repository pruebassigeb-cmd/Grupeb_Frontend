// src/pages/cotizadorLibre/CotizadorLibre.tsx
import { useEffect, useMemo, useState } from "react";
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
import type {
  CategoriaCotizadorLibre,
  TipoCatalogoItem,
  MedidaPapelItem,
  MedidaPlasticoItem,
  DetalleProductoPapelResponse,
  DetalleProductoPlasticoResponse,
} from "../../types/cotizadorLibre/cotizadorLibre.types";
import type { CalcularPrecioCotizadorLibrePayload } from "../../services/cotizadorLibre/cotizadorLibrePrecio.service";
import type {
  ItemCarrito,
  ProductoGuardadoInput,
} from "../../types/cotizadorLibre/cotizadorLibreCotizaciones.types";

type Vista = "landing" | "wizard";
type AccionFinal = "cotizacion" | "pedido";

// El cargo por asa solo aplica si el nombre de la opción contiene "listón"
// — misma regla de negocio ya usada en la herramienta interna
// (useCalculoPrecioPapel.ts). No es un booleano libre: depende del nombre.
const esAsaDeListon = (nombre: string | null): boolean =>
  String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes("liston");

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

export default function CotizadorLibre() {
  const { user, logout } = useAuth();
  // El cliente externo (cuenta compartida cotizacionlibre@grupoeb.com) solo
  // puede generar cotizaciones — nunca pedidos directos. Staff interno
  // usando esta misma pantalla con su propia cuenta sí puede ambos.
  const esClienteExterno = user?.rol === "CotizadorLibre";

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

  // ---- Paso 5: Cantidad ----
  const [cantidad, setCantidad] = useState<number | null>(null);

  // ---- Carrito (Fase 4.5) ----
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

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
  useEffect(() => {
    if (!categoria) return;

    setTipos([]);
    setIdTipoSeleccionado(null);
    setMedidas([]);
    setIdMedidaSeleccionada(null);
    setTiposError(null);
    setTiposLoading(true);

    getTiposCotizadorLibre(categoria)
      .then(setTipos)
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
      .then(setMedidas)
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
    setCantidad(null);
    setDetalleLoading(true);

    if (categoria === "papel") {
      getDetalleProductoPapelCotizadorLibre(idMedidaSeleccionada)
        .then((data) => {
          setDetallePapel(data);
          if (data.grupos.length === 1) setIdGrupoSeleccionado(data.grupos[0].idgrupo_papel);
        })
        .catch((err) => {
          console.error("Error al cargar detalle:", err);
          setDetalleError("No se pudo cargar el detalle del producto.");
        })
        .finally(() => setDetalleLoading(false));
    } else {
      getDetalleProductoPlasticoCotizadorLibre(idMedidaSeleccionada)
        .then(setDetallePlastico)
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

  const cantidadMinimaPlastico = useMemo(() => {
    if (!porKiloPlastico) return null;
    const minimoExacto = PESO_MINIMO_KG_PLASTICO * porKiloPlastico;
    // Redondeado hacia arriba a la centena más cercana — más limpio para
    // mostrar en botones (3438 → 3500, 7620 → 7700) sin bajar del mínimo
    // real necesario para que exista tarifa (nunca redondea hacia abajo).
    return Math.ceil(minimoExacto / 100) * 100;
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
      if (!detallePlastico || idTintasPlastico === null || !porKiloPlastico) return null;

      return {
        categoria: "plastico",
        cantidad,
        plastico: { porKilo: porKiloPlastico, tintasId: idTintasPlastico },
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

  const handleAgregarAlCarrito = () => {
    if (!puedeAgregarAlCarrito || !payloadPrecio || !precio?.precio_unitario) return;

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

    const nuevoItem: ItemCarrito = {
      idLocal: generarIdLocal(),
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
    };

    setCarrito((prev) => [...prev, nuevoItem]);
    resetearConfiguracion();
  };

  const quitarDelCarrito = (idLocal: string) => {
    setCarrito((prev) => prev.filter((item) => item.idLocal !== idLocal));
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + item.precioUnitario * item.cantidad, 0);

  // ============================================================
  // Acciones finales — Generar cotización / Convertir a pedido
  // ============================================================
  const iniciarAccionFinal = (accion: AccionFinal) => {
    setGuardadoError(null);
    if (carrito.length === 0) {
      setGuardadoError("Agrega al menos un producto a tu cotización antes de continuar.");
      return;
    }
    if (clienteIdentificado) {
      ejecutarGuardado(accion, clienteIdentificado);
      return;
    }
    setAccionPendiente(accion);
    setPanelIdentificacionAbierto(true);
  };

  const ejecutarGuardado = async (
    accion: AccionFinal,
    identificacion: {
      clienteId: number;
      verificado: boolean;
      datosContacto: { empresa: string; telefono: string; correoMostrar: string };
    }
  ) => {
    setGuardando(true);
    setGuardadoError(null);

    // El carrito se limpia al terminar, así que lo guardamos aparte antes
    // de que eso pase — el PDF se arma con estos mismos productos.
    const carritoUsado = carrito;

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
      setCarrito([]);

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
      setGuardadoError(err?.response?.data?.error || "No se pudo guardar tu cotización. Intenta de nuevo.");
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
      ejecutarGuardado(accionPendiente, resultado);
      setAccionPendiente(null);
    }
  };

  const entrarAlCotizador = () => setVista("wizard");

  const volverAlInicio = () => {
    setVista("landing");
    resetearConfiguracion();
    setCarrito([]);
    setResultadoGuardado(null);
    setClienteIdentificado(null);
  };

  // ============================================================
  // LANDING
  // ============================================================
  if (vista === "landing") {
    return (
      <div className="min-h-screen bg-[#f7f4ee] flex flex-col">
        <div className="bg-gradient-to-br from-[#1e3a2b] to-[#2d5540] text-white px-8 py-20 flex-1 flex flex-col items-center justify-center text-center relative">
          <button
            onClick={logout}
            className="absolute top-4 right-4 text-xs text-white/70 hover:text-white flex items-center gap-1.5"
            title="Cerrar sesión"
          >
            Salir 🚪
          </button>
          <div className="w-11 h-11 rounded-lg bg-[#e8c99a] text-[#1e3a2b] font-extrabold flex items-center justify-center text-base mb-6">
            EB
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 max-w-xl">
            Diseña el empaque ideal para tu marca
          </h1>
          <p className="text-sm text-[#e8c99a] font-semibold mb-2">
            🌿 En menos de 2 minutos
          </p>
          <p className="text-sm text-white/80 mb-8 max-w-sm">
            Crea, personaliza y cotiza al instante el empaque perfecto para tu negocio.
          </p>
          <button
            onClick={entrarAlCotizador}
            className="bg-[#e8c99a] text-[#1e3a2b] font-bold px-8 py-4 rounded-xl hover:bg-white transition-colors"
          >
            Comenzar →
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // CONFIRMACIÓN FINAL (tras guardar exitosamente)
  // ============================================================
  if (resultadoGuardado) {
    return (
      <div className="min-h-screen bg-[#f7f4ee] flex items-center justify-center px-6">
        <div className="bg-white border border-[#3f7a52] rounded-2xl p-8 max-w-md text-center flex flex-col gap-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-[#1e3a2b]">
            {resultadoGuardado.estado === "en_revision"
              ? "Tu cotización quedó en revisión"
              : "¡Todo listo!"}
          </h2>
          {resultadoGuardado.no_cotizacion && (
            <p className="text-sm text-[#6b6f63]">
              Folio de cotización: <b>{resultadoGuardado.no_cotizacion}</b>
            </p>
          )}
          {resultadoGuardado.no_pedido && (
            <p className="text-sm text-[#6b6f63]">
              Folio de pedido: <b>{resultadoGuardado.no_pedido}</b>
            </p>
          )}
          {resultadoGuardado.estado === "en_revision" && (
            <p className="text-sm text-[#7a5c00] bg-[#fff8e6] border border-[#e8d38a] rounded-lg p-3">
              Un asesor se pondrá en contacto contigo para confirmar tus datos.
            </p>
          )}
          {resultadoGuardado.correoEnviado && resultadoGuardado.correoDestino && (
            <p className="text-sm text-[#3f7a52] bg-[#eafaf0] border border-[#3f7a52] rounded-lg p-3">
              📧 Tu {resultadoGuardado.no_pedido ? "pedido" : "cotización"} fue enviada a{" "}
              <b>{resultadoGuardado.correoDestino}</b>.
            </p>
          )}
          {!resultadoGuardado.correoEnviado && (
            <p className="text-xs text-[#6b6f63]">
              Tu documento ya se descargó en este dispositivo. Si no te llegó por correo, un asesor puede reenviártelo.
            </p>
          )}
          {esClienteExterno && (
            <p className="text-xs text-[#7a5c00] bg-[#fff8e6] border border-[#e8d38a] rounded-lg p-2.5">
              ℹ️ Recuerda que esta es una estimación — un asesor te confirmará especificaciones y precio final.
            </p>
          )}
          <button
            onClick={volverAlInicio}
            className="bg-[#1e3a2b] text-white rounded-lg py-3 font-semibold mt-2"
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
  return (
    <div className="min-h-screen bg-[#f7f4ee] pb-40 sm:pb-28">
      <div className="bg-white border-b border-[#e2ddd0] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={volverAlInicio}
          className="text-sm text-[#6b6f63] hover:text-[#1e3a2b] font-semibold"
        >
          ← Volver al inicio
        </button>
        <span className="text-xs sm:text-sm text-[#6b6f63] flex items-center flex-wrap gap-2 sm:gap-3">
          <span className="hidden sm:inline">Cotizador / </span>
          <b className="text-[#1e3a2b]">Nueva cotización</b>
          {carrito.length > 0 && (
            <span className="bg-[#1e3a2b] text-white text-xs font-bold px-2.5 py-1 rounded-full">
              🛒 {carrito.length}
            </span>
          )}
          <button
            onClick={logout}
            className="text-xs text-[#6b6f63] hover:text-[#1e3a2b]"
            title="Cerrar sesión"
          >
            Salir 🚪
          </button>
        </span>
      </div>

      {esClienteExterno && (
        <div className="bg-[#fff8e6] border-b border-[#e8d38a] px-4 sm:px-6 py-2.5 text-center">
          <p className="text-xs text-[#7a5c00]">
            ℹ️ Esta es una cotización estimada — las especificaciones o el precio final pueden variar ligeramente al confirmarse con un asesor.
          </p>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
      <div className="flex flex-col gap-6">
        {/* Paso 1: Categoría */}
        <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
          <h2 className="text-sm font-bold mb-3">1. ¿Qué tipo de producto buscas?</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setCategoria("papel")}
              className={`flex-1 border rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                categoria === "papel"
                  ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                  : "border-[#e2ddd0] hover:border-[#b8894a]"
              }`}
            >
              🛍️ Papel
            </button>
            <button
              onClick={() => setCategoria("plastico")}
              className={`flex-1 border rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                categoria === "plastico"
                  ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                  : "border-[#e2ddd0] hover:border-[#b8894a]"
              }`}
            >
              🧵 Plástico
            </button>
          </div>
        </div>

        {/* Paso 2: Tipo */}
        {categoria && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">2. Selecciona el tipo</h2>
            {tiposLoading && <p className="text-sm text-[#6b6f63]">Cargando opciones...</p>}
            {tiposError && <p className="text-sm text-red-600">{tiposError}</p>}
            {!tiposLoading && !tiposError && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tipos.map((tipo) => (
                  <button
                    key={tipo.id}
                    onClick={() => setIdTipoSeleccionado(tipo.id)}
                    className={`border rounded-lg p-3 text-sm font-medium transition-colors flex flex-col items-center gap-2 text-center ${
                      idTipoSeleccionado === tipo.id
                        ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                        : "border-[#e2ddd0] hover:border-[#b8894a]"
                    }`}
                  >
                    {tipo.imagenUrl ? (
                      <img
                        src={tipo.imagenUrl}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-[#eee9db] flex items-center justify-center text-2xl">
                        📦
                      </div>
                    )}
                    {tipo.nombre}
                  </button>
                ))}
                {tipos.length === 0 && (
                  <p className="text-sm text-[#6b6f63] col-span-full">
                    No hay opciones disponibles en este momento.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Medida */}
        {idTipoSeleccionado && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">3. Selecciona la medida</h2>
            {medidasLoading && <p className="text-sm text-[#6b6f63]">Cargando medidas...</p>}
            {medidasError && <p className="text-sm text-red-600">{medidasError}</p>}
            {!medidasLoading && !medidasError && (
              <div className="flex flex-col gap-2">
                {medidas.map((m) => {
                  // descripcion_papel e imagenUrl solo existen en medidas de
                  // papel — es lo que distingue dos productos que comparten
                  // exactamente la misma medida (ej. "25+8x28" simple vs
                  // "25+8x28 Troquel Riñón"), ya que nunca se fusionan entre sí.
                  const descripcion = "descripcion_papel" in m ? m.descripcion_papel : null;
                  const imagenUrl = "imagenUrl" in m ? m.imagenUrl : null;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setIdMedidaSeleccionada(m.id)}
                      disabled={!m.medida}
                      className={`border rounded-lg px-4 py-3 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 ${
                        idMedidaSeleccionada === m.id
                          ? "border-[#b8894a] bg-[#fbf3e8]"
                          : "border-[#e2ddd0] hover:border-[#b8894a]"
                      }`}
                    >
                      {imagenUrl && (
                        <img
                          src={imagenUrl}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <span>
                        <span className="font-semibold block">{m.medida ?? "Medida sin datos"}</span>
                        {descripcion && (
                          <span className="block text-xs text-[#6b6f63] mt-0.5">{descripcion}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {medidas.length === 0 && (
                  <p className="text-sm text-[#6b6f63]">
                    No hay medidas disponibles para este tipo todavía.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Columna 2: Vista previa */}
      <div className="flex flex-col gap-6">
        <div className="bg-white border border-[#e2ddd0] rounded-xl p-5 lg:sticky lg:top-24">
          <h2 className="text-sm font-bold mb-3">Vista previa</h2>
          {(() => {
            const medidaSel = medidas.find((m) => m.id === idMedidaSeleccionada);
            const tipoSel = tipos.find((t) => t.id === idTipoSeleccionado);
            const imagenMedida = medidaSel && "imagenUrl" in medidaSel ? medidaSel.imagenUrl : null;
            const descripcionMedida =
              medidaSel && "descripcion_papel" in medidaSel ? medidaSel.descripcion_papel : null;
            const imagenMostrar = imagenMedida || tipoSel?.imagenUrl || null;

            if (!idMedidaSeleccionada) {
              return (
                <div className="aspect-square bg-[#eee9db] rounded-lg flex flex-col items-center justify-center text-center gap-2 text-[#6b6f63] text-sm p-6">
                  <span className="text-4xl">🛍️</span>
                  Selecciona un tipo y una medida para ver la vista previa
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-4">
                <div className="aspect-square bg-[#eee9db] rounded-lg overflow-hidden flex items-center justify-center">
                  {imagenMostrar ? (
                    <img src={imagenMostrar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">🛍️</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase text-[#b8894a] font-bold tracking-wide">
                    Medida seleccionada
                  </p>
                  <p className="text-xl font-extrabold text-[#1e3a2b] mt-1">
                    {medidaSel?.medida ?? "—"}
                  </p>
                  {descripcionMedida && (
                    <p className="text-sm text-[#6b6f63] mt-1">{descripcionMedida}</p>
                  )}
                </div>
                {detallePapel && detallePapel.grupos.length > 0 && (
                  <div>
                    <p className="text-xs uppercase text-[#6b6f63] font-bold mb-2 text-center">
                      Materiales disponibles
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {detallePapel.grupos.map((g) => (
                        <span
                          key={g.idgrupo_papel}
                          className="bg-[#eee9db] border border-[#e2ddd0] px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          {g.material ?? "Material"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Columna 3: Personalización, cantidad y precio */}
      <div className="flex flex-col gap-6">
        {/* Paso 4: Personalización */}
        {idMedidaSeleccionada && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">4. Personaliza tu producto</h2>

            {detalleLoading && <p className="text-sm text-[#6b6f63]">Cargando opciones...</p>}
            {detalleError && <p className="text-sm text-red-600">{detalleError}</p>}

            {!detalleLoading && detallePapel && (
              <div className="flex flex-col gap-5">
                <div>
                  <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                    Material
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {detallePapel.grupos.map((g) => (
                      <button
                        key={g.idgrupo_papel}
                        onClick={() => setIdGrupoSeleccionado(g.idgrupo_papel)}
                        className={`border rounded-lg px-3 py-2 text-sm text-left transition-colors flex items-center gap-2 ${
                          idGrupoSeleccionado === g.idgrupo_papel
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        {g.imagenUrl && (
                          <img src={g.imagenUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                        )}
                        {g.material ?? "Material"}
                      </button>
                    ))}
                    {detallePapel.grupos.length === 0 && (
                      <p className="text-sm text-[#6b6f63] col-span-full">
                        Este producto no tiene materiales configurados.
                      </p>
                    )}
                  </div>
                </div>

                {detallePapel.asas.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                      Tipo de asa
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => setIdAsaSeleccionada(null)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idAsaSeleccionada === null
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        🚫 Sin asa
                      </button>
                      {detallePapel.asas.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setIdAsaSeleccionada(a.id)}
                          className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors flex flex-col items-center gap-1 ${
                            idAsaSeleccionada === a.id
                              ? "border-[#b8894a] bg-[#fbf3e8]"
                              : "border-[#e2ddd0] hover:border-[#b8894a]"
                          }`}
                        >
                          {a.imagenUrl && (
                            <img src={a.imagenUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          )}
                          {a.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {detallePapel.laminados.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                      Laminado
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => setIdLaminadoSeleccionado(null)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idLaminadoSeleccionado === null
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        Sin laminado
                      </button>
                      {detallePapel.laminados.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setIdLaminadoSeleccionado(l.id)}
                          className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors flex flex-col items-center gap-1 ${
                            idLaminadoSeleccionado === l.id
                              ? "border-[#b8894a] bg-[#fbf3e8]"
                              : "border-[#e2ddd0] hover:border-[#b8894a]"
                          }`}
                        >
                          {l.imagenUrl && (
                            <img src={l.imagenUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          )}
                          {l.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {detallePapel.acabadosPermitidos.textura && (
                  <div>
                    <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                      Textura (opcional)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => setIdTexturaSeleccionada(null)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idTexturaSeleccionada === null
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        Sin textura
                      </button>
                      {detallePapel.texturas.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setIdTexturaSeleccionada(t.id)}
                          className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors flex flex-col items-center gap-1 ${
                            idTexturaSeleccionada === t.id
                              ? "border-[#b8894a] bg-[#fbf3e8]"
                              : "border-[#e2ddd0] hover:border-[#b8894a]"
                          }`}
                        >
                          {t.imagenUrl && (
                            <img src={t.imagenUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          )}
                          {t.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {detallePapel.acabadosPermitidos.hot_stamping && (
                  <div>
                    <span className="text-xs font-bold text-[#6b6f63] uppercase mb-2 flex items-center gap-2">
                      {detallePapel.imagenesGlobales.hotStamping && (
                        <img
                          src={detallePapel.imagenesGlobales.hotStamping}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                      )}
                      Hot stamping / Foil (opcional)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => setIdFoilSeleccionado(null)}
                        className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors ${
                          idFoilSeleccionado === null
                            ? "border-[#b8894a] bg-[#fbf3e8]"
                            : "border-[#e2ddd0] hover:border-[#b8894a]"
                        }`}
                      >
                        Sin foil
                      </button>
                      {detallePapel.foils.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setIdFoilSeleccionado(f.id)}
                          className={`border rounded-lg px-3 py-2 text-xs font-semibold text-center transition-colors flex flex-col items-center gap-1 ${
                            idFoilSeleccionado === f.id
                              ? "border-[#b8894a] bg-[#fbf3e8]"
                              : "border-[#e2ddd0] hover:border-[#b8894a]"
                          }`}
                        >
                          {f.imagenUrl && (
                            <img src={f.imagenUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          )}
                          {f.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(detallePapel.acabadosPermitidos.uv || detallePapel.acabadosPermitidos.alto_relieve) && (
                  <div className="flex gap-4">
                    {detallePapel.acabadosPermitidos.uv && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={uv} onChange={(e) => setUv(e.target.checked)} />
                        {detallePapel.imagenesGlobales.uv && (
                          <img src={detallePapel.imagenesGlobales.uv} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        )}
                        UV
                      </label>
                    )}
                    {detallePapel.acabadosPermitidos.alto_relieve && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={altoRelieve}
                          onChange={(e) => setAltoRelieve(e.target.checked)}
                        />
                        {detallePapel.imagenesGlobales.altoRelieve && (
                          <img
                            src={detallePapel.imagenesGlobales.altoRelieve}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover"
                          />
                        )}
                        Alto relieve
                      </label>
                    )}
                  </div>
                )}

                <div className="flex gap-4">
                  <label className="text-sm flex flex-col gap-1">
                    Tintas frente (0-6)
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={tintasFrente}
                      onChange={(e) =>
                        setTintasFrente(Math.min(6, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="border border-[#e2ddd0] rounded-lg px-3 py-2 w-28"
                    />
                  </label>
                  <label className="text-sm flex flex-col gap-1">
                    Tintas dentro (0-6)
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={tintasDentro}
                      onChange={(e) =>
                        setTintasDentro(Math.min(6, Math.max(0, Number(e.target.value) || 0)))
                      }
                      className="border border-[#e2ddd0] rounded-lg px-3 py-2 w-28"
                    />
                  </label>
                </div>
              </div>
            )}

            {!detalleLoading && detallePlastico && (
              <div>
                <span className="text-xs font-bold text-[#6b6f63] uppercase block mb-2">
                  Número de tintas
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {detallePlastico.tintas.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setIdTintasPlastico(t.id)}
                      className={`border rounded-lg px-3 py-2 text-sm font-semibold text-center transition-colors ${
                        idTintasPlastico === t.id
                          ? "border-[#b8894a] bg-[#fbf3e8]"
                          : "border-[#e2ddd0] hover:border-[#b8894a]"
                      }`}
                    >
                      {t.cantidad}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paso 5: Cantidad */}
        {idMedidaSeleccionada && (
          <div className="bg-white border border-[#e2ddd0] rounded-xl p-5">
            <h2 className="text-sm font-bold mb-3">5. Selecciona la cantidad</h2>
            <div className="flex gap-2 flex-wrap mb-3">
              {(categoria === "plastico" && cantidadMinimaPlastico
                ? [0, 500, 1000, 1500, 2000].map((extra) => cantidadMinimaPlastico + extra)
                : [500, 1000, 3000, 5000, 10000]
              ).map((c) => (
                <button
                  key={c}
                  onClick={() => setCantidad(c)}
                  className={`border rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    cantidad === c
                      ? "border-[#b8894a] bg-[#fbf3e8] text-[#1e3a2b]"
                      : "border-[#e2ddd0] hover:border-[#b8894a]"
                  }`}
                >
                  {c.toLocaleString()} pzas
                </button>
              ))}
            </div>
            <input
              type="number"
              min={cantidadMinimaActual ?? 1}
              placeholder="Cantidad personalizada"
              value={cantidad ?? ""}
              onChange={(e) => setCantidad(Number(e.target.value) || null)}
              className="border border-[#e2ddd0] rounded-lg px-4 py-2 text-sm w-56"
            />
            {categoria === "plastico" && cantidadMinimaPlastico && (
              <p className="text-xs text-[#6b6f63] mt-2">
                Este producto requiere un mínimo de {cantidadMinimaPlastico.toLocaleString()} piezas
                (equivalente a {PESO_MINIMO_KG_PLASTICO} kg) para poder cotizarse.
              </p>
            )}
            {cantidad !== null && !cantidadValida && (
              <p className="text-xs text-red-600 mt-1">
                La cantidad mínima para este producto es {cantidadMinimaActual?.toLocaleString()} piezas.
              </p>
            )}
          </div>
        )}

        {/* Precio en vivo + Agregar al carrito */}
        {payloadPrecio && (
          <div className="bg-[#1e3a2b] text-white rounded-xl p-5">
            <p className="text-xs uppercase text-[#e8c99a] font-bold mb-1">Precio estimado</p>
            {precioLoading && <p className="text-2xl font-extrabold">Calculando...</p>}
            {!precioLoading && precioError && <p className="text-sm text-red-300">{precioError}</p>}
            {!precioLoading && !precioError && precio && (
              <>
                {precio.disponible && precio.precio_unitario !== null ? (
                  <>
                    <p className="text-3xl font-extrabold">
                      ${precio.precio_unitario.toFixed(2)}{" "}
                      <span className="text-sm font-medium text-white/70">MXN / pza</span>
                    </p>
                    <button
                      onClick={handleAgregarAlCarrito}
                      className="mt-4 bg-[#e8c99a] text-[#1e3a2b] font-bold px-5 py-3 rounded-lg hover:bg-white transition-colors"
                    >
                      + Agregar a cotización
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-[#e8c99a]">
                    {precio.mensaje ?? "Precio no disponible por el momento."}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Carrito */}
      {carrito.length > 0 && (
        <div className="bg-white border border-[#e2ddd0] rounded-xl p-5 mt-6">
          <h2 className="text-sm font-bold mb-3">Tu cotización ({carrito.length})</h2>
            <div className="flex flex-col gap-2">
              {carrito.map((item) => (
                <div
                  key={item.idLocal}
                  className="flex items-center justify-between border border-[#e2ddd0] rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{item.descripcion}</p>
                    <p className="text-xs text-[#6b6f63]">
                      {item.cantidad.toLocaleString()} pzas × ${item.precioUnitario.toFixed(2)} = $
                      {(item.cantidad * item.precioUnitario).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => quitarDelCarrito(item.idLocal)}
                    className="text-red-600 text-sm font-semibold hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right text-sm font-bold text-[#1e3a2b]">
              Total: ${totalCarrito.toFixed(2)} MXN
            </div>
          </div>
        )}

        {guardadoError && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-700">
            {guardadoError}
          </div>
        )}
      </div>

      {/* Barra de acciones finales */}
      {carrito.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2ddd0] px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <button
            onClick={() => iniciarAccionFinal("cotizacion")}
            disabled={guardando}
            className="w-full sm:w-auto border border-[#1e3a2b] text-[#1e3a2b] font-semibold px-5 py-3 rounded-lg disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Generar cotización"}
          </button>
          {!esClienteExterno && (
            <button
              onClick={() => iniciarAccionFinal("pedido")}
              disabled={guardando}
              className="w-full sm:w-auto bg-[#3f7a52] text-white font-semibold px-5 py-3 rounded-lg disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Convertir a pedido"}
            </button>
          )}
        </div>
      )}

      <IdentificacionCliente
        abierto={panelIdentificacionAbierto}
        onCerrar={() => {
          setPanelIdentificacionAbierto(false);
          setAccionPendiente(null);
        }}
        onCompletado={handleIdentificacionCompletada}
      />
    </div>
  );
}