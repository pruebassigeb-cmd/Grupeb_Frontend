import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CATS, CLIENTE_VACIO, filaDesdeProducto, sumarTotales,
  mapearCatalogoExpoAProducto, mapearPlasticoSistemaAProducto, mapearPapelSistemaAProducto,
} from "../../types/expo/expo.types";
import type { Producto, FilaProducto, ClienteExpo, CotizacionGuardada, ItemPedidoAprobado } from "../../types/expo/expo.types";
import api from "../../services/api";

import RegistroCliente   from "../../components/expo/RegistroCliente";
import Catalogo          from "../../components/expo/Catalogo";
import ModalProducto     from "../../components/expo/ModalProducto";
import HojaCotizacion    from "../../components/expo/HojaCotizacion";
import ListaCotizaciones from "../../components/expo/ListaCotizaciones";

import {
  getCatalogoPropio, getCatalogoSistema,
  crearProductoCatalogo, actualizarProductoCatalogo,
  eliminarProductoCatalogo as eliminarProductoCatalogoAPI,
  crearCotizacionExpo, getCotizacionesExpo, aprobarCotizacionExpo, eliminarCotizacionExpo,
  mapearProductoAPayload,
  registrarProductoEnBlanco,   // ← CAMBIO 1
} from "../../services/expo/expoService";

import { useCatalogosPapel } from "../../hooks/papel/useCatalogosPapel";
import { getFoils, getTexturas } from "../../services/papel/papelCotizacionService";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";
import type { CatalogosPlastico, PigmentoDB } from "../../components/expo/TablaControles";
import { getTiposInsumo, buscarInsumos } from "../../services/proveedoresService";
import { useAuth } from "../../context/AuthContext";
import { generarPdfCotizacionExpo } from "../../utils/expo/generarPdfCotizacionExpo";

const TODAY_NOW = () =>
  new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

export default function Expo() {
  const navigate = useNavigate(); // ← CAMBIO 2

  const [filas,    setFilas]    = useState<FilaProducto[]>([]);
  const [vista,    setVista]    = useState<"registro" | "cotizacion">("registro");
  const [catalogo, setCatalogo] = useState<Producto[]>([]);
  const [sistemaProductos, setSistemaProductos] = useState<Producto[]>([]);
  const [loadingCatalogo,  setLoadingCatalogo]  = useState(true);

  const [cotizaciones, setCotizaciones] = useState<CotizacionGuardada[]>([]);
  const [listaAbierta, setListaAbierta] = useState(false);
  const [loadingCots,  setLoadingCots]  = useState(false);
  const [folioActual,  setFolioActual]  = useState<string | null>(null);
  const [folioPreview, setFolioPreview] = useState<string>("—");

  const [clienteData,     setClienteData]     = useState<ClienteExpo>(CLIENTE_VACIO);
  const [clienteGuardado, setClienteGuardado] = useState<ClienteExpo | null>(null);
  const [clienteIdReal,   setClienteIdReal]   = useState<number | null>(null);

  const [cliente, setCliente] = useState("");
  const [coment,  setComent]  = useState("");
  const [cant1,   setCant1]   = useState("500");
  const [cant2,   setCant2]   = useState("1,000");
  const [cant3,   setCant3]   = useState("3,000");

  const [over,         setOver]         = useState(false);
  const [catOpen,      setCatOpen]      = useState(true);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [expanded,     setExpanded]     = useState<Record<string, boolean>>({ papel: true, plastico: true, carton: true });
  const [sistemaOpen,  setSistemaOpen]  = useState<Record<string, boolean>>({ papel: false, plastico: false, carton: false });
  const [busquedaTick, setBusquedaTick] = useState(0);
  const [addedId,      setAddedId]      = useState<number | null>(null);
  const [w,            setW]            = useState(1200);

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editando,    setEditando]    = useState<Producto | null>(null);
  const [savingModal, setSavingModal] = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [aprobando,   setAprobando]   = useState(false);

  const { catalogs } = useCatalogosPapel();
  const { user } = useAuth();
  const [foils,    setFoils]    = useState<FoilOpcion[]>([]);
  const [texturas, setTexturas] = useState<TexturaOpcion[]>([]);
  const [pigmentosDB,    setPigmentosDB]    = useState<PigmentoDB[]>([]);
  const [coloresAsa,     setColoresAsa]     = useState<{id: number; nombre: string}[]>([]);
  const [catalogosPlast, setCatalogosPlast] = useState<CatalogosPlastico>({
    tiposProducto: [], materiales: [], calibres: [],
  });

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
        setPigmentosDB(items.map(i => ({ id: i.idproveedor_producto, nombre: i.nombre, codigo: i.codigo })))
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

  // ── Folio preview ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/expo/cotizaciones/siguiente-folio")
      .then(r => setFolioPreview(r.data.folio))
      .catch(console.error);
  }, [cotizaciones]);

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
      if (sistema.coloresAsa) setColoresAsa(sistema.coloresAsa);
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
      await eliminarProductoCatalogoAPI(id);
      setCatalogo(prev => prev.filter(p => p.id !== id));
      setFilas(prev => prev.filter(f => f.producto.id !== id));
    } catch {
      alert("No se pudo eliminar el producto");
    }
  };

  const guardarProd = async (p: Producto) => {
    setSavingModal(true);
    try {
      const parseN = (v: string | undefined) => parseFloat(v || "0") || null;
      const esPapel    = p.categoria === "papel" || p.categoria === "carton";
      const esPlastico = p.categoria === "plastico";

      const payload = {
        nombre:        p.nombre,
        categoria:     p.categoria,
        medida:        p.medida        || null,
        material:      p.material      || null,
        calibre:       p.calibre       || null,
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
        precio_500:    parseFloat(p.precio500.replace(/[^0-9.]/g, ""))  || null,
        precio_1000:   parseFloat(p.precio1000.replace(/[^0-9.]/g, "")) || null,
        precio_3000:   parseFloat(p.precio3000.replace(/[^0-9.]/g, "")) || null,
        imagen_url:    p.imagen        || null,
        origen:        "expo",
        altura:             parseN(p.altura),
        ancho:              parseN(p.ancho),
        fuelle:             esPapel    ? parseN(p.fuelle)      : null,
        fuelle_fondo:       esPlastico ? parseN(p.fuelFondo)   : null,
        fuelle_lateral_iz:  esPlastico ? parseN(p.fuelLateral) : null,
        fuelle_lateral_de:  esPlastico ? parseN(p.fuelLateral2): null,
        refuerzo:           esPlastico ? parseN(p.refuerzo)    : null,
      };

      if (editando) {
        const actualizado = await actualizarProductoCatalogo(editando.id, payload as any);
        const mapeado = mapearCatalogoExpoAProducto(actualizado);
        setCatalogo(prev => prev.map(x => x.id === editando.id ? mapeado : x));
      } else {
        const creado = await crearProductoCatalogo(payload as any);
        const mapeado = mapearCatalogoExpoAProducto(creado);
        setCatalogo(prev => [...prev, mapeado]);
      }
      setModalOpen(false);
      setEditando(null);
    } catch (err: any) {
      console.error("Error al guardar producto:", err);
      alert("No se pudo guardar: " + (err?.response?.data?.error || err.message));
    } finally {
      setSavingModal(false);
    }
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: number) => e.dataTransfer.setData("pid", String(id));
  const onDragEnd = () => {};
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const id = Number(e.dataTransfer.getData("pid"));
    const p = [...catalogo, ...sistemaProductos].find(x => x.id === id);
    if (p) addProd(p);
  };

  // ── Filas ─────────────────────────────────────────────────────────────────
  const LIMITE_PRODUCTOS = 5;
  const addProd = useCallback((p: Producto) => {
    setFilas(prev => {
      if (prev.length >= LIMITE_PRODUCTOS) { alert(`Máximo ${LIMITE_PRODUCTOS} productos por cotización.`); return prev; }
      return [...prev, filaDesdeProducto(p)];
    });
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 1000);
  }, []);

  const editFila = useCallback((uid: string, k: keyof FilaProducto, v: string | boolean | number | null) =>
    setFilas(prev => prev.map(f => f.uid === uid ? { ...f, [k]: v } : f)), []);

  const editNombreProducto = useCallback((uid: string, nuevoNombre: string) =>
    setFilas(prev => prev.map(f => f.uid === uid ? { ...f, producto: { ...f.producto, nombre: nuevoNombre } } : f)), []);

  const delFila = useCallback((uid: string) => setFilas(p => p.filter(f => f.uid !== uid)), []);

  const limpiar = () => { setFilas([]); setCliente(""); setComent(""); setFolioActual(null); };

  // ─── CAMBIO 2: función prepararFilas ─────────────────────────────────────
  const prepararFilas = async (filasActuales: FilaProducto[]): Promise<FilaProducto[]> => {
    const resultado: FilaProducto[] = [];
    for (const fila of filasActuales) {
      const p = fila.producto;
      // Producto en blanco: creado en BuscadorProductoModal tiene fuente = undefined
      const esEnBlanco = !p.fuente;
      if (esEnBlanco) {
        try {
          const idcatalogo = await registrarProductoEnBlanco(fila, fila.precio1, fila.precio2, fila.precio3);
          resultado.push({ ...fila, producto: { ...p, id: idcatalogo, fuente: "expo" } });
        } catch (err) {
          console.error(`[EXPO] No se pudo registrar "${p.nombre}" en catálogo:`, err);
          resultado.push(fila); // lo mandamos igual, el controller lo guarda como expo genérico
        }
      } else {
        resultado.push(fila);
      }
    }
    return resultado;
  };

  // ── Cotizaciones ──────────────────────────────────────────────────────────
  // CAMBIO 3 — guardarCotizacion
  const guardarCotizacion = async () => {
    if (filas.length === 0) { alert("Agrega al menos un producto."); return; }
    if (!cliente.trim())    { alert("Falta el nombre del cliente."); return; }
    if (!clienteIdReal)     { alert("Regresa y registra el prospecto primero."); return; }
    setGuardando(true);
    try {
      const filasListas = await prepararFilas(filas);
      const productos = filasListas.map(f =>
        mapearProductoAPayload(f, f.precio1, f.precio2, f.precio3, cant1, cant2, cant3)
      );
      const resultado = await crearCotizacionExpo({ clienteId: clienteIdReal, productos, comentarios: coment });
      setFolioActual(resultado.no_cotizacion);
      const nueva: CotizacionGuardada = {
        id: String(resultado.idsolicitud), folio: resultado.no_cotizacion,
        idsolicitud: resultado.idsolicitud, origen: "expo",
        cliente: cliente.trim(), clienteId: clienteIdReal, clienteData: clienteGuardado,
        fecha: TODAY_NOW(), estado: "cotizacion", filas: filasListas, comentarios: coment,
        total: sumarTotales(filasListas),
      };
      setCotizaciones(prev => [...prev, nueva]);
      alert(`✅ Cotización ${resultado.no_cotizacion} guardada.`);
      limpiar();
    } catch (err) {
      console.error("Error al guardar cotización:", err);
      alert("No se pudo guardar la cotización.");
    } finally {
      setGuardando(false);
    }
  };

  // CAMBIO 4 — guardarEImprimir
  const guardarEImprimir = async () => {
    if (filas.length === 0) { alert("Agrega al menos un producto."); return; }
    if (!cliente.trim())    { alert("Falta el nombre del cliente."); return; }
    if (!clienteIdReal)     { alert("Regresa y registra el prospecto primero."); return; }
    setGuardando(true);
    try {
      const filasListas = await prepararFilas(filas);
      const productos = filasListas.map(f =>
        mapearProductoAPayload(f, f.precio1, f.precio2, f.precio3, cant1, cant2, cant3)
      );
      const resultado = await crearCotizacionExpo({ clienteId: clienteIdReal, productos, comentarios: coment });
      setFolioActual(resultado.no_cotizacion);
      const nueva: CotizacionGuardada = {
        id: String(resultado.idsolicitud), folio: resultado.no_cotizacion,
        idsolicitud: resultado.idsolicitud, origen: "expo",
        cliente: cliente.trim(), clienteId: clienteIdReal, clienteData: clienteGuardado,
        fecha: TODAY_NOW(), estado: "cotizacion", filas: filasListas, comentarios: coment,
        total: sumarTotales(filasListas),
      };
      setCotizaciones(prev => [...prev, nueva]);

      // Generar PDF inmediatamente con los precios ajustados y cantidades reales
      generarPdfCotizacionExpo({
        folio:       resultado.no_cotizacion,
        cliente:     cliente.trim(),
        asesor:      user ? `${user.nombre} ${user.apellido}`.trim() : "Asesor de Ventas",
        fecha:       TODAY_NOW(),
        comentarios: coment,
        productos: filasListas.map(f => {
          const parseP  = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
          const extraNum = f.modoExtra === "precio" ? parseP(f.extra || "0") : 0;
          const p1 = parseP(f.precio1) + extraNum;
          const p2 = parseP(f.precio2) + extraNum;
          const p3 = parseP(f.precio3) + extraNum;
          const parseCant = (s: string) => parseInt(s.replace(/,/g, ""), 10) || 0;
          const c1 = parseCant(cant1);
          const c2 = parseCant(cant2);
          const c3 = parseCant(cant3);
          const detalles = [
            p1 > 0 ? { cantidad: c1, precio_unitario: p1, precio_total: c1 * p1 } : null,
            p2 > 0 ? { cantidad: c2, precio_unitario: p2, precio_total: c2 * p2 } : null,
            p3 > 0 ? { cantidad: c3, precio_unitario: p3, precio_total: c3 * p3 } : null,
          ].filter(Boolean) as { cantidad: number; precio_unitario: number; precio_total: number }[];
          return {
            nombre:   f.producto.nombre,
            medida:   f.medida   || f.producto.medida   || null,
            material: f.material || f.producto.material || null,
            calibre:  f.calibre  || f.producto.calibre  || null,
            tintas:   f.tintas   || null,
            laminado: f.laminacion ? (f.tipoLaminado || "SI") : null,
            hs:       f.hs        ? (f.tipoHs        || "SI") : null,
            ar:       f.ar        ? "SI"                      : null,
            textura:  f.textura   ? (f.tipoTextura   || "SI") : null,
            uv:       f.uv        ? "SI"                      : null,
            asa:      f.asa       ? (f.tipoAsa       || "SI") : null,
            pigmento: f.modoExtra === "pigmento" ? (f.pigmento || f.extra || null) : null,
            detalles,
          };
        }),
      });

      limpiar();
    } catch (err) {
      console.error("Error al guardar e imprimir:", err);
      alert("No se pudo guardar la cotización.");
    } finally {
      setGuardando(false);
    }
  };

  const aprobarCotizacion = async (id: string, items: ItemPedidoAprobado[]) => {
    const cot = cotizaciones.find(c => c.id === id);
    if (!cot?.folio) return;
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
    } catch {
      alert("No se pudo aprobar la cotización.");
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
    onDragStart, onDragEnd, addProd, abrirEditar, eliminarProd, loadingCatalogo,
  };

  const propsHoja = {
    filas, cliente, coment, folio: folioActual || folioPreview, cant1, cant2, cant3,
    mob, tab, desk, over, catalogoPropio: catalogo,
    catalogs, foils, texturas, pigmentosDB, coloresAsa,
    setCliente, setComent, setCant1, setCant2, setCant3, setOver,
    onDrop, onEdit: editFila, onDel: delFila, onEditNombre: editNombreProducto,
    onAbrirDrawer: () => setDrawerOpen(true), onAgregarProducto: addProd,
    catalogosPlast,
    asesor: user ? `${user.nombre} ${user.apellido}`.trim() : "Asesor de Ventas",
  };

  // ── Sub-componentes UI ────────────────────────────────────────────────────
  const BotonesAccion = () => (
    <div className="no-print" style={{ display: "flex", gap: 10, width: "100%", maxWidth: desk ? 1100 : undefined, justifyContent: "flex-end" }}>
      {/* ← CAMBIO 3: botón SIGEB */}
      <button
        onClick={() => navigate("/home")}
        style={{
          background: "transparent",
          border: "1px solid #444",
          color: "#666",
          fontSize: 11,
          fontWeight: 600,
          padding: "7px 9px",
          borderRadius: 6,
          cursor: "pointer",
        }}
        title="Regresar a SIGEB"
      >
        🏠 SIGEB
      </button>
      <button onClick={() => setVista("registro")} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>← Cliente</button>
      <button onClick={limpiar} style={{ background: "transparent", border: "1px solid #555", color: "#AAA", fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Limpiar</button>
      <button onClick={guardarCotizacion} disabled={guardando} style={{ background: "transparent", border: "1px solid #C9922A", color: "#C9922A", fontSize: 12, fontWeight: 700, padding: "8px 18px", borderRadius: 6, cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? .7 : 1, fontFamily: "'Inter',sans-serif" }}>{guardando ? "Guardando..." : "💾 Guardar cotización"}</button>
      <button onClick={guardarEImprimir} disabled={guardando} style={{ background: "#C9922A", border: "none", color: "#1A1A1A", fontSize: 12, fontWeight: 700, padding: "8px 20px", borderRadius: 6, cursor: guardando ? "not-allowed" : "pointer", opacity: guardando ? .7 : 1, fontFamily: "'Inter',sans-serif" }}>{guardando ? "Guardando..." : "💾🖨 Guardar e Imprimir"}</button>
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

  const BadgeContador = ({ size }: { size: number }) =>
    cotizaciones.length > 0 ? (
      <span style={{ position: "absolute", top: -4, right: -4, background: "#C9922A", color: "#0D0D0D", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: size === 44 ? 17 : 20, height: size === 44 ? 17 : 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {cotizaciones.length}
      </span>
    ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
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
          onCotizar={irACotizar} onCerrar={() => setVista("cotizacion")}
          cotizacionesCount={cotizaciones.length}
          onAbrirLista={() => setListaAbierta(true)}
        />
      )}

      {vista === "cotizacion" && (<>
        {/* ── MÓVIL ── */}
        {mob && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#1A1A1A" }}>
            <div className="mob-bar no-print" style={{ background: "#111", borderBottom: "2px solid #C9922A", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: "#C9922A", fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif" }}>EB</div>
                <div>
                  <div style={{ color: "#FFF", fontSize: 11, fontWeight: 700 }}>EUROBOLSA</div>
                  <div style={{ color: "#666", fontSize: 9 }}>Cotizador Expo</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {/* ← CAMBIO 3: botón SIGEB */}
                <button
                  onClick={() => navigate("/home")}
                  style={{
                    background: "transparent",
                    border: "1px solid #444",
                    color: "#666",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "7px 9px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  title="Regresar a SIGEB"
                >
                  🏠 SIGEB
                </button>
                <button onClick={() => setVista("registro")} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }}>← Cliente</button>
                <button onClick={limpiar} style={{ background: "transparent", border: "1px solid #444", color: "#AAA", fontSize: 11, fontWeight: 600, padding: "7px 9px", borderRadius: 6, cursor: "pointer" }}>Limpiar</button>
                <button onClick={guardarCotizacion} disabled={guardando} style={{ background: "transparent", border: "1px solid #C9922A", color: "#C9922A", fontSize: 11, fontWeight: 700, padding: "7px 9px", borderRadius: 6, cursor: "pointer", opacity: guardando ? .7 : 1 }}>{guardando ? "..." : "💾"}</button>
                <button onClick={guardarEImprimir} disabled={guardando} style={{ background: "#C9922A", border: "none", color: "#1A1A1A", fontSize: 11, fontWeight: 700, padding: "7px 12px", borderRadius: 6, cursor: "pointer" }}>💾🖨</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
              <HojaCotizacion {...propsHoja} />
            </div>
            {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}
            <div className={`drawer ${drawerOpen ? "open" : "closed"}`}>
              <DrawerHeader label="SELECCIONA UN PRODUCTO" />
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
            <div className="no-print" style={{ background: "#111", borderBottom: "2px solid #C9922A", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: "#C9922A", fontSize: 24, fontWeight: 700, fontFamily: "Georgia,serif" }}>EB</div>
                <div>
                  <div style={{ color: "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>EUROBOLSA</div>
                  <div style={{ color: "#666", fontSize: 9, letterSpacing: .5 }}>Cotizador Expo</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {/* ← CAMBIO 3: botón SIGEB */}
                <button
                  onClick={() => navigate("/home")}
                  style={{
                    background: "transparent",
                    border: "1px solid #444",
                    color: "#666",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "7px 9px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                  title="Regresar a SIGEB"
                >
                  🏠 SIGEB
                </button>
                <button onClick={() => setVista("registro")} style={{ background: "transparent", border: "1px solid #333", color: "#888", fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>← Cliente</button>
                <button onClick={limpiar} style={{ background: "transparent", border: "1px solid #555", color: "#AAA", fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Limpiar</button>
                <button onClick={guardarCotizacion} disabled={guardando} style={{ background: "transparent", border: "1px solid #C9922A", color: "#C9922A", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 6, cursor: "pointer", opacity: guardando ? .7 : 1 }}>{guardando ? "Guardando..." : "💾 Guardar"}</button>
                <button onClick={guardarEImprimir} disabled={guardando} style={{ background: "#C9922A", border: "none", color: "#1A1A1A", fontSize: 12, fontWeight: 700, padding: "8px 18px", borderRadius: 6, cursor: "pointer" }}>💾🖨 Guardar e Imprimir</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
              <HojaCotizacion {...propsHoja} />
            </div>
            {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />}
            <div className={`drawer ${drawerOpen ? "open" : "closed"}`} style={{ maxHeight: "65vh" }}>
              <DrawerHeader label="CATÁLOGO — TAP PARA AGREGAR" />
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
              {catOpen && (
                <div style={{ padding: "8px 8px 4px", borderBottom: "1px solid #222", display: "flex", gap: 6, flexShrink: 0 }}>
                  {CATS.map(c => (
                    <button key={c.key} onClick={() => abrirNuevo(c.key as "papel" | "plastico" | "carton")}
                      style={{ flex: 1, background: `${c.color}18`, border: `1px solid ${c.color}44`, color: c.color, fontSize: 9, fontWeight: 700, padding: "5px 4px", borderRadius: 5, cursor: "pointer", letterSpacing: .5 }}>
                      {c.emoji} +{c.label}
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
    </>
  );
}