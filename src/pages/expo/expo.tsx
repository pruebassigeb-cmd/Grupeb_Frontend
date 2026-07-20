// src/pages/Expo.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CATS, CLIENTE_VACIO, filaDesdeProducto, sumarTotales, claveProducto,
  mapearCatalogoExpoAProducto, mapearPlasticoSistemaAProducto, mapearPapelSistemaAProducto,
} from "../../types/expo/expo.types";
import { getOpcionesProductoPapel, getFoils, getTexturas } from "../../services/papel/papelCotizacionService";
import type { Producto, FilaProducto, ClienteExpo, CotizacionGuardada, ItemPedidoAprobado } from "../../types/expo/expo.types";
import api from "../../services/api";

import RegistroCliente   from "../../components/expo/RegistroCliente";
import Catalogo          from "../../components/expo/Catalogo";
import ModalProducto     from "../../components/expo/ModalProducto";
import ModalCatalogoExpo from "../../components/expo/ModalCatalogoExpo";
import HojaCotizacion    from "../../components/expo/HojaCotizacion";
import ListaCotizaciones from "../../components/expo/ListaCotizaciones";
import BotonGuardarConOpciones from "../../components/BotonGuardarConOpciones";
import ModalConfirmarCorreo from "../../components/ModalConfirmarCorreo";

import {
  getCatalogoPropio, getCatalogoSistema,
  crearProductoCatalogo, actualizarProductoCatalogo,
  eliminarProductoCatalogo as eliminarProductoCatalogoAPI,
  crearCotizacionExpo, getCotizacionesExpo, aprobarCotizacionExpo, eliminarCotizacionExpo,
  mapearProductoAPayload,
  registrarProductoEnBlanco,
} from "../../services/expo/expoService";

import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";
import type { CatalogosPlastico, PigmentoDB } from "../../components/expo/Tablacontroles";
import { getTiposInsumo, buscarInsumos, type Insumo } from "../../services/proveedoresService";
import { useAuth } from "../../context/AuthContext";
import { generarPdfCotizacionExpo, cotizacionBackDataAPdfParams } from "../../utils/expo/generarPdfCotizacionExpo";
import { generarPdfCotizacion } from "../../services/generarPdfCotizacion";
import { useEnvioDocumentoPdf } from "../../hooks/useEnvioDocumentoPdf";
import { getClienteById } from "../../services/clientesService";
import { useCalculoPrecioPapel } from "../../hooks/expo/useCalculoPrecioPapel";
import { useCalculoPrecioPlastico } from "../../hooks/expo/useCalculoPrecioPlastico";

const TODAY_NOW = () =>
  new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

// Sube y VINCULA la foto de un producto de Catálogo Expo directo a
// producto_papel/configuracion_plastico (vía idproducto_papel /
// idconfiguracion_plastico en `archivos`) — mismo patrón que ya usan
// Papel.tsx (subirArchivoPendiente) y Plastico.tsx
// (subirArchivoProductoPlastico). No se guarda ninguna URL en el producto:
// el backend la resuelve solo, leyendo `archivos` por esa relación.
const subirImagenProductoExpo = async (
  file: File,
  categoria: "papel" | "plastico" | "carton",
  idReal: number,
) => {
  const formData = new FormData();
  formData.append("archivo", file);
  if (categoria === "plastico") {
    formData.append("carpeta", "suaje");
    formData.append("subcarpeta", "plastico-producto");
    formData.append("categoria", "imagen-producto-plastico");
    formData.append("idconfiguracion_plastico", String(idReal));
  } else {
    formData.append("carpeta", "suaje");
    formData.append("subcarpeta", "imagen");
    formData.append("categoria", "imagen-suaje-papel");
    formData.append("idproducto_papel", String(idReal));
  }
  await api.post("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export default function Expo() {
  const navigate = useNavigate();

  const [filas,    setFilas]    = useState<FilaProducto[]>([]);
  // NUEVO: subido desde HojaCotizacion.tsx — se necesita aquí para poder
  // ignorar, justo al guardar, las columnas de precio que el vendedor ya
  // ocultó (ver guardarConOpciones más abajo).
  const [columnasPrecio, setColumnasPrecio] = useState<1 | 2 | 3>(1);
  const [vista,    setVista]    = useState<"registro" | "cotizacion">("registro");
  const [catalogo, setCatalogo] = useState<Producto[]>([]);
  const [sistemaProductos, setSistemaProductos] = useState<Producto[]>([]);
  const [loadingCatalogo,  setLoadingCatalogo]  = useState(true);

  const [cotizaciones, setCotizaciones] = useState<CotizacionGuardada[]>([]);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [loadingCots,  setLoadingCots]  = useState(false);
  const [folioActual, setFolioActual] = useState<string | null>(null);
  const [ultimoFolioGuardado, setUltimoFolioGuardado] = useState<string | null>(null);
  const folioPreview = "Se asigna al guardar";

  const [clienteData,     setClienteData]     = useState<ClienteExpo>(CLIENTE_VACIO);
  const [clienteGuardado, setClienteGuardado] = useState<ClienteExpo | null>(null);
  const [clienteIdReal,   setClienteIdReal]   = useState<number | null>(null);

  const [cliente, setCliente] = useState("");
  const [coment,  setComent]  = useState("");

  const [over,         setOver]         = useState(false);
  const [catOpen,      setCatOpen]      = useState(true);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [expanded,     setExpanded]     = useState<Record<string, boolean>>({ papel: true, plastico: true, carton: true });
  const [sistemaOpen,  setSistemaOpen]  = useState<Record<string, boolean>>({ papel: false, plastico: false, carton: false });
  const [busquedaTick, setBusquedaTick] = useState(0);
  const [addedId,      setAddedId]      = useState<string | null>(null);
  const [w,            setW]            = useState(1200);

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editando,    setEditando]    = useState<Producto | null>(null);
  const [savingModal, setSavingModal] = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [aprobando,   setAprobando]   = useState(false);
  const [catalogoExpoAbierto, setCatalogoExpoAbierto] = useState(false);

  const { catalogs } = useCatalogosPapel();
  const { user } = useAuth();
  const [foils,         setFoils]         = useState<FoilOpcion[]>([]);
  const [texturas,      setTexturas]      = useState<TexturaOpcion[]>([]);
  const [pigmentosDB,   setPigmentosDB]   = useState<PigmentoDB[]>([]);
  const [coloresAsa,    setColoresAsa]    = useState<{ id: number; nombre: string }[]>([]);
  const [suajesPlast,   setSuajesPlast]   = useState<{ id: number; tipo: string }[]>([]);
  const [catalogosPlast, setCatalogosPlast] = useState<CatalogosPlastico>({
    tiposProducto: [], materiales: [], calibres: [],
  });

  // Calcula papel/cartón por fila y por todas sus columnas activas en una
  // sola petición, con debounce y cancelación de solicitudes obsoletas.
  useCalculoPrecioPapel({ filas, setFilas, columnasPrecio });

  // Reutiliza el calculador de plástico del cotizador general. Cada fila
  // manda en una sola petición sus cantidades visibles, bolsas por kilo y
  // cantidad de tintas. El precio continúa siendo editable manualmente.
  useCalculoPrecioPlastico({ filas, setFilas, columnasPrecio });

  // ── Envío de PDFs (imprimir membretado / mandar por correo el bueno) ──────
  const {
    ejecutar: ejecutarEnvio,
    modalCorreoAbierto,
    enviandoCorreo,
    correoDefault,
    nombreDocumentoModal,
    confirmarEnvioCorreo,
    cancelarEnvioCorreo,
  } = useEnvioDocumentoPdf();

  // ── Responsive ────────────────────────────────────────────────────────────
  useEffect(() => {
    const upd = () => setW(window.innerWidth);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);
  const mob  = w < 640;
  const tab  = w >= 640 && w < 1024;
  const desk = w >= 1024;

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => { cargarCatalogo(); cargarCotizaciones(); }, []);

  useEffect(() => {
    getFoils().then(setFoils).catch(console.error);
    getTexturas().then(setTexturas).catch(console.error);
  }, []);

  // ── Pigmentos desde DB ────────────────────────────────────────────────────
useEffect(() => {
  getTiposInsumo().then(tipos => {
    const pig = tipos.find(t => t.nombre === "Pigmento");
    if (!pig) return;
    buscarInsumos(pig.idtipo_insumo, "").then(items =>
      setPigmentosDB(items.map(i => ({
        id: i.idinsumo,
        nombre: i.nombre,
        codigo: i.proveedores.length === 1 ? i.proveedores[0].codigo : null,
      })))
    ).catch(console.error);
  }).catch(console.error);
}, []);

  // ── Catálogos plástico desde DB ───────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get("/catalogos-productos/plastico"),
      api.get("/catalogos-productos/plastico/calibres?tipo=normal"),
      api.get("/catalogos-productos/plastico/calibres?tipo=bopp"),
    ]).then(([cats, normal, bopp]) => {
      const calibresNormal = (normal.data as any[]).map(c => ({ ...c, calibre_bopp: null }));
      const calibresBopp   = (bopp.data  as any[]).map(c => ({ ...c, calibre_bopp: c.valor }));
      setCatalogosPlast({
        tiposProducto: cats.data.tiposProducto || [],
        materiales:    cats.data.materiales    || [],
        calibres:      [...calibresNormal, ...calibresBopp],
      });
    }).catch(console.error);
  }, []);

  // ── Lista abierta recarga cotizaciones ────────────────────────────────────
  useEffect(() => {
    if (listaAbierta) cargarCotizaciones();
  }, [listaAbierta]);

  // El folio definitivo se asigna al guardar y llega en la respuesta del POST.
  // Así se evita una petición extra y no se muestra un folio provisional que
  // otro vendedor podría consumir antes.
  useEffect(() => {
    if (!ultimoFolioGuardado) return;
    const timer = window.setTimeout(() => setUltimoFolioGuardado(null), 10000);
    return () => window.clearTimeout(timer);
  }, [ultimoFolioGuardado]);

  // ── Funciones de carga ────────────────────────────────────────────────────
  const cargarCatalogo = async () => {
    setLoadingCatalogo(true);
    try {
      const [propio, sistema] = await Promise.all([getCatalogoPropio(), getCatalogoSistema()]);
      setCatalogo(propio.map(mapearCatalogoExpoAProducto));
      setSistemaProductos([
        ...sistema.plastico.map(mapearPlasticoSistemaAProducto),
        ...sistema.papel.map(mapearPapelSistemaAProducto),
      ]);
      if (sistema.coloresAsa)  setColoresAsa(sistema.coloresAsa);
      if (sistema.suajesPlast) setSuajesPlast(sistema.suajesPlast);
    } catch (err) {
      console.error("Error al cargar catálogo expo:", err);
    } finally {
      setLoadingCatalogo(false);
    }
  };

  const cargarCotizaciones = useCallback(async () => {
    setLoadingCots(true);
    try {
      const data = await getCotizacionesExpo();
      const mapeadas: CotizacionGuardada[] = data.map(c => ({
        id:          String(c.idsolicitud),
        folio:       c.no_cotizacion || "",
        idsolicitud: c.idsolicitud,
        origen:      "expo" as const,
        cliente:     c.cliente,
        clienteId:   c.cliente_id,
        clienteData: {
          nombre: c.cliente, celular: c.celular,
          correoUsuario: "", correoExt: "gmail.com",
          impresion: c.impresion, ciudad: c.ciudad,
          estado: c.estado_cliente,
          clase: (c.clasificacion || "") as ClienteExpo["clase"],
          intereses: (c.intereses || []) as ClienteExpo["intereses"],
          observaciones: c.observaciones,
        },
        fecha: new Date(c.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }),
        estado: c.estado as "cotizacion" | "pedido",
        filas: [],
        comentarios: "",
        total: {
          precio1: c.productos.reduce((s, p) => s + (p.detalles[0]?.precio_total || 0), 0),
          precio2: c.productos.reduce((s, p) => s + (p.detalles[1]?.precio_total || 0), 0),
          precio3: c.productos.reduce((s, p) => s + (p.detalles[2]?.precio_total || 0), 0),
        },
        folioPedido: c.no_pedido || undefined,
        _backData: c,
      } as any));
      setCotizaciones(mapeadas);
    } catch (err) {
      console.error("Error al cargar cotizaciones:", err);
    } finally {
      setLoadingCots(false);
    }
  }, []);

  // ── Catálogo ──────────────────────────────────────────────────────────────
  const toggleExp = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));
  const _modalCatInicial = useRef<"papel" | "plastico" | "carton">("papel");

  const abrirNuevo = (cat: "papel" | "plastico" | "carton") => {
    setEditando(null);
    _modalCatInicial.current = cat;
    setModalOpen(true);
  };

  const abrirEditar = (p: Producto) => {
    if (p.fuente !== "expo") return;
    setEditando(p);
    setModalOpen(true);
  };

  const eliminarProd = async (id: number) => {
    const prod = catalogo.find(p => p.id === id);
    if (!prod || prod.fuente !== "expo") return;
    try {
      await eliminarProductoCatalogoAPI(id, prod.categoria);
      setCatalogo(prev => prev.filter(p => p.id !== id));
      setFilas(prev => prev.filter(f => f.producto.id !== id));
    } catch {
      alert("No se pudo eliminar el producto");
    }
  };

  // ── guardarProd ──────────────────────────────────────────────────────────
  const guardarProd = async (p: Producto, imagenPendiente: File | null) => {
    setSavingModal(true);
    try {
      const parseN = (v: string | undefined) => parseFloat(v || "0") || null;
      const esPapel    = p.categoria === "papel" || p.categoria === "carton";
      const esPlastico = p.categoria === "plastico";

      const payload = {
  nombre: p.nombre,

  // Plástico guarda este valor en configuracion_plastico.descripcion.
  // Papel sigue utilizando nombre para descripcion_papel.
  descripcion:
    p.categoria === "plastico"
      ? (p.nombre?.trim() || null)
      : null,

  categoria: p.categoria,
  medida:        p.medida        || null,
  material:      p.material      || null,
  calibre:       p.calibre       || null,

  // Tamaño normalizado para papel/cartón.
  id_tamano_producto: esPapel ? (p.idTamanoProducto ?? null) : null,
  tamano_prod: esPapel ? (p.tamanoProd || null) : null,
  idgrupo_papel: esPapel ? (p.idgrupo_papel ?? null) : null,

  tintas:        p.tintas        || null,
  tipo_producto: p.tipoProducto  || p.tipo || null,
        laminacion:    p.laminacion,
        tipo_laminado: p.tipoLaminado  || null,
        hs:            p.hs,
        tipo_hs:       p.tipoHs        || null,
        ar:            p.ar,
        textura:       p.textura,
        tipo_textura:  p.tipoTextura   || null,
        uv:            p.uv,
        asa:           p.asa,
        tipo_asa:      p.tipoAsa       || null,
        otro:          p.otro          || null,
        pigmento:      esPlastico ? (p.pigmento || null) : null,
        precio_base: esPapel
          ? (parseFloat((p.precioBase || "").replace(/[^0-9.]/g, "")) || null)
          : null,
        // precio_500 conserva su uso actual como precio unitario Expo de
        // plástico. precio_1000 y precio_3000 almacenan referencias totales
        // de 500 y 1,000 piezas para cualquier producto Expo; son informativas
        // y nunca se usan como precios de la cotización.
        precio_500: esPlastico
          ? (parseFloat((p.precio500 || "").replace(/[^0-9.]/g, "")) || null)
          : null,
        precio_1000:
          parseFloat((p.precioReferencia500 || "").replace(/[^0-9.]/g, "")) || null,
        precio_3000:
          parseFloat((p.precioReferencia1000 || "").replace(/[^0-9.]/g, "")) || null,
        origen:        "expo",
        altura:             parseN(p.altura),
        ancho:              parseN(p.ancho),
        fuelle:             esPapel    ? parseN(p.fuelle)      : null,
        fuelle_fondo:       esPlastico ? parseN(p.fuelFondo)   : null,
        fuelle_lateral_iz:  esPlastico ? parseN(p.fuelLateral) : null,
        fuelle_lateral_de:  esPlastico ? parseN(p.fuelLateral2): null,
        refuerzo:           esPlastico ? parseN(p.refuerzo)    : null,
        // NUEVO: defaults de tintas — CANTIDAD, sin pantones.
        tintas_frente_default: p.tintasFrenteDefault ?? null,
        tintas_dentro_default: esPapel ? (p.tintasDentroDefault ?? null) : null,
      };

      let idReal: number;
      if (editando) {
        const actualizado = await actualizarProductoCatalogo(editando.id, payload as any);
        const mapeado = mapearCatalogoExpoAProducto(actualizado);
        idReal = actualizado.idcatalogo_expo;
        setCatalogo(prev => prev.map(x =>
          x.id === editando.id &&
          (x.idgrupo_papel ?? null) === (editando.idgrupo_papel ?? null)
            ? mapeado
            : x
        ));
      } else {
        const creado = await crearProductoCatalogo(payload as any);
        const mapeado = mapearCatalogoExpoAProducto(creado);
        idReal = creado.idcatalogo_expo;
        setCatalogo(prev => [...prev, mapeado]);
      }

      // La foto de un producto NUEVO se guardó como "pendiente" en el modal
      // (no había id todavía a quien vincularla) — ahora que ya existe,
      // se sube y se vincula. Si era edición, la foto ya se subió de
      // inmediato dentro del modal y esto no aplica.
      if (imagenPendiente) {
        try {
          await subirImagenProductoExpo(imagenPendiente, p.categoria, idReal);
        } catch (e) {
          console.error("No se pudo subir la imagen del producto:", e);
          alert("El producto se guardó, pero la imagen no se pudo subir. Puedes agregarla editando el producto.");
        }
      }

      // Recarga completa del catálogo para que la imagen recién vinculada
      // (o cualquier acabado resuelto del lado del backend) se refleje ya
      // mismo en el sidebar/buscador, en vez de esperar al próximo refresh.
      await cargarCatalogo();

      setModalOpen(false);
      setEditando(null);
    } catch (err: any) {
      console.error("Error al guardar producto:", err);
      alert("No se pudo guardar: " + (err?.response?.data?.error || err.message));
      throw err;
    } finally {
      setSavingModal(false);
    }
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, p: Producto) =>
    e.dataTransfer.setData("pkey", claveProducto(p));
  const onDragEnd = () => {};
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const key = e.dataTransfer.getData("pkey");
    const p = [...catalogo, ...sistemaProductos].find(x => claveProducto(x) === key);
    if (p) addProd(p);
  };

  // ── Filas ─────────────────────────────────────────────────────────────────
  const LIMITE_PRODUCTOS = 5;
  const addProd = useCallback(async (p: Producto) => {
    setFilas(prev => {
      if (prev.length >= LIMITE_PRODUCTOS) { alert(`Máximo ${LIMITE_PRODUCTOS} productos por cotización.`); return prev; }
      return prev;
    });

    const yaAlcanzado = await new Promise<boolean>(resolve => {
      setFilas(prev => { resolve(prev.length >= LIMITE_PRODUCTOS); return prev; });
    });
    if (yaAlcanzado) return;

    const filaBase = filaDesdeProducto(p);

    const esPapelOCarton = p.categoria === "papel" || p.categoria === "carton";
    const faltanOpcionesEmbebidas =
      p.asasPermitidas === undefined ||
      p.laminadosPermitidos === undefined;

    // Compatibilidad temporal: el backend nuevo ya incluye estas opciones en
    // la consulta principal. Solo se hace la petición extra si todavía se está
    // usando una respuesta antigua.
    if (
      p.fuente === "sistema" &&
      esPapelOCarton &&
      p.idproducto_papel &&
      faltanOpcionesEmbebidas
    ) {
      try {
        const opciones = await getOpcionesProductoPapel(p.idproducto_papel);
        filaBase.asasPermitidas = opciones.asas.length > 0 ? opciones.asas : null;
        filaBase.laminadosPermitidos = opciones.laminados.length > 0
          ? opciones.laminados
          : null;
      } catch (err) {
        console.error("[EXPO] No se pudieron cargar opciones del producto de papel:", err);
      }
    }

    setFilas(prev => {
      if (prev.length >= LIMITE_PRODUCTOS) return prev;
      return [...prev, filaBase];
    });
    setAddedId(claveProducto(p));
    setTimeout(() => setAddedId(null), 1000);
  }, []);

  const editFila = useCallback((uid: string, k: keyof FilaProducto, v: string | boolean | number | null) =>
    setFilas(prev => prev.map(f => f.uid === uid ? { ...f, [k]: v } : f)), []);

  const editNombreProducto = useCallback((uid: string, nuevoNombre: string) =>
    setFilas(prev => prev.map(f => f.uid === uid ? { ...f, producto: { ...f.producto, nombre: nuevoNombre } } : f)), []);

  const delFila = useCallback((uid: string) => setFilas(p => p.filter(f => f.uid !== uid)), []);

  const limpiar = () => { setFilas([]); setComent(""); setFolioActual(null); setColumnasPrecio(1); };

  const prepararFilas = async (filasActuales: FilaProducto[]): Promise<FilaProducto[]> => {
    const resultado: FilaProducto[] = [];
    for (const fila of filasActuales) {
      const p = fila.producto;
      const esEnBlanco = !p.fuente;
      if (esEnBlanco) {
        try {
          const { id, fuente } = await registrarProductoEnBlanco(fila, fila.precio1, fila.precio2, fila.precio3);
          const productoActualizado = fuente === "papel"
            ? { ...p, id, fuente: "sistema" as const, idproducto_papel: id }
            : { ...p, id, fuente: "sistema" as const, configuracion_plastico_id: id };
          resultado.push({ ...fila, producto: productoActualizado });
        } catch (err) {
          console.error(`[EXPO] No se pudo registrar "${p.nombre}" en el sistema:`, err);
          resultado.push(fila);
        }
      } else {
        resultado.push(fila);
      }
    }
    return resultado;
  };

  // ── Construye el payload para generarPdfCotizacion (el PDF "bueno" de
  // correo) usando datos FRESCOS DEL BACKEND — ya no el estado local del
  // formulario.
  const construirPayloadPdfCotizacionDesdeBackData = async (backData: any, folio: string, fecha: string) => {
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
      no_cotizacion: folio,
      fecha,
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

  // ── Cotizaciones ──────────────────────────────────────────────────────────
  const guardarConOpciones = async (opciones: { imprimir: boolean; correo: boolean }) => {
    if (filas.length === 0) { alert("Agrega al menos un producto."); return; }
    if (!cliente.trim())    { alert("Falta el nombre del cliente."); return; }
    if (!clienteIdReal)     { alert("Regresa y registra el prospecto primero."); return; }

    let folioRegistrado: string | null = null;
    setGuardando(true);
    try {
      // IMPORTANTE: las columnas ocultas pueden conservar valores internos
      // por el estado de React, pero no deben registrarse en la cotización.
      // Se crean copias de las filas para no modificar visualmente el tablero.
      const filasVisibles: FilaProducto[] = filas.map((fila) => ({
        ...fila,
        precio2: columnasPrecio >= 2 ? fila.precio2 : "",
        cant2: columnasPrecio >= 2 ? fila.cant2 : "",
        precio3: columnasPrecio >= 3 ? fila.precio3 : "",
        cant3: columnasPrecio >= 3 ? fila.cant3 : "",
      }));

      // También se preparan los productos en blanco usando únicamente las
      // columnas visibles, para evitar que se reutilicen precios ocultos.
      const filasListas = await prepararFilas(filasVisibles);

      const productos = filasListas.map((fila) =>
        mapearProductoAPayload(
          fila,
          fila.precio1,
          fila.precio2,
          fila.precio3,
          fila.cant1,
          fila.cant2,
          fila.cant3,
          columnasPrecio,
        ),
      );
      const resultado = await crearCotizacionExpo({ clienteId: clienteIdReal, productos, comentarios: coment });
      folioRegistrado = resultado.no_cotizacion;
      setFolioActual(resultado.no_cotizacion);
      setUltimoFolioGuardado(resultado.no_cotizacion);

      const nueva: CotizacionGuardada = {
        id: String(resultado.idsolicitud), folio: resultado.no_cotizacion,
        idsolicitud: resultado.idsolicitud, origen: "expo",
        cliente: cliente.trim(), clienteId: clienteIdReal, clienteData: clienteGuardado,
        fecha: TODAY_NOW(), estado: "cotizacion", filas: filasListas, comentarios: coment,
        total: sumarTotales(filasListas),
      };
      setCotizaciones(prev => [...prev, nueva]);

      const asesorNombre = user ? `${user.nombre} ${user.apellido}`.trim() : "Asesor de Ventas";

      let correoCliente = "";
      try {
        const clienteCompleto = await getClienteById(clienteIdReal);
        correoCliente = clienteCompleto?.correo || "";
      } catch (e) {
        console.warn("No se pudo obtener el correo registrado del cliente:", e);
      }

      let backDataFresco: any = null;
      try {
        const data = await getCotizacionesExpo();
        backDataFresco = data.find(c => c.no_cotizacion === resultado.no_cotizacion) || null;
      } catch (e) {
        console.error("No se pudo releer la cotización recién creada:", e);
      }

      await ejecutarEnvio(
        {
          paraImprimir: async () => {
            if (!backDataFresco) { console.warn("Sin datos frescos para el PDF de impresión."); return; }
            const params = cotizacionBackDataAPdfParams(backDataFresco, resultado.no_cotizacion, TODAY_NOW(), asesorNombre);
            generarPdfCotizacionExpo(params);
          },

          paraCorreo: async () => {
            if (!backDataFresco) throw new Error("Sin datos frescos para el PDF de correo.");
            const payload = await construirPayloadPdfCotizacionDesdeBackData(backDataFresco, resultado.no_cotizacion, TODAY_NOW());
            return await generarPdfCotizacion(payload as any, false, false);
          },
        },
        {
          tipo: "cotizacion",
          folio: resultado.no_cotizacion,
          cliente: cliente.trim(),
          empresa: clienteGuardado?.impresion,
          correoDefault: correoCliente,
        },
        opciones
      );

      limpiar();
    } catch (err) {
      console.error("Error al guardar cotización:", err);
      if (folioRegistrado) {
        alert(
          `La cotización ${folioRegistrado} sí quedó registrada, pero ocurrió un problema al generar, imprimir o enviar el documento.`,
        );
      } else {
        alert("No se pudo guardar la cotización.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const aprobarCotizacion = async (id: string, items: ItemPedidoAprobado[]): Promise<string | null> => {
    const cot = cotizaciones.find(c => c.id === id);
    if (!cot?.folio) return null;
    setAprobando(true);
    try {
      const itemsConIds = items.map(item => ({
        idsolicitud_producto: item.idsolicitud_producto || 0,
        idsolicitud_detalle:  item.idsolicitud_detalle  || 0,
      })).filter(i => i.idsolicitud_detalle > 0);
      const resultado = await aprobarCotizacionExpo(cot.folio, itemsConIds);
      setCotizaciones(prev => prev.map(c => c.id === id
        ? { ...c, estado: "pedido", folioPedido: resultado.no_pedido, itemsAprobados: items }
        : c));
      return resultado.no_pedido;
    } catch {
      alert("No se pudo aprobar la cotización.");
      return null;
    } finally {
      setAprobando(false);
    }
  };

  const eliminarCotizacion = async (folio: string) => {
    try {
      await eliminarCotizacionExpo(folio);
      setCotizaciones(prev => prev.filter(c => c.folio !== folio));
    } catch {
      alert("No se pudo eliminar la cotización.");
    }
  };

  const irACotizar = (idReal?: number, nombreCliente?: string) => {
    setClienteGuardado({ ...clienteData });
    setCliente(nombreCliente || clienteData.nombre);
    if (idReal) setClienteIdReal(idReal);
    setVista("cotizacion");
  };

  // ── Props para componentes hijos ──────────────────────────────────────────
  const propsCatalogo = {
    mob, tab, desk, catalogo, sistemaProductos, expanded, sistemaOpen, addedId,
    busquedaTick, setBusquedaTick, toggleExp, setSistemaOpen,
    onDragStart, onDragEnd,
    addProd, abrirEditar, eliminarProd, loadingCatalogo,
  };

  const propsHoja = {
    filas, cliente, coment, folio: folioActual || folioPreview,
    empresa: clienteGuardado?.impresion || clienteData.impresion || "",
    mob, tab, desk, over, catalogoPropio: catalogo, sistemaProductos,
    catalogs, foils, texturas, pigmentosDB, coloresAsa, suajesPlast,
    columnasPrecio, setColumnasPrecio,
    setCliente, setComent, setOver,
    onDrop, onEdit: editFila, onDel: delFila, onEditNombre: editNombreProducto,
    onAbrirDrawer: () => setDrawerOpen(true), onAgregarProducto: addProd,
    catalogosPlast,
    asesor: user ? `${user.nombre} ${user.apellido}`.trim() : "Asesor de Ventas",
  };

  // ── Botones rápidos ────────────────────────────────────────────────────
  const BotonesRapidos = () => (
    <div className="no-print" style={{ display: "flex", gap: 6 }}>
      <button
        onClick={() => guardarConOpciones({ imprimir: true, correo: false })}
        disabled={guardando}
        title="Guardar e imprimir únicamente"
        style={{ background: "transparent", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "8px 10px", borderRadius: 6, cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? .5 : 1 }}>
        🖨 Imprimir
      </button>
      <button
        onClick={() => guardarConOpciones({ imprimir: false, correo: true })}
        disabled={guardando}
        title="Guardar y enviar por correo únicamente"
        style={{ background: "transparent", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "8px 10px", borderRadius: 6, cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? .5 : 1 }}>
        📧 Enviar
      </button>
      <button
        onClick={() => guardarConOpciones({ imprimir: true, correo: true })}
        disabled={guardando}
        title="Guardar, imprimir y enviar por correo"
        style={{ background: "transparent", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "8px 10px", borderRadius: 6, cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? .5 : 1 }}>
        🖨📧 Ambos
      </button>
    </div>
  );

  // ── Sub-componentes UI ────────────────────────────────────────────────────
  const BotonesAccion = () => (
    <div className="no-print" style={{ display: "flex", gap: 10, width: "100%", maxWidth: desk ? 1100 : undefined, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={() => navigate("/home")}
        style={{ background: "transparent", border: "1px solid #444", color: "#666", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }}
        title="Regresar a SIGEB"
      >
        🏠 SIGEB
      </button>
      <button
        onClick={() => setCatalogoExpoAbierto(true)}
        style={{ background: "#1A1A1A", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "7px 12px", borderRadius: 6, cursor: "pointer" }}
        title="Administrar catálogo de Expo"
      >
        🛠 Catálogo
      </button>
      <button onClick={() => setVista("registro")} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>← Cliente</button>
      <button onClick={limpiar} style={{ background: "transparent", border: "1px solid #555", color: "#AAA", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Limpiar</button>
      <BotonesRapidos />
      <BotonGuardarConOpciones guardando={guardando} onEjecutar={guardarConOpciones} variant="dark" />
    </div>
  );

  const DrawerHeader = ({ label }: { label: string }) => (
    <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #222", position: "sticky", top: 0, background: "#111", zIndex: 1 }}>
      <div style={{ color: "#C9922A", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
        {label}
        {filas.length > 0 && <span style={{ marginLeft: 8, background: "#C9922A", color: "#1A1A1A", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>{filas.length} en cotización</span>}
      </div>
      <button onClick={() => setDrawerOpen(false)} style={{ background: "#2A2A2A", border: "none", color: "#AAA", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontSize: 16 }}>✕</button>
    </div>
  );

  const BotonesNuevoProducto = () => (
    <div style={{ display: "flex", gap: 6, padding: "0 16px 10px", position: "sticky", top: 52, background: "#111", zIndex: 1 }}>
      {CATS.map(c => (
        <button key={c.key} onClick={() => abrirNuevo(c.key as "papel" | "plastico" | "carton")}
          style={{ flex: 1, background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, fontSize: 10, fontWeight: 700, padding: "7px 4px", borderRadius: 6, cursor: "pointer", letterSpacing: .3 }}>
          {c.emoji} +{c.label}
        </button>
      ))}
    </div>
  );

  const BadgeContador = ({ size }: { size: number }) =>
    cotizaciones.length > 0 ? (
      <span style={{ position: "absolute", top: -4, right: -4, background: "#C9922A", color: "#0D0D0D", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: size === 44 ? 17 : 20, height: size === 44 ? 17 : 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {cotizaciones.length}
      </span>
    ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {ultimoFolioGuardado && (
        <div
          className="no-print"
          role="status"
          style={{
            position: "fixed",
            top: 18,
            right: 18,
            zIndex: 1000,
            minWidth: 290,
            maxWidth: "calc(100vw - 36px)",
            background: "#132017",
            border: "1px solid #22C55E66",
            borderLeft: "4px solid #22C55E",
            borderRadius: 9,
            boxShadow: "0 12px 34px rgba(0,0,0,.55)",
            padding: "12px 42px 12px 14px",
          }}
        >
          <div style={{ color: "#86EFAC", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
            ✓ Cotización registrada
          </div>
          <div style={{ color: "#FFF", fontSize: 16, fontWeight: 800, marginTop: 3 }}>
            Folio {ultimoFolioGuardado}
          </div>
          <div style={{ color: "#8A9A8E", fontSize: 9.5, marginTop: 2 }}>
            Este es el folio definitivo asignado por el servidor.
          </div>
          <button
            onClick={() => setUltimoFolioGuardado(null)}
            aria-label="Cerrar confirmación"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "1px solid #FFFFFF22",
              background: "transparent",
              color: "#AAA",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#1A1A1A;font-family:'Inter',sans-serif;}
        input::placeholder,textarea::placeholder{color:#444;}
        input:focus,select:focus,textarea:focus{border-color:#C9922A!important;outline:none;}
        .pcard{transition:border-color .15s,background .15s;-webkit-user-drag:element;}
        .pcard:hover{border-color:#C9922A!important;background:#252525!important;}
        .pcard-actions{opacity:0;transition:opacity .15s;}
        .pcard:hover .pcard-actions{opacity:1;}
        .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;}
        .drawer{position:fixed;bottom:0;left:0;right:0;background:#111;z-index:51;border-radius:16px 16px 0 0;max-height:75vh;overflow-y:auto;transition:transform .3s ease;}
        .drawer.open{transform:translateY(0);}
        .drawer.closed{transform:translateY(100%);}
        .cat-desk{transition:width .25s ease;overflow:hidden;flex-shrink:0;}
        .cat-desk.open{width:290px;}
        .cat-desk.closed{width:40px;}
        .print-only{display:none;}
        select option{background:#1A1A1A;color:#EEE;}
        .hoja select{background:#F0E8D8;color:#1A1A1A;}
        @media print{
          @page{size:landscape;margin:0;}
          body{background:white!important;}
          .no-print{display:none!important;}
          .right-col{height:auto!important;overflow:visible!important;padding:0!important;background:white!important;display:block!important;}
          .hoja{max-width:100%!important;border-radius:0!important;box-shadow:none!important;}
          .drop-zone-el{display:none!important;}
          .drawer,.drawer-overlay,.cat-desk,.mob-bar{display:none!important;}
          .no-print-show{display:none!important;}
          .print-only{display:inline-block!important;font-size:9px!important;color:#1A1A1A!important;font-weight:600!important;font-family:'Inter',sans-serif!important;}
        }
      `}</style>

      {vista === "registro" && (
        <RegistroCliente
          clienteData={clienteData} setClienteData={setClienteData}
          clienteGuardado={clienteGuardado} mob={mob}
          clienteIdReal={clienteIdReal}
          onCotizar={irACotizar} onCerrar={() => setVista("cotizacion")}
          cotizacionesCount={cotizaciones.length}
          onAbrirLista={() => setListaAbierta(true)}
        />
      )}

      {vista === "cotizacion" && (<>
        {/* ── MÓVIL ── */}
        {mob && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#1A1A1A" }}>
            <div className="mob-bar no-print" style={{ background: "#111", borderBottom: "2px solid #C9922A", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: "#C9922A", fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif" }}>EB</div>
                <div>
                  <div style={{ color: "#FFF", fontSize: 11, fontWeight: 700 }}>EUROBOLSA</div>
                  <div style={{ color: "#666", fontSize: 9 }}>Cotizador Expo</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => navigate("/home")} style={{ background: "transparent", border: "1px solid #444", color: "#666", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }} title="Regresar a SIGEB">🏠 SIGEB</button>
                <button onClick={() => setCatalogoExpoAbierto(true)} style={{ background: "#1A1A1A", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }} title="Administrar catálogo de Expo">🛠</button>
                <button onClick={() => setVista("registro")} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }}>← Cliente</button>
                <button onClick={limpiar} style={{ background: "transparent", border: "1px solid #444", color: "#AAA", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }}>Limpiar</button>
                <BotonesRapidos />
                <BotonGuardarConOpciones guardando={guardando} onEjecutar={guardarConOpciones} variant="dark" />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
              <HojaCotizacion {...propsHoja} />
            </div>
            {drawerOpen && <div className="drawer-overlay" />}
            <div className={`drawer ${drawerOpen ? "open" : "closed"}`}>
              <DrawerHeader label="SELECCIONA UN PRODUCTO" />
              <BotonesNuevoProducto />
              <Catalogo grid {...propsCatalogo} />
            </div>
            <div className="no-print" style={{ position: "fixed", bottom: 20, right: 20, zIndex: 40, display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => setListaAbierta(true)} style={{ background: "#1A1A1A", border: "2px solid #C9922A", color: "#C9922A", width: 44, height: 44, borderRadius: "50%", cursor: "pointer", fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,.5)", position: "relative" }}>📋<BadgeContador size={44} /></button>
              <button onClick={() => setDrawerOpen(true)} style={{ background: "#C9922A", border: "none", color: "#1A1A1A", width: 52, height: 52, borderRadius: "50%", cursor: "pointer", fontSize: 22, fontWeight: 700, boxShadow: "0 4px 20px rgba(201,146,42,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        )}

        {/* ── TABLET ── */}
        {tab && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#2A2A2A" }}>
            <div className="no-print" style={{ background: "#111", borderBottom: "2px solid #C9922A", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: "#C9922A", fontSize: 24, fontWeight: 700, fontFamily: "Georgia,serif" }}>EB</div>
                <div>
                  <div style={{ color: "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>EUROBOLSA</div>
                  <div style={{ color: "#666", fontSize: 9, letterSpacing: .5 }}>Cotizador Expo</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => navigate("/home")} style={{ background: "transparent", border: "1px solid #444", color: "#666", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }} title="Regresar a SIGEB">🏠 SIGEB</button>
                <button onClick={() => setCatalogoExpoAbierto(true)} style={{ background: "#1A1A1A", border: "1px solid #C9922A55", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "7px 12px", borderRadius: 6, cursor: "pointer" }} title="Administrar catálogo de Expo">🛠 Catálogo</button>
                <button onClick={() => setVista("registro")} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>← Cliente</button>
                <button onClick={limpiar} style={{ background: "transparent", border: "1px solid #555", color: "#AAA", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Limpiar</button>
                <BotonesRapidos />
                <BotonGuardarConOpciones guardando={guardando} onEjecutar={guardarConOpciones} variant="dark" />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              <HojaCotizacion {...propsHoja} />
            </div>
            {drawerOpen && <div className="drawer-overlay" />}
            <div className={`drawer ${drawerOpen ? "open" : "closed"}`} style={{ maxHeight: "65vh" }}>
              <DrawerHeader label="CATÁLOGO — DOBLE TOQUE PARA AGREGAR" />
              <BotonesNuevoProducto />
              <Catalogo grid {...propsCatalogo} />
            </div>
            <div className="no-print" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 40, display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={() => setListaAbierta(true)} style={{ background: "#1A1A1A", border: "2px solid #C9922A", color: "#C9922A", width: 48, height: 48, borderRadius: "50%", cursor: "pointer", fontSize: 19, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,.5)", position: "relative" }}>📋<BadgeContador size={48} /></button>
              <button onClick={() => setDrawerOpen(true)} style={{ background: "#C9922A", border: "none", color: "#1A1A1A", width: 56, height: 56, borderRadius: "50%", cursor: "pointer", fontSize: 24, fontWeight: 700, boxShadow: "0 4px 20px rgba(201,146,42,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          </div>
        )}

        {/* ── DESKTOP ── */}
        {desk && (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <aside className={`cat-desk no-print ${catOpen ? "open" : "closed"}`} style={{ background: "#111", borderRight: "2px solid #222", height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column" }}>
              <button onClick={() => setCatOpen(v => !v)} style={{ width: "100%", background: "#1A1A1A", border: "none", borderBottom: "2px solid #C9922A", color: "#C9922A", cursor: "pointer", padding: "13px 0", display: "flex", alignItems: "center", justifyContent: catOpen ? "space-between" : "center", paddingLeft: catOpen ? 16 : 0, paddingRight: catOpen ? 12 : 0, flexShrink: 0 }}>
                {catOpen && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Catálogo</span>}
                <span style={{ fontSize: 15 }}>{catOpen ? "◀" : "▶"}</span>
              </button>
              {catOpen ? (
                <div style={{ padding: "8px 8px 4px", borderBottom: "1px solid #222", display: "flex", gap: 6, flexShrink: 0 }}>
                  {CATS.map(c => (
                    <button key={c.key} onClick={() => abrirNuevo(c.key as "papel" | "plastico" | "carton")}
                      style={{ flex: 1, background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, fontSize: 9, fontWeight: 700, padding: "5px 4px", borderRadius: 5, cursor: "pointer", letterSpacing: .5 }}>
                      {c.emoji} +{c.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "8px 4px", borderBottom: "1px solid #222", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {CATS.map(c => (
                    <button key={c.key} onClick={() => abrirNuevo(c.key as "papel" | "plastico" | "carton")}
                      title={`Nuevo producto de ${c.label}`}
                      style={{ width: 28, height: 28, background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, borderRadius: 6, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {c.emoji}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ overflowY: "auto", flex: 1, opacity: catOpen ? 1 : 0, transition: "opacity .2s", pointerEvents: catOpen ? "auto" : "none", width: 290 }}>
                <Catalogo {...propsCatalogo} />
              </div>
            </aside>

            <div className="right-col" style={{ flex: 1, overflowY: "auto", height: "100vh", padding: 20, background: "#2A2A2A", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <BotonesAccion />
              <HojaCotizacion {...propsHoja} />
            </div>

            <div className="no-print" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 40 }}>
              <button onClick={() => setListaAbierta(true)} style={{ background: "#1A1A1A", border: "2px solid #C9922A", color: "#C9922A", width: 54, height: 54, borderRadius: "50%", cursor: "pointer", fontSize: 21, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,.5)", position: "relative" }}>
                📋<BadgeContador size={54} />
              </button>
            </div>
          </div>
        )}
      </>)}

      {modalOpen && (
        <ModalProducto
          editando={editando}
          catInicial={_modalCatInicial.current}
          onClose={() => { setModalOpen(false); setEditando(null); }}
          onGuardar={guardarProd}
          saving={savingModal}
          catalogs={catalogs}
          foils={foils}
          texturas={texturas}
          coloresAsa={coloresAsa}
        />
      )}

      {listaAbierta && (
        <ListaCotizaciones
          cotizaciones={cotizaciones} loading={loadingCots} aprobando={aprobando}
          onAprobar={aprobarCotizacion} onEliminar={eliminarCotizacion}
          onClose={() => setListaAbierta(false)} onRefresh={cargarCotizaciones}
          asesor={user ? `${user.nombre} ${user.apellido}`.trim() : "Asesor de Ventas"}
        />
      )}

      {modalCorreoAbierto && (
        <ModalConfirmarCorreo
          correoInicial={correoDefault}
          nombreDocumento={nombreDocumentoModal}
          enviando={enviandoCorreo}
          onConfirmar={confirmarEnvioCorreo}
          onCancelar={cancelarEnvioCorreo}
        />
      )}

      {catalogoExpoAbierto && (
        <ModalCatalogoExpo
          onClose={() => {
            setCatalogoExpoAbierto(false);
            cargarCatalogo();
          }}
        />
      )}
    </>
  );
}