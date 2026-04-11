import { useState, useEffect, useRef } from "react";
import SelectorProducto, { CONFIG_PRODUCTOS } from "./ConfigurarProducto";
import type { DatosProducto, MedidaKey } from "../types/productos-plastico.types";
import { FORMATO_MEDIDAS } from "../types/productos-plastico.types";
import { searchClientes, createCliente, getClienteById } from "../services/clientesService";
import { searchProductosPlastico, crearOObtenerProducto, checkProductoDuplicado } from "../services/productosPlasticoService";
import { getCatalogosProduccion } from "../services/catalogosProduccionService";
import { usePreciosBatch } from "../hooks/usePrecioCalculado";
import { calcularPorKilo } from "../utils/calcularPorKilo";
import type { ClienteBusqueda } from "../types/clientes.types";
import type { CreateClienteRequest } from "../types/clientes.types";
import type { ProductoBusqueda, ProductoPlasticoCreate } from "../types/productos-plastico.types";
import type { Cara, Tinta } from "../types/catalogos-produccion.types";
import { getSuajes, getColoresAsa, getMedidasTroquel  } from "../services/suajesService";
import type { Suaje, ColorAsa, MedidaTroquel  } from "../services/suajesService";
import { getRegimenesFiscales, getMetodosPago, getFormasPago } from "../services/catalogosService";
import type { RegimenFiscal, MetodoPago, FormaPago } from "../types/clientes.types";

// ─── Monedas ────────────────────────────────────────────────────────────────
const MONEDAS = [
  { codigo: "MXN", nombre: "Peso mexicano (MXN)" },
  { codigo: "USD", nombre: "Dólar estadounidense (USD)" },
  { codigo: "EUR", nombre: "Euro (EUR)" },
  { codigo: "JPY", nombre: "Yen japonés (JPY)" },
  { codigo: "GBP", nombre: "Libra esterlina (GBP)" },
  { codigo: "CNY", nombre: "Yuan chino (CNY)" },
  { codigo: "CAD", nombre: "Dólar canadiense (CAD)" },
  { codigo: "CHF", nombre: "Franco suizo (CHF)" },
  { codigo: "AUD", nombre: "Dólar australiano (AUD)" },
  { codigo: "INR", nombre: "Rupia india (INR)" },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface FormularioCotizacionProps {
  onSubmit: (datos: DatosCotizacion) => void;
  onCancel: () => void;
  catalogos: {
    tiposProducto: any[];
    materiales:    any[];
    calibres:      any[];
  };
  modo?: "cotizacion" | "pedido";
}

interface Producto {
  productoId?:             number;
  nombre:                  string;
  cantidades:              [number, number, number];
  kilogramos:              [number, number, number];
  precios:                 [number, number, number];
  calibre:                 string;
  tintas:                  number;
  tintasId:                number;
  caras:                   number;
  carasId:                 number;
  material:                string;
  medidas:                 Record<MedidaKey, string>;
  medidasFormateadas:      string;
  porKilo?:                string;
  idsuaje?:                number | null;
  suajeTipo?:              string | null;
  colorAsaId?:             number | null;
  colorAsaNombre?:         string | null;
  idMedidaTroquel?:        number | null;
  medidaTroquelTexto?:     string | null;
  observacion?:            string;
  pantones?:               string | null;
  pigmentos?:              string | null;
  modoCantidad:            "unidad" | "kilo";
  // ── Herramental ────────────────────────────────────────
  herramental_descripcion?: string | null;
  herramental_precio?:      number | null;
}

interface DatosCotizacion {
  clienteId?:    number;
  cliente:       string;
  telefono:      string;
  correo:        string;
  empresa:       string;
  impresion?:    string | null;
  celular?:        string | null;
  razon_social?:   string | null;
  rfc?:            string | null;
  domicilio?:      string | null;
  numero?:         string | null;
  colonia?:        string | null;
  codigo_postal?:  string | null;
  poblacion?:      string | null;
  estado_cliente?: string | null;
  productos:     Producto[];
  observaciones: string;
  tipo?:         "cotizacion" | "pedido";
  prioridad?:    boolean;
}

// ─── Datos vacíos de cliente completo ────────────────────────────────────────
const clienteVacio: CreateClienteRequest = {
  empresa:                         "",
  correo:                          "",
  telefono:                        "",
  atencion:                        "",
  razon_social:                    "",
  impresion:                       "",
  celular:                         "",
  regimen_fiscal_idregimen_fiscal: 0,
  metodo_pago_idmetodo_pago:       0,
  forma_pago_idforma_pago:         0,
  rfc:                             "",
  correo_facturacion:              "",
  uso_cfdi:                        "",
  moneda:                          "MXN",
  domicilio:                       "",
  numero:                          "",
  colonia:                         "",
  codigo_postal:                   "",
  poblacion:                       "",
  estado:                          "",
};

export default function FormularioCotizacion({
  onSubmit,
  onCancel,
  catalogos,
  modo = "cotizacion",
}: FormularioCotizacionProps) {
  const [paso, setPaso] = useState(1);
  const [pasoCliente, setPasoCliente] = useState<1 | 2>(1);
  const [datos, setDatos] = useState<DatosCotizacion>({
    cliente:       "",
    telefono:      "",
    correo:        "",
    empresa:       "",
    impresion:     null,
    celular:         null,   // NUEVO
  razon_social:    null,   // NUEVO
  rfc:             null,   // NUEVO
  domicilio:       null,   // NUEVO
  numero:          null,   // NUEVO
  colonia:         null,   // NUEVO
  codigo_postal:   null,   // NUEVO
  poblacion:       null,   // NUEVO
  estado_cliente:  null,   // NUEVO
    productos:     [],
    observaciones: "",
    prioridad:     false,
  });

  const [datosClienteCompleto, setDatosClienteCompleto] = useState<CreateClienteRequest>(clienteVacio);
  const isMounted = useRef(false);

  const [regimenesFiscales, setRegimenesFiscales] = useState<RegimenFiscal[]>([]);
  const [metodosPago,       setMetodosPago]       = useState<MetodoPago[]>([]);
  const [formasPago,        setFormasPago]        = useState<FormaPago[]>([]);

  const [caras,      setCaras]      = useState<Cara[]>([]);
  const [tintas,     setTintas]     = useState<Tinta[]>([]);
  const [suajes,     setSuajes]     = useState<Suaje[]>([]);
  const [coloresAsa, setColoresAsa] = useState<ColorAsa[]>([]);

  const [mostrarModalClientes, setMostrarModalClientes] = useState(false);
  const [busquedaCliente,      setBusquedaCliente]      = useState("");
  const [clientesCargados,     setClientesCargados]     = useState<ClienteBusqueda[]>([]);
  const [loadingClientes,      setLoadingClientes]      = useState(false);
  const [errorClientes,        setErrorClientes]        = useState<string | null>(null);
  const [creandoCliente,       setCreandoCliente]       = useState(false);
  const [errorCrearCliente,    setErrorCrearCliente]    = useState<string | null>(null);

  const [modoProducto,          setModoProducto]          = useState<"registrado" | "nuevo">("registrado");
  const [productoNuevoListo,    setProductoNuevoListo]    = useState(false);
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false);
  const [busquedaProducto,      setBusquedaProducto]      = useState("");
  const [productosCargados,     setProductosCargados]     = useState<ProductoBusqueda[]>([]);
  const [loadingProductos,      setLoadingProductos]      = useState(false);
  const [errorProductos,        setErrorProductos]        = useState<string | null>(null);
  const [mostrarDropdownCaras,     setMostrarDropdownCaras]     = useState(false);
  const [mostrarDropdownTintas,    setMostrarDropdownTintas]    = useState(false);
  const [mostrarDropdownSuaje,     setMostrarDropdownSuaje]     = useState(false);
  const [mostrarDropdownColorAsa,  setMostrarDropdownColorAsa]  = useState(false);
  const [guardandoProducto,     setGuardandoProducto]     = useState(false);
  const [advertenciaDuplicado,  setAdvertenciaDuplicado]  = useState<string | null>(null);
  const [verificandoDuplicado,  setVerificandoDuplicado]  = useState(false);

  const [preciosEditadosManualmente, setPreciosEditadosManualmente] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [preciosTexto,               setPreciosTexto]               = useState<[string, string, string]>(["", "", ""]);

  const [modoColor,      setModoColor]      = useState<"pantones" | null>(null);
  const [inputsPantones, setInputsPantones] = useState<string[]>([]);

  const [modoCantidad,    setModoCantidad]    = useState<"unidad" | "kilo">("unidad");
  const [cantidadesTexto, setCantidadesTexto] = useState<[string, string, string]>(["", "", ""]);

  const [medidasTroquel,         setMedidasTroquel]         = useState<MedidaTroquel[]>([]);
  const [mostrarDropdownTroquel, setMostrarDropdownTroquel] = useState(false);

  // ── Herramental ────────────────────────────────────────────────────────────
  const [herramentalExpandido,   setHerramentalExpandido]   = useState(false);
  const [herramentalDescripcion, setHerramentalDescripcion] = useState("");
  const [herramentalPrecioTexto, setHerramentalPrecioTexto] = useState("");

  const estadoInicialProducto: Producto = {
    nombre:          "",
    cantidades:      [0, 0, 0],
    kilogramos:      [0, 0, 0],
    precios:         [0, 0, 0],
    calibre:         "200",
    tintas:          1,
    tintasId:        1,
    caras:           1,
    carasId:         1,
    material:        "",
    medidas: {
      altura: "", ancho: "", fuelleFondo: "",
      fuelleLateral1: "", fuelleLateral2: "",
      refuerzo: "", solapa: "",
    },
    medidasFormateadas:      "",
    idsuaje:                 null,
    suajeTipo:               null,
    colorAsaId:              null,
    colorAsaNombre:          null,
    idMedidaTroquel:         null,
    medidaTroquelTexto:      null,
    observacion:             "",
    pantones:                null,
    pigmentos:               null,
    modoCantidad:            "unidad",
    herramental_descripcion: null,
    herramental_precio:      null,
  };

  const [productoActual,     setProductoActual]     = useState<Producto>(estadoInicialProducto);
  const [datosProductoNuevo, setDatosProductoNuevo] = useState<DatosProducto>({
    tipoProducto: "", tipoProductoId: 0,
    material:     "", materialId: 0,
    calibre:      "", calibreId: 0,
    medidas: {
      altura: "", ancho: "", fuelleFondo: "",
      fuelleLateral1: "", fuelleLateral2: "",
      refuerzo: "", solapa: "",
    },
    medidasFormateadas: "",
    nombreCompleto:     "",
  });

  const calcularDesdeInput = (
    texto: [string, string, string],
    modo: "unidad" | "kilo",
    porKilo: string | undefined
  ): { bolsas: [number, number, number]; kgs: [number, number, number] } => {
    const porKiloNum = porKilo ? Number(porKilo) : 0;
    const bolsas = texto.map((v) => {
      const n = v === "" ? 0 : Number(v);
      if (n <= 0) return 0;
      if (modo === "kilo" && porKiloNum > 0) return Math.round(n * porKiloNum);
      return n;
    }) as [number, number, number];
    const kgs = texto.map((v) => {
      const n = v === "" ? 0 : Number(v);
      if (n <= 0) return 0;
      if (modo === "kilo") return n;
      if (porKiloNum > 0) return Number((n / porKiloNum).toFixed(4));
      return 0;
    }) as [number, number, number];
    return { bolsas, kgs };
  };

  const { bolsas: cantidadesEnBolsas } = calcularDesdeInput(
    cantidadesTexto,
    modoCantidad,
    productoActual.porKilo
  );

  const { resultados, loading: calculandoPrecios, error: errorCalculo } = usePreciosBatch({
    cantidades: cantidadesEnBolsas,
    porKilo:    productoActual.porKilo,
    tintasId:   productoActual.tintasId,
    carasId:    productoActual.carasId,
    enabled:    cantidadesEnBolsas.some(c => c > 0) && !!productoActual.porKilo,
  });

  useEffect(() => { cargarCatalogos(); }, []);

  useEffect(() => {
    if (modoColor === "pantones") {
      setInputsPantones((prev) =>
        Array(productoActual.tintas).fill("").map((_, i) => prev[i] || "")
      );
    }
  }, [productoActual.tintas, modoColor]);

  useEffect(() => {
    if (resultados.length === 0) return;
    setProductoActual(prev => {
      const nuevosPrecios = [...prev.precios] as [number, number, number];
      resultados.forEach((r, i) => {
        if (!preciosEditadosManualmente[i] && r?.precio_unitario !== undefined)
          nuevosPrecios[i] = r.precio_unitario;
      });
      return { ...prev, precios: nuevosPrecios };
    });
    setPreciosTexto(prev => {
      const nuevosTextos = [...prev] as [string, string, string];
      resultados.forEach((r, i) => {
        if (!preciosEditadosManualmente[i] && r?.precio_unitario !== undefined) {
          const precioMostrar =
            modoCantidad === "kilo" && productoActual.porKilo && Number(productoActual.porKilo) > 0
              ? r.precio_unitario * Number(productoActual.porKilo)
              : r.precio_unitario;
          nuevosTextos[i] = precioMostrar.toFixed(4);
        }
      });
      return nuevosTextos;
    });
  }, [resultados]);

  useEffect(() => {
    if (mostrarModalClientes && clientesCargados.length === 0) cargarClientes();
  }, [mostrarModalClientes]);

  useEffect(() => {
    if (!mostrarModalClientes) return;
    const timer = setTimeout(() => cargarClientes(busquedaCliente), 500);
    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  useEffect(() => {
    if (mostrarModalProductos && productosCargados.length === 0) cargarProductos();
  }, [mostrarModalProductos]);

  useEffect(() => {
    if (!mostrarModalProductos) return;
    const timer = setTimeout(() => cargarProductos(busquedaProducto), 500);
    return () => clearTimeout(timer);
  }, [busquedaProducto]);

  useEffect(() => {
    setCantidadesTexto(["", "", ""]);
    setProductoActual(prev => ({ ...prev, cantidades: [0, 0, 0], kilogramos: [0, 0, 0], precios: [0, 0, 0] }));
    setPreciosEditadosManualmente([false, false, false]);
    setPreciosTexto(["", "", ""]);
  }, [modoCantidad]);

  // Limpiar precios cuando cambian tintas o caras
useEffect(() => {
  if (!isMounted.current) {
    isMounted.current = true;
    return;
  }
  setPreciosEditadosManualmente([false, false, false]);
  setPreciosTexto(["", "", ""]);
  setProductoActual(prev => ({ ...prev, precios: [0, 0, 0] }));
}, [productoActual.tintasId, productoActual.carasId]);

  const cargarCatalogos = async () => {
    try {
      const [catalogosData, suajesData, regimenesData, metodosData, formasData, coloresAsaData, medidasTroquelData] = await Promise.all([
        getCatalogosProduccion(),
        getSuajes(),
        getRegimenesFiscales(),
        getMetodosPago(),
        getFormasPago(),
        getColoresAsa(),
        getMedidasTroquel(),
      ]);
      setCaras(catalogosData.caras);
      setTintas(catalogosData.tintas);
      setSuajes(suajesData);
      setRegimenesFiscales(regimenesData);
      setMetodosPago(metodosData);
      setFormasPago(formasData);
      setColoresAsa(coloresAsaData);
      setMedidasTroquel(medidasTroquelData);
    } catch (error) {
      console.error("❌ Error al cargar catálogos:", error);
    }
  };

  const cargarClientes = async (query?: string) => {
    setLoadingClientes(true);
    setErrorClientes(null);
    try {
      const clientes = await searchClientes(query);
      setClientesCargados(clientes);
    } catch (error: any) {
      setErrorClientes(error.response?.data?.error || "Error al cargar clientes");
    } finally {
      setLoadingClientes(false);
    }
  };

  const crearNuevoClienteCompleto = async () => {
    setCreandoCliente(true);
    setErrorCrearCliente(null);
    try {
      const datosFinales = { ...datosClienteCompleto };
      if (datosFinales.empresa)            datosFinales.empresa            = datosFinales.empresa.trim();
      if (datosFinales.correo)             datosFinales.correo             = datosFinales.correo.trim().toLowerCase();
      if (datosFinales.telefono)           datosFinales.telefono           = datosFinales.telefono.replace(/\D/g, "");
      if (datosFinales.celular)            datosFinales.celular            = datosFinales.celular.replace(/\D/g, "");
      if (datosFinales.rfc)                datosFinales.rfc                = datosFinales.rfc.trim().toUpperCase();
      if (datosFinales.correo_facturacion) datosFinales.correo_facturacion = datosFinales.correo_facturacion.trim().toLowerCase();

      const response = await createCliente(datosFinales);
      const clienteId = response?.cliente?.id ?? response?.id;

      setDatos(prev => ({
        ...prev,
        clienteId,
        cliente:   datosFinales.atencion  || datosFinales.empresa || "",
        telefono:  datosFinales.telefono  || "",
        correo:    datosFinales.correo    || "",
        empresa:   datosFinales.empresa   || "",
        impresion: datosFinales.impresion || null,
      }));
      setPaso(2);
    } catch (error: any) {
      setErrorCrearCliente(error.response?.data?.error || "Error al crear cliente");
    } finally {
      setCreandoCliente(false);
    }
  };

  /*const seleccionarCliente = (cliente: ClienteBusqueda) => {
    setDatos({
      ...datos,
      clienteId:      cliente.idclientes,
    cliente:        cliente.atencion       || "",
    telefono:       cliente.telefono       || "",
    correo:         cliente.correo         || "",
    empresa:        cliente.empresa        || "",
    impresion:      cliente.impresion      ?? null,
    celular:        cliente.celular        ?? null,
    razon_social:   cliente.razon_social   ?? null,
    rfc:            cliente.rfc            ?? null,
    domicilio:      cliente.domicilio      ?? null,
    numero:         cliente.numero         ?? null,
    colonia:        cliente.colonia        ?? null,
    codigo_postal:  cliente.codigo_postal  ?? null,
    poblacion:      cliente.poblacion      ?? null,
    estado_cliente: cliente.estado        ?? null,
    });
    setMostrarModalClientes(false);
    setBusquedaCliente("");
  };*/

  // ── seleccionarCliente — fetch completo con getClienteById ────────────────
const seleccionarCliente = async (cliente: ClienteBusqueda) => {
  setMostrarModalClientes(false);
  setBusquedaCliente("");

  // Traer el cliente completo para tener domicilio, RFC, etc.
  try {
    const completo = await getClienteById(cliente.idclientes);
    setDatos(prev => ({
      ...prev,
      clienteId:      completo.idclientes,
      cliente:        completo.atencion       || "",
      telefono:       completo.telefono       || "",
      correo:         completo.correo         || "",
      empresa:        completo.empresa        || "",
      impresion:      completo.impresion      ?? null,
      celular:        completo.celular        ?? null,
      razon_social:   completo.razon_social   ?? null,
      rfc:            completo.rfc            ?? null,
      domicilio:      completo.domicilio      ?? null,
      numero:         completo.numero         ?? null,
      colonia:        completo.colonia        ?? null,
      codigo_postal:  completo.codigo_postal  ?? null,
      poblacion:      completo.poblacion      ?? null,
      estado_cliente: completo.estado         ?? null,
    }));
  } catch {
    // Fallback con lo que ya tiene el objeto de búsqueda
    setDatos(prev => ({
      ...prev,
      clienteId: cliente.idclientes,
      cliente:   cliente.atencion  || "",
      telefono:  cliente.telefono  || "",
      correo:    cliente.correo    || "",
      empresa:   cliente.empresa   || "",
      impresion: cliente.impresion ?? null,
    }));
  }
};

  const cargarProductos = async (query?: string) => {
    setLoadingProductos(true);
    setErrorProductos(null);
    try {
      const productos = await searchProductosPlastico(query);
      setProductosCargados(productos);
    } catch (error: any) {
      setErrorProductos(error.response?.data?.error || "Error al cargar productos");
    } finally {
      setLoadingProductos(false);
    }
  };

  const seleccionarProducto = (producto: ProductoBusqueda) => {
    const medidasMapeadas: Record<MedidaKey, string> = {
      altura:         producto.altura.toString(),
      ancho:          producto.ancho.toString(),
      fuelleFondo:    producto.fuelle_fondo.toString(),
      fuelleLateral1: producto.fuelle_lateral_izquierdo.toString(),
      fuelleLateral2: producto.fuelle_lateral_derecho.toString(),
      refuerzo:       producto.refuerzo.toString(),
      solapa:         "",
    };
    setProductoActual({
      productoId:              producto.id,
      nombre:                  `${producto.tipo_producto} ${producto.medida} ${producto.material.toLowerCase()}`,
      cantidades:              [0, 0, 0],
      kilogramos:              [0, 0, 0],
      precios:                 [0, 0, 0],
      calibre:                 producto.calibre.toString(),
      tintas:                  tintas[0]?.cantidad || 1,
      tintasId:                tintas[0]?.id       || 1,
      caras:                   caras[0]?.cantidad  || 1,
      carasId:                 caras[0]?.id        || 1,
      material:                producto.material,
      medidas:                 medidasMapeadas,
      medidasFormateadas:      producto.medida,
      porKilo:                 producto.por_kilo,
      idsuaje:                 null,
      suajeTipo:               null,
      colorAsaId:              null,
      colorAsaNombre:          null,
      pantones:                null,
      pigmentos:               null,
      modoCantidad:            modoCantidad,
      herramental_descripcion: null,
      herramental_precio:      null,
    });
    setCantidadesTexto(["", "", ""]);
    setPreciosEditadosManualmente([false, false, false]);
    setPreciosTexto(["", "", ""]);
    setModoColor(null);
    setInputsPantones([]);
    setHerramentalExpandido(false);
    setHerramentalDescripcion("");
    setHerramentalPrecioTexto("");
    setMostrarModalProductos(false);
    setBusquedaProducto("");
  };

  const crearYAgregarProductoNuevo = async (): Promise<Producto | null> => {
    setGuardandoProducto(true);
    try {
      const porKiloCalculado = calcularPorKilo(datosProductoNuevo, catalogos.materiales);
      const productoData: ProductoPlasticoCreate = {
        tipo_producto_plastico_id: datosProductoNuevo.tipoProductoId,
        material_plastico_id:      datosProductoNuevo.materialId,
        calibre_id:                datosProductoNuevo.calibreId,
        altura:       Number(datosProductoNuevo.medidas.altura)         || 0,
        ancho:        Number(datosProductoNuevo.medidas.ancho)          || 0,
        fuelle_fondo: Number(datosProductoNuevo.medidas.fuelleFondo)    || 0,
        fuelle_latIz: Number(datosProductoNuevo.medidas.fuelleLateral1) || 0,
        fuelle_latDe: Number(datosProductoNuevo.medidas.fuelleLateral2) || 0,
        refuerzo:     Number(datosProductoNuevo.medidas.refuerzo)       || 0,
        medida:       datosProductoNuevo.medidasFormateadas,
        por_kilo:     porKiloCalculado ?? 0,
      };
      const response = await crearOObtenerProducto(productoData);
      const productoConId: Producto = {
        ...productoActual,
        productoId: response.producto.id,
        porKilo:    response.producto.por_kilo,
      };
      setProductoActual(productoConId);
      return productoConId;
    } catch (error: any) {
      console.error("Error al crear/obtener producto:", error);
      alert(error.response?.data?.error || "Error al guardar producto");
      return null;
    } finally {
      setGuardandoProducto(false);
    }
  };

  const verificarDuplicadoAntesDeConfirmar = async () => {
    const m = datosProductoNuevo.medidas;
    if (
      !datosProductoNuevo.tipoProductoId ||
      !datosProductoNuevo.materialId     ||
      !datosProductoNuevo.calibreId      ||
      !m.altura || !m.ancho
    ) {
      setProductoNuevoListo(true);
      setAdvertenciaDuplicado(null);
      return;
    }
    setVerificandoDuplicado(true);
    setAdvertenciaDuplicado(null);
    try {
      const resultado = await checkProductoDuplicado({
        tipo_producto_plastico_id: datosProductoNuevo.tipoProductoId,
        material_plastico_id:      datosProductoNuevo.materialId,
        calibre_id:                datosProductoNuevo.calibreId,
        altura:       Number(m.altura)         || 0,
        ancho:        Number(m.ancho)          || 0,
        fuelle_fondo: Number(m.fuelleFondo)    || 0,
        fuelle_latIz: Number(m.fuelleLateral1) || 0,
        fuelle_latDe: Number(m.fuelleLateral2) || 0,
        refuerzo:     Number(m.refuerzo)       || 0,
      });
      if (resultado.existe) setAdvertenciaDuplicado(resultado.detalle ?? null);
    } catch {
      // si falla la verificación no bloqueamos
    } finally {
      setVerificandoDuplicado(false);
      setProductoNuevoListo(true);
    }
  };

  const handleProductoNuevoChange = (nuevosDatos: DatosProducto) => {
    setDatosProductoNuevo(nuevosDatos);
    setAdvertenciaDuplicado(null);
    const porKiloCalculado = calcularPorKilo(nuevosDatos, catalogos.materiales);
    const porKiloStr = porKiloCalculado !== null
      ? parseFloat(porKiloCalculado.toFixed(3)).toString()
      : undefined;
    setProductoActual((prev) => ({
      ...prev,
      nombre:             nuevosDatos.nombreCompleto,
      material:           nuevosDatos.material,
      calibre:            nuevosDatos.calibre,
      medidas:            { ...nuevosDatos.medidas },
      medidasFormateadas: nuevosDatos.medidasFormateadas,
      porKilo:            porKiloStr,
    }));
  };

  const esNumeroEnteroValido = (val: string) => /^\d*$/.test(val);
  const esDecimalValido      = (val: string) => /^\d*\.?\d{0,4}$/.test(val);

  const handleCantidadChange = (index: number, value: string) => {
    if (!esNumeroEnteroValido(value)) return;
    const nuevasTexto = [...cantidadesTexto] as [string, string, string];
    nuevasTexto[index] = value;
    setCantidadesTexto(nuevasTexto);
    const { bolsas, kgs } = calcularDesdeInput(nuevasTexto, modoCantidad, productoActual.porKilo);
    const nuevosFlags = [...preciosEditadosManualmente] as [boolean, boolean, boolean];
    nuevosFlags[index] = false;
    setProductoActual(prev => ({ ...prev, cantidades: bolsas, kilogramos: kgs }));
    setPreciosEditadosManualmente(nuevosFlags);
  };

  const handlePrecioChange = (index: number, value: string) => {
    if (!esDecimalValido(value)) return;
    const nuevosTextos = [...preciosTexto] as [string, string, string];
    nuevosTextos[index] = value;
    setPreciosTexto(nuevosTextos);
    const nuevosFlags = [...preciosEditadosManualmente] as [boolean, boolean, boolean];
    nuevosFlags[index] = true;
    setPreciosEditadosManualmente(nuevosFlags);
    const nuevosPrecios = [...productoActual.precios] as [number, number, number];
    const parsed = parseFloat(value);
    if (modoCantidad === "kilo" && productoActual.porKilo && Number(productoActual.porKilo) > 0) {
      nuevosPrecios[index] = isNaN(parsed) ? 0 : parsed / Number(productoActual.porKilo);
    } else {
      nuevosPrecios[index] = isNaN(parsed) ? 0 : parsed;
    }
    setProductoActual(prev => ({ ...prev, precios: nuevosPrecios }));
  };

  const handlePrecioBlur = (index: number) => {
    const nuevosTextos = [...preciosTexto] as [string, string, string];
    const valor = parseFloat(nuevosTextos[index]);
    if (isNaN(valor) || nuevosTextos[index] === "") {
      const nuevosFlags = [...preciosEditadosManualmente] as [boolean, boolean, boolean];
      nuevosFlags[index] = false;
      setPreciosEditadosManualmente(nuevosFlags);
      nuevosTextos[index] = "";
    } else {
      nuevosTextos[index] = valor.toFixed(4);
    }
    setPreciosTexto(nuevosTextos);
  };

  const handleRestaurarPrecioAuto = (index: number) => {
    const nuevosFlags = [...preciosEditadosManualmente] as [boolean, boolean, boolean];
    nuevosFlags[index] = false;
    setPreciosEditadosManualmente(nuevosFlags);
    const nuevosTextos = [...preciosTexto] as [string, string, string];
    nuevosTextos[index] = "";
    setPreciosTexto(nuevosTextos);
  };

  const handleObservacionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProductoActual(prev => ({ ...prev, observacion: e.target.value }));
  };

  const sanitizarTexto = (texto: string): string =>
    texto.replace(/[,|]/g, "").replace(/\s+/g, " ").trim();

  const handleCambiarModoColor = (modo: "pantones") => {
    if (modoColor === modo) { setModoColor(null); return; }
    setModoColor(modo);
    if (modo === "pantones") {
      if (productoActual.pantones) {
        const arr = productoActual.pantones.split(", ").map(s => s.trim());
        setInputsPantones(Array(productoActual.tintas).fill("").map((_, i) => arr[i] || ""));
      } else {
        setInputsPantones(Array(productoActual.tintas).fill(""));
      }
    }
  };

  const handlePantoneChange = (index: number, value: string) => {
    const sanitizado = sanitizarTexto(value);
    const nuevos = [...inputsPantones];
    nuevos[index] = sanitizado;
    setInputsPantones(nuevos);
    setProductoActual(prev => ({
      ...prev,
      pantones: nuevos.join(", ").replace(/^[\s,]+|[\s,]+$/g, "") || null,
    }));
  };

  const handlePigmentoChange = (value: string) => {
    setProductoActual(prev => ({ ...prev, pigmentos: sanitizarTexto(value) || null }));
  };

  // ── Herramental handlers ────────────────────────────────────────────────────
  const handleHerramentalToggle = () => {
    const nuevo = !herramentalExpandido;
    setHerramentalExpandido(nuevo);
    // Si cierra y estaba vacío, limpia
    if (!nuevo && !herramentalDescripcion && !herramentalPrecioTexto) {
      setProductoActual(prev => ({ ...prev, herramental_descripcion: null, herramental_precio: null }));
    }
  };

  const handleHerramentalDescripcionChange = (value: string) => {
    setHerramentalDescripcion(value);
    setProductoActual(prev => ({ ...prev, herramental_descripcion: value.trim() || null }));
  };

  const handleHerramentalPrecioChange = (value: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;
    setHerramentalPrecioTexto(value);
    const parsed = parseFloat(value);
    setProductoActual(prev => ({ ...prev, herramental_precio: isNaN(parsed) ? null : parsed }));
  };

  const handleHerramentalLimpiar = () => {
    setHerramentalDescripcion("");
    setHerramentalPrecioTexto("");
    setProductoActual(prev => ({ ...prev, herramental_descripcion: null, herramental_precio: null }));
    setHerramentalExpandido(false);
  };

  const herramentalTieneData =
    !!herramentalDescripcion.trim() || (herramentalPrecioTexto !== "" && parseFloat(herramentalPrecioTexto) > 0);

  const handleAgregarProducto = async () => {
    const { bolsas: cantsBolsas, kgs: catsKgs } = calcularDesdeInput(
      cantidadesTexto, modoCantidad, productoActual.porKilo
    );
    const tieneValoresValidos = cantsBolsas.some(
      (cant, i) => cant > 0 && productoActual.precios[i] > 0
    );
    if (!productoActual.nombre || !tieneValoresValidos) {
      alert("Por favor completa los datos del producto");
      return;
    }
    if (hayErrorKg) {
      alert("Una o más cantidades no cumplen el mínimo de 30 kg.");
      return;
    }

    // Parsear herramental
    const herramentalPrecioFinal = herramentalPrecioTexto !== ""
      ? parseFloat(herramentalPrecioTexto) || null
      : null;
    const herramentalDescFinal = herramentalDescripcion.trim() || null;

    let productoParaAgregar: Producto = {
      ...productoActual,
      cantidades:              cantsBolsas,
      kilogramos:              catsKgs,
      modoCantidad:            modoCantidad,
      herramental_descripcion: herramentalDescFinal,
      herramental_precio:      herramentalPrecioFinal,
    };
    if (modoProducto === "nuevo" && !productoActual.productoId) {
      const productoCreado = await crearYAgregarProductoNuevo();
      if (!productoCreado) return;
      productoParaAgregar = {
        ...productoCreado,
        cantidades:              cantsBolsas,
        kilogramos:              catsKgs,
        modoCantidad,
        herramental_descripcion: herramentalDescFinal,
        herramental_precio:      herramentalPrecioFinal,
      };
    }
    setDatos(prev => ({ ...prev, productos: [...prev.productos, productoParaAgregar] }));
    resetearFormularioProducto();
  };

  const resetearFormularioProducto = () => {
    setModoProducto("registrado");
    setProductoNuevoListo(false);
    setProductoActual({
      nombre:     "",
      cantidades: [0, 0, 0],
      kilogramos: [0, 0, 0],
      precios:    [0, 0, 0],
      calibre:    "200",
      tintas:     tintas[0]?.cantidad || 1,
      tintasId:   tintas[0]?.id       || 1,
      caras:      caras[0]?.cantidad  || 1,
      carasId:    caras[0]?.id        || 1,
      material:   "",
      medidas: {
        altura: "", ancho: "", fuelleFondo: "",
        fuelleLateral1: "", fuelleLateral2: "",
        refuerzo: "", solapa: "",
      },
      medidasFormateadas:      "",
      idsuaje:                 null,
      suajeTipo:               null,
      colorAsaId:              null,
      colorAsaNombre:          null,
      idMedidaTroquel:         null,
      medidaTroquelTexto:      null,
      observacion:             "",
      pantones:                null,
      pigmentos:               null,
      modoCantidad:            "unidad",
      herramental_descripcion: null,
      herramental_precio:      null,
    });
    setDatosProductoNuevo({
      tipoProducto: "", tipoProductoId: 0,
      material:     "", materialId: 0,
      calibre:      "", calibreId: 0,
      medidas: {
        altura: "", ancho: "", fuelleFondo: "",
        fuelleLateral1: "", fuelleLateral2: "",
        refuerzo: "", solapa: "",
      },
      medidasFormateadas: "",
      nombreCompleto:     "",
    });
    setPreciosEditadosManualmente([false, false, false]);
    setPreciosTexto(["", "", ""]);
    setCantidadesTexto(["", "", ""]);
    setModoCantidad("unidad");
    setMostrarDropdownSuaje(false);
    setMostrarDropdownColorAsa(false);
    setMostrarDropdownTroquel(false);
    setModoColor(null);
    setInputsPantones([]);
    setAdvertenciaDuplicado(null);
    // Herramental
    setHerramentalExpandido(false);
    setHerramentalDescripcion("");
    setHerramentalPrecioTexto("");
  };

  const handleEliminarProducto = (index: number) => {
    setDatos(prev => ({ ...prev, productos: prev.productos.filter((_, i) => i !== index) }));
  };

  const handleSiguientePasoCliente = () => {
    if (pasoCliente === 1) { setPasoCliente(2); return; }
    crearNuevoClienteCompleto();
  };

  const handleAvanzarConClienteExistente = () => {
    if (datos.clienteId) { setPaso(2); }
  };

  const handleAtras = () => {
    if (paso === 2) setPaso(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (datos.productos.length > 0) onSubmit({ ...datos, tipo: modo });
  };

const calcularTotal = () =>
  datos.productos.reduce((total, prod) => {
    const pk = Number(prod.porKilo || 1);
    const subtotalProducto = prod.cantidades.reduce((sum, cant, i) => {
      if (!cant || cant <= 0) return sum;
      if (prod.modoCantidad === "kilo") {
        const precioKg = Math.round(prod.precios[i] * pk * 100) / 100;
        const importe  = Math.round(prod.kilogramos[i] * precioKg * 100) / 100;
        return sum + importe;
      }
      return sum + Math.round(cant * prod.precios[i] * 100) / 100;
    }, 0);
    const herramental = prod.herramental_precio ?? 0;
    return total + subtotalProducto + herramental;
  }, 0);

  const hayProductoSeleccionado =
    (modoProducto === "registrado" && productoActual.nombre) ||
    (modoProducto === "nuevo"      && productoNuevoListo);

  const labelCantidad = modoCantidad === "kilo" ? "kg" : "bolsas";

  const getEquivalente = (index: number): string | null => {
    const n  = cantidadesTexto[index] === "" ? 0 : Number(cantidadesTexto[index]);
    const pk = productoActual.porKilo ? Number(productoActual.porKilo) : 0;
    if (!pk || n <= 0) return null;
    if (modoCantidad === "unidad") return `≈ ${(n / pk).toFixed(2)} kg`;
    return `≈ ${Math.round(n * pk).toLocaleString()} bolsas`;
  };

  const MIN_KG = 30;
  const getErrorKg = (index: number): string | null => {
    const n  = cantidadesTexto[index] === "" ? 0 : Number(cantidadesTexto[index]);
    if (n <= 0) return null;
    const pk = productoActual.porKilo ? Number(productoActual.porKilo) : 0;
    let kgs  = 0;
    if (modoCantidad === "kilo") { kgs = n; }
    else if (pk > 0)             { kgs = n / pk; }
    else                         { return null; }
    const kgsR = Math.round(kgs * 10000) / 10000;
    if (kgsR < MIN_KG) {
      const faltan = (MIN_KG - kgsR).toFixed(2);
      if (modoCantidad === "kilo") return `Mínimo ${MIN_KG} kg (faltan ${faltan} kg)`;
      return `Mínimo ${MIN_KG} kg ≈ ${Math.ceil(MIN_KG * pk).toLocaleString()} bolsas`;
    }
    return null;
  };

  const indicesCantidad = modo === "pedido" ? [0] : [0, 1, 2];
  const hayErrorKg = indicesCantidad.some((i) => {
    const v = cantidadesTexto[i];
    if (v === "" || Number(v) <= 0) return false;
    return getErrorKg(i) !== null;
  });

  const tieneLateral =
    Number(datosProductoNuevo.medidas.fuelleLateral1) > 0 ||
    Number(datosProductoNuevo.medidas.fuelleLateral2) > 0;
  const tieneFondoORefuerzo =
    Number(datosProductoNuevo.medidas.fuelleFondo) > 0 ||
    Number(datosProductoNuevo.medidas.refuerzo) > 0;

  const construirMedidasFormateadasLocal = (medidas: Record<MedidaKey, string>) => {
    const verticales   = FORMATO_MEDIDAS.verticales.map((k)  => medidas[k]).filter((v) => v && Number(v) > 0);
    const horizontales = FORMATO_MEDIDAS.horizontales.map((k) => medidas[k]).filter((v) => v && Number(v) > 0);
    if (!verticales.length && !horizontales.length) return "";
    if (!horizontales.length) return verticales.join("+");
    if (!verticales.length)   return horizontales.join("+");
    return `${verticales.join("+")}x${horizontales.join("+")}`;
  };

  const setMedidaInline = (key: MedidaKey, value: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;
    const v    = value.trim();
    const prev = datosProductoNuevo.medidas as Record<MedidaKey, string>;
    let nuevas = { ...prev, [key]: v };
    if (key === "fuelleLateral1" || key === "fuelleLateral2") {
      nuevas.fuelleLateral1 = v;
      nuevas.fuelleLateral2 = v;
      if (v !== "" && Number(v) > 0) { nuevas.refuerzo = "0"; nuevas.fuelleFondo = "0"; }
    }
    if (key === "refuerzo" || key === "fuelleFondo") {
      if (v !== "" && Number(v) > 0) { nuevas.fuelleLateral1 = "0"; nuevas.fuelleLateral2 = "0"; }
    }
    const medidasFormateadas = construirMedidasFormateadasLocal(nuevas);
    const datosActualizados  = { ...datosProductoNuevo, medidas: nuevas, medidasFormateadas };
    if (datosProductoNuevo.tipoProducto && datosProductoNuevo.material && medidasFormateadas) {
      datosActualizados.nombreCompleto = `${datosProductoNuevo.tipoProducto} ${medidasFormateadas} ${datosProductoNuevo.material.toLowerCase()}`;
    }
    setDatosProductoNuevo(datosActualizados);
    const porKiloCalculado = calcularPorKilo(datosActualizados, catalogos.materiales);
    const porKiloStr = porKiloCalculado !== null
      ? parseFloat(porKiloCalculado.toFixed(3)).toString()
      : undefined;
    setProductoActual((prev) => ({
      ...prev,
      nombre:             datosActualizados.nombreCompleto,
      medidas:            { ...nuevas },
      medidasFormateadas,
      porKilo:            porKiloStr,
    }));
    setAdvertenciaDuplicado(null);
  };

  const getEsAsaFlexible = (): boolean => {
    const tipo = modoProducto === "nuevo"
      ? datosProductoNuevo.tipoProducto
      : productoActual.nombre;
    return (tipo || "").toLowerCase().includes("asa flexible");
  };

  const getEsTroquel = (): boolean => {
    const tipo = modoProducto === "nuevo"
      ? datosProductoNuevo.tipoProducto
     : productoActual.nombre;
    return (tipo || "").toLowerCase().includes("troquelada");
  };

  const inputCliente = (
    label: string,
    name: keyof CreateClienteRequest,
    placeholder: string,
    opts?: { type?: string; maxLength?: number; soloNumeros?: boolean }
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type={opts?.type || "text"}
        name={name as string}
        value={(datosClienteCompleto[name] as string) || ""}
        onChange={(e) => {
          const val = opts?.soloNumeros ? e.target.value.replace(/\D/g, "") : e.target.value;
          setDatosClienteCompleto(prev => ({ ...prev, [name]: val }));
        }}
        maxLength={opts?.maxLength}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-400"
        placeholder={placeholder}
      />
    </div>
  );

  const esBopp = productoActual.material?.toUpperCase().includes("BOPP") ||
                 productoActual.material?.toUpperCase().includes("CELOFAN") ||
                 productoActual.material?.toUpperCase().includes("CELOFÁN");

  return (
    <div className="relative">

      {/* ── MODAL CLIENTES ── */}
      {mostrarModalClientes && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Buscar Cliente Existente</h3>
                <button onClick={() => { setMostrarModalClientes(false); setBusquedaCliente(""); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="relative">
                <input type="text" value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)}
                  placeholder="Buscar por N° cliente, nombre, empresa, impresión, teléfono o correo..."
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white" autoFocus />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              {loadingClientes ? (
                <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div><p className="mt-4 text-gray-600">Cargando...</p></div>
              ) : errorClientes ? (
                <div className="p-8 text-center"><p className="text-gray-700">{errorClientes}</p><button onClick={() => cargarClientes(busquedaCliente)} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg">Reintentar</button></div>
              ) : clientesCargados.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {clientesCargados.map((c) => (
                    <div key={c.idclientes} onClick={() => seleccionarCliente(c)} className="p-4 hover:bg-purple-50 cursor-pointer transition-colors">
                      <h4 className="font-semibold text-gray-900">{c.atencion || "Sin nombre"}</h4>
                      {c.empresa && <p className="text-sm text-gray-600 mt-1">{c.empresa}</p>}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        {c.telefono && <span>{c.telefono}</span>}
                        {c.correo   && <span>{c.correo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No se encontraron clientes</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL PRODUCTOS ── */}
      {mostrarModalProductos && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Buscar Producto Existente</h3>
                <button onClick={() => { setMostrarModalProductos(false); setBusquedaProducto(""); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="relative">
                <input type="text" value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar por medidas, material, calibre o tipo..."
                  className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" autoFocus />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              {loadingProductos ? (
                <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div><p className="mt-4 text-gray-600">Cargando...</p></div>
              ) : errorProductos ? (
                <div className="p-8 text-center"><p className="text-gray-700">{errorProductos}</p><button onClick={() => cargarProductos(busquedaProducto)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Reintentar</button></div>
              ) : productosCargados.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {productosCargados.map((p) => (
                    <div key={p.id} onClick={() => seleccionarProducto(p)} className="p-4 hover:bg-blue-50 cursor-pointer transition-colors">
                      <h4 className="font-semibold text-gray-900">{p.tipo_producto} {p.medida} {p.material.toLowerCase()}</h4>
                      <div className="flex flex-wrap gap-x-4 mt-2 text-sm text-gray-600">
                        <span>Calibre: {p.calibre}</span>
                        <span>Medidas: {p.medida}</span>
                        <span>Por kilo: {p.por_kilo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">No se encontraron productos</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INDICADOR DE PASOS PRINCIPAL ── */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${paso === 1 ? "bg-blue-600 text-white" : "bg-green-600 text-white"}`}>
            {paso === 1 ? "1" : "✓"}
          </div>
          <div className={`w-24 h-1 ${paso === 2 ? "bg-blue-600" : "bg-gray-300"}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${paso === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}>2</div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          PASO 1 — CLIENTE
      ════════════════════════════════════════════════════════ */}
      <div className={paso === 1 ? "block" : "hidden"}>
        {datos.clienteId ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cliente seleccionado</h3>
              <button type="button" onClick={() => setMostrarModalClientes(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Cambiar cliente
              </button>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">{datos.cliente || datos.empresa || "Sin nombre"}</p>
              {datos.empresa && datos.cliente && <p className="text-sm text-gray-600 mt-1">{datos.empresa}</p>}
              <div className="flex gap-4 mt-2 text-sm text-gray-500">
                {datos.telefono && <span>{datos.telefono}</span>}
                {datos.correo   && <span>{datos.correo}</span>}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={handleAvanzarConClienteExistente} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Siguiente</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {pasoCliente === 1 ? "Datos del Cliente" : "Datos de Facturación (SAT)"}
              </h3>
              <button type="button" onClick={() => setMostrarModalClientes(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Cliente Existente
              </button>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${pasoCliente === 1 ? "bg-blue-600 text-white" : "bg-green-600 text-white"}`}>
                  {pasoCliente === 1 ? "A" : "✓"}
                </div>
                <div className={`w-20 h-1 ${pasoCliente === 2 ? "bg-blue-600" : "bg-gray-300"}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${pasoCliente === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-500"}`}>B</div>
              </div>
            </div>

            {errorCrearCliente && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{errorCrearCliente}</p>
              </div>
            )}

            {pasoCliente === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {inputCliente("Nombre de Empresa", "empresa", "Empresa Ejemplo S.A.")}
                  {inputCliente("Correo Electrónico", "correo", "contacto@empresa.com")}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {inputCliente("Atención (Nombre contacto)", "atencion", "Juan Pérez")}
                  {inputCliente("Razón Social", "razon_social", "EMPRESA EJEMPLO SA DE CV")}
                </div>
                {inputCliente("Impresión / Notas", "impresion", "CocaCola, Abito...")}
                <div className="grid grid-cols-2 gap-4">
                  {inputCliente("Teléfono", "telefono", "3312345678", { soloNumeros: true, maxLength: 15 })}
                  {inputCliente("Celular", "celular", "3398765432", { soloNumeros: true, maxLength: 15 })}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domicilio</label>
                  <div className="grid grid-cols-3 gap-4">
                    {inputCliente("", "domicilio", "Calle")}
                    {inputCliente("", "numero", "Número")}
                    {inputCliente("", "colonia", "Colonia")}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {inputCliente("Código Postal", "codigo_postal", "44100", { soloNumeros: true, maxLength: 5 })}
                  {inputCliente("Población", "poblacion", "Guadalajara")}
                  {inputCliente("Estado", "estado", "Jalisco")}
                </div>
              </div>
            )}

            {pasoCliente === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400 -mt-2 mb-4">Todos los campos son opcionales — puedes completarlos después desde el catálogo de clientes.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RFC</label>
                    <input type="text" value={datosClienteCompleto.rfc || ""}
                      onChange={(e) => setDatosClienteCompleto(prev => ({ ...prev, rfc: e.target.value.toUpperCase() }))}
                      maxLength={13}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-400"
                      placeholder="XAXX010101000" />
                  </div>
                  {inputCliente("Uso de CFDI", "uso_cfdi", "G03")}
                </div>
                {inputCliente("Correo de Facturación", "correo_facturacion", "facturacion@empresa.com")}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
                  <select value={datosClienteCompleto.moneda || "MXN"}
                    onChange={(e) => setDatosClienteCompleto(prev => ({ ...prev, moneda: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white">
                    <option value="">Seleccionar moneda...</option>
                    {MONEDAS.map((m) => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Régimen Fiscal</label>
                  <select value={datosClienteCompleto.regimen_fiscal_idregimen_fiscal || 0}
                    onChange={(e) => setDatosClienteCompleto(prev => ({ ...prev, regimen_fiscal_idregimen_fiscal: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white">
                    <option value={0}>Seleccionar régimen fiscal...</option>
                    {regimenesFiscales.map((r) => <option key={r.idregimen_fiscal} value={r.idregimen_fiscal}>({r.codigo}) {r.tipo_regimen}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                  <select value={datosClienteCompleto.metodo_pago_idmetodo_pago || 0}
                    onChange={(e) => setDatosClienteCompleto(prev => ({ ...prev, metodo_pago_idmetodo_pago: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white">
                    <option value={0}>Seleccionar método de pago...</option>
                    {metodosPago.map((m) => <option key={m.idmetodo_pago} value={m.idmetodo_pago}>({m.codigo}) {m.tipo_pago}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pago</label>
                  <select value={datosClienteCompleto.forma_pago_idforma_pago || 0}
                    onChange={(e) => setDatosClienteCompleto(prev => ({ ...prev, forma_pago_idforma_pago: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white">
                    <option value={0}>Seleccionar forma de pago...</option>
                    {formasPago.map((f) => <option key={f.idforma_pago} value={f.idforma_pago}>({f.codigo}) {f.tipo_forma}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              {pasoCliente === 1 ? (
                <>
                  <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="button" onClick={handleSiguientePasoCliente} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Siguiente</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setPasoCliente(1)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={creandoCliente}>Atrás</button>
                  <button type="button" onClick={handleSiguientePasoCliente} disabled={creandoCliente}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
                    {creandoCliente
                      ? <><div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>Guardando...</>
                      : "Crear Cliente y Continuar"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════
          PASO 2 — PRODUCTOS
      ════════════════════════════════════════════════════════ */}
      <div className={paso === 2 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Agregar Productos</h3>

        <div className="mb-6 flex gap-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button type="button" onClick={() => { setModoProducto("registrado"); setAdvertenciaDuplicado(null); }}
            className={`px-6 py-2 rounded-md font-medium transition-all ${modoProducto === "registrado" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            Producto Registrado
          </button>
          <button type="button" onClick={() => { setModoProducto("nuevo"); setAdvertenciaDuplicado(null); }}
            className={`px-6 py-2 rounded-md font-medium transition-all ${modoProducto === "nuevo" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
            Producto Nuevo
          </button>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg mb-4">

          {modoProducto === "registrado" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Producto</label>
                <button type="button" onClick={() => setMostrarModalProductos(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  Click para buscar producto registrado
                </button>
              </div>
              {productoActual.nombre && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-2">{productoActual.nombre}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <p><span className="font-semibold">Material:</span> {productoActual.material}</p>
                    <p><span className="font-semibold">Calibre:</span>  {productoActual.calibre}</p>
                    <p><span className="font-semibold">Medidas:</span>  {productoActual.medidasFormateadas}</p>
                    <p><span className="font-semibold">Por kilo:</span> {productoActual.porKilo}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {modoProducto === "nuevo" && (
            <div className="space-y-4">
              {!productoNuevoListo && (
                <SelectorProducto catalogos={catalogos} onProductoChange={handleProductoNuevoChange} mostrarFigura={false} />
              )}

              {!productoNuevoListo && datosProductoNuevo.tipoProducto && CONFIG_PRODUCTOS[datosProductoNuevo.tipoProducto] && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="relative w-full flex items-center justify-center"
                    style={{ minHeight: "460px", paddingLeft: "160px", paddingRight: "160px", paddingTop: "48px", paddingBottom: "48px" }}>
                    <img src={CONFIG_PRODUCTOS[datosProductoNuevo.tipoProducto].imagen} alt={datosProductoNuevo.tipoProducto}
                      className="max-w-[220px] max-h-[340px] object-contain" />
                    {CONFIG_PRODUCTOS[datosProductoNuevo.tipoProducto].medidas.map((m) => {
                      const esLateral = m.key === "fuelleLateral1" || m.key === "fuelleLateral2";
                      const esFondoORefuerzo = m.key === "fuelleFondo" || m.key === "refuerzo";
                      const bloqueado = (esLateral && tieneFondoORefuerzo) || (esFondoORefuerzo && tieneLateral);
                      return (
                        <div key={m.key} className={`absolute flex items-center gap-1 ${
                          m.position === "top"         ? "top-4 left-1/2 -translate-x-1/2 flex-col"            : ""
                        } ${m.position === "left"        ? "left-6 top-1/2 -translate-y-1/2 flex-row"            : ""
                        } ${m.position === "bottom"      ? "bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse" : ""
                        } ${m.position === "right"       ? "right-6 top-1/2 -translate-y-1/2 flex-row-reverse"   : ""
                        } ${m.position === "right-top"   ? "right-6 top-16 flex-row-reverse"                     : ""
                        } ${m.position === "left-bottom" ? "left-6 bottom-16 flex-row"                           : ""
                        } ${m.position === "top-inside"  ? "top-16 right-6 flex-col"                             : ""}`}>
                          <label className={`text-xs font-medium whitespace-nowrap ${bloqueado ? "text-gray-300" : "text-gray-700"}`}>
                            {m.label}
                            {esLateral && !bloqueado && <span className="ml-1 text-blue-400 text-xs" title="Se sincroniza con el otro fuelle lateral">⇄</span>}
                          </label>
                          <input type="text" inputMode="decimal"
                            value={(datosProductoNuevo.medidas as Record<MedidaKey, string>)[m.key]}
                            onChange={(e) => !bloqueado && setMedidaInline(m.key, e.target.value)}
                            disabled={bloqueado}
                            className={`w-16 px-2 py-1 text-sm text-center border-2 rounded focus:outline-none ${
                              bloqueado ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed" : "border-gray-300 focus:border-blue-500"}`}
                            placeholder="0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {productoNuevoListo && advertenciaDuplicado && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-2">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">Producto ya registrado en el catálogo</p>
                    <p className="text-xs text-amber-700 mt-0.5">{advertenciaDuplicado}</p>
                    <p className="text-xs text-amber-600 mt-1 italic">Puedes continuar — se usará el producto existente.</p>
                  </div>
                  <button type="button" onClick={() => setAdvertenciaDuplicado(null)} className="flex-shrink-0 text-amber-400 hover:text-amber-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {productoNuevoListo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{productoActual.nombre || datosProductoNuevo.tipoProducto}</p>
                    <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-gray-600">
                      <span>Material: {datosProductoNuevo.material}</span>
                      <span>Calibre: {datosProductoNuevo.calibre}</span>
                      <span>Medidas: {productoActual.medidasFormateadas || datosProductoNuevo.medidasFormateadas || "—"}</span>
                      {productoActual.porKilo && <span>Por kilo: {productoActual.porKilo}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => { setProductoNuevoListo(false); setAdvertenciaDuplicado(null); }}
                    className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap">← Editar</button>
                </div>
              )}
            </div>
          )}

          {hayProductoSeleccionado && (
            <div className="mt-6 space-y-4 border-t pt-4">

              {/* ── HERRAMENTAL (accordion) ─────────────────────────────── */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={handleHerramentalToggle}
                  className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${
                    herramentalTieneData
                      ? "bg-orange-50 hover:bg-orange-100"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔧</span>
                    <span className={`text-sm font-semibold ${herramentalTieneData ? "text-orange-800" : "text-gray-600"}`}>
                      Herramental
                    </span>
                    <span className="text-xs font-normal text-gray-400">(opcional)</span>
                    {herramentalTieneData && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                        ${parseFloat(herramentalPrecioTexto || "0").toFixed(2)}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${herramentalExpandido ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {herramentalExpandido && (
                  <div className="p-4 bg-white space-y-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400">
                      Indica el herramental requerido para este producto (ej. suaje nuevo, molde especial). Se sumará al total.
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Descripción / Características
                      </label>
                      <textarea
                        value={herramentalDescripcion}
                        onChange={(e) => handleHerramentalDescripcionChange(e.target.value)}
                        rows={2}
                        placeholder="Ej: Suaje nuevo para troquel 40x30 con fuelle especial..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                      />
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Precio <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={herramentalPrecioTexto}
                            onChange={(e) => handleHerramentalPrecioChange(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                          />
                        </div>
                      </div>
                      {herramentalTieneData && (
                        <button
                          type="button"
                          onClick={handleHerramentalLimpiar}
                          className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                    {herramentalTieneData && (
                      <p className="text-xs text-orange-600 font-medium">
                        ✓ Herramental de ${parseFloat(herramentalPrecioTexto || "0").toFixed(2)} incluido en el total
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tintas y Caras */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tintas</label>
                  <div className="flex gap-2">
                    <input type="text" value={`${productoActual.tintas} tinta${productoActual.tintas > 1 ? "s" : ""}`} readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer"
                      onClick={() => setMostrarDropdownTintas(!mostrarDropdownTintas)} />
                    <button type="button" onClick={() => setMostrarDropdownTintas(!mostrarDropdownTintas)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <svg className={`w-5 h-5 transition-transform ${mostrarDropdownTintas ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  {mostrarDropdownTintas && (
                    <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20">
                      {tintas.map((t) => (
                        <li key={t.id} onClick={() => {
                          setProductoActual(p => ({ ...p, tintas: t.cantidad, tintasId: t.id, pantones: null, pigmentos: null }));
                          setInputsPantones(Array(t.cantidad).fill(""));
                          setModoColor(null);
                          setMostrarDropdownTintas(false);
                        }} className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900">
                          {t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caras</label>
                  <div className="flex gap-2">
                    <input type="text" value={`${productoActual.caras} cara${productoActual.caras > 1 ? "s" : ""}`} readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer"
                      onClick={() => setMostrarDropdownCaras(!mostrarDropdownCaras)} />
                    <button type="button" onClick={() => setMostrarDropdownCaras(!mostrarDropdownCaras)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <svg className={`w-5 h-5 transition-transform ${mostrarDropdownCaras ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  {mostrarDropdownCaras && (
                    <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20">
                      {caras.map((c) => (
                        <li key={c.id} onClick={() => { setProductoActual(p => ({ ...p, caras: c.cantidad, carasId: c.id })); setMostrarDropdownCaras(false); }}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900">
                          {c.cantidad} cara{c.cantidad > 1 ? "s" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Color / Tintas */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Color / Tintas <span className="ml-2 text-xs text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="flex items-center gap-3 flex-wrap">
                  <button type="button" onClick={() => handleCambiarModoColor("pantones")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${modoColor === "pantones" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-300 bg-white text-gray-600 hover:border-purple-300"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    Pantones
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative group flex-shrink-0">
                      <button type="button" disabled={esBopp}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                          esBopp
                            ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : productoActual.pigmentos
                              ? "border-orange-500 bg-orange-50 text-orange-700"
                              : "border-gray-300 bg-white text-gray-600 hover:border-orange-300"
                        }`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Pigmentos
                      </button>
                      {esBopp && (
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-30">
                          Celofán/BOPP no lleva pigmentos
                        </div>
                      )}
                    </div>
                    <input type="text" value={productoActual.pigmentos || ""} onChange={(e) => handlePigmentoChange(e.target.value)}
                      disabled={esBopp}
                      placeholder={esBopp ? "No aplica (BOPP/Celofán)" : "Ej: Rojo intenso, Azul marino..."}
                      className={`flex-1 min-w-0 px-3 py-2 border-2 rounded-lg text-sm transition-all focus:outline-none ${
                        esBopp
                          ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed placeholder-gray-300"
                          : productoActual.pigmentos
                            ? "border-orange-400 bg-orange-50 text-orange-800 focus:ring-2 focus:ring-orange-300 placeholder-orange-300"
                            : "border-gray-300 bg-white text-gray-900 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 placeholder-gray-400"
                      }`} />
                    {productoActual.pigmentos && !esBopp && (
                      <button type="button" onClick={() => setProductoActual(p => ({ ...p, pigmentos: null }))}
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Limpiar pigmento">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
                {modoColor === "pantones" && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-purple-600 font-medium">Ingresa el nombre o código de cada pantón ({productoActual.tintas} tinta{productoActual.tintas > 1 ? "s" : ""})</p>
                    <div className="grid grid-cols-2 gap-3">
                      {inputsPantones.map((valor, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <input type="text" value={valor} onChange={(e) => handlePantoneChange(i, e.target.value)} placeholder={`Tinta ${i + 1}`}
                            className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-400" />
                        </div>
                      ))}
                    </div>
                    {productoActual.pantones && <p className="text-xs text-purple-500">Guardado: <span className="font-medium">{productoActual.pantones}</span></p>}
                  </div>
                )}
              </div>

              {/* Suaje */}
              {(() => {
                const esAsaFlexible = getEsAsaFlexible();
                return (
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <label className={`block text-sm font-medium ${esAsaFlexible ? "text-gray-700" : "text-gray-300"}`}>
                        Suaje / Asa <span className="ml-2 text-xs font-normal">(opcional)</span>
                      </label>
                      {!esAsaFlexible && <span className="text-xs text-gray-400 italic">No aplica para este tipo de producto</span>}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={productoActual.suajeTipo || "Sin suaje"} readOnly disabled={!esAsaFlexible}
                        className={`flex-1 px-4 py-2 border rounded-lg ${!esAsaFlexible ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed" : productoActual.idsuaje ? "border-blue-400 bg-blue-50 text-gray-900 cursor-pointer" : "border-gray-300 text-gray-900 bg-white cursor-pointer"}`}
                        onClick={() => esAsaFlexible && setMostrarDropdownSuaje(!mostrarDropdownSuaje)} />
                      <button type="button" disabled={!esAsaFlexible} onClick={() => esAsaFlexible && setMostrarDropdownSuaje(!mostrarDropdownSuaje)}
                        className={`px-4 py-2 rounded-lg ${esAsaFlexible ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-300 cursor-not-allowed"}`}>
                        <svg className={`w-5 h-5 transition-transform ${mostrarDropdownSuaje ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {productoActual.idsuaje && esAsaFlexible && (
                        <button type="button" onClick={() => setProductoActual(p => ({
                          ...p,
                          idsuaje: null, suajeTipo: null,
                          colorAsaId: null, colorAsaNombre: null,
                        }))} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 text-sm font-bold">✕</button>
                      )}
                    </div>
                    {mostrarDropdownSuaje && esAsaFlexible && (
                      <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                        <li onClick={() => {
                          setProductoActual(p => ({
                            ...p,
                            idsuaje: null, suajeTipo: null,
                            colorAsaId: null, colorAsaNombre: null,
                          }));
                          setMostrarDropdownSuaje(false);
                        }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-400 italic border-b border-gray-200 text-sm">Sin suaje</li>
                        {suajes.map((s) => (
                          <li key={s.idsuaje} onClick={() => {
                            setProductoActual(p => ({
                              ...p,
                              idsuaje: s.idsuaje, suajeTipo: s.tipo,
                              colorAsaId: null, colorAsaNombre: null,
                            }));
                            setMostrarDropdownSuaje(false);
                          }} className={`px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900 ${productoActual.idsuaje === s.idsuaje ? "bg-blue-50 font-semibold text-blue-700" : ""}`}>
                            {s.tipo}
                          </li>
                        ))}
                      </ul>
                    )}
                    {productoActual.idsuaje && esAsaFlexible && <p className="mt-1 text-xs text-blue-600 font-medium">✓ {productoActual.suajeTipo}</p>}
                  </div>
                );
              })()}

              {/* Color del Asa */}
              {getEsAsaFlexible() && productoActual.idsuaje && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color del Asa <span className="ml-2 text-xs text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={productoActual.colorAsaNombre || "Seleccionar color..."} readOnly
                      className={`flex-1 px-4 py-2 border rounded-lg cursor-pointer text-gray-900 bg-white capitalize ${productoActual.colorAsaId ? "border-teal-400 bg-teal-50" : "border-gray-300"}`}
                      onClick={() => setMostrarDropdownColorAsa(!mostrarDropdownColorAsa)} />
                    <button type="button" onClick={() => setMostrarDropdownColorAsa(!mostrarDropdownColorAsa)} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                      <svg className={`w-5 h-5 transition-transform ${mostrarDropdownColorAsa ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {productoActual.colorAsaId && (
                      <button type="button" onClick={() => setProductoActual(p => ({ ...p, colorAsaId: null, colorAsaNombre: null }))}
                        className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 text-sm font-bold">✕</button>
                    )}
                  </div>
                  {mostrarDropdownColorAsa && (
                    <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {coloresAsa.map((c) => (
                        <li key={c.id_color} onClick={() => {
                          setProductoActual(p => ({ ...p, colorAsaId: c.id_color, colorAsaNombre: c.color }));
                          setMostrarDropdownColorAsa(false);
                        }} className={`px-4 py-2 hover:bg-teal-100 cursor-pointer text-gray-900 capitalize ${productoActual.colorAsaId === c.id_color ? "bg-teal-50 font-semibold text-teal-700" : ""}`}>
                          {c.color}
                        </li>
                      ))}
                    </ul>
                  )}
                  {productoActual.colorAsaId && <p className="mt-1 text-xs text-teal-600 font-medium capitalize">✓ {productoActual.colorAsaNombre}</p>}
                </div>
              )}

              {/* Medida del Troquel */}
              {getEsTroquel() && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medida del Troquel <span className="ml-2 text-xs text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input type="text" value={productoActual.medidaTroquelTexto || "Seleccionar medida..."} readOnly
                      className={`flex-1 px-4 py-2 border rounded-lg cursor-pointer text-gray-900 bg-white ${productoActual.idMedidaTroquel ? "border-violet-400 bg-violet-50" : "border-gray-300"}`}
                      onClick={() => setMostrarDropdownTroquel(!mostrarDropdownTroquel)} />
                    <button type="button" onClick={() => setMostrarDropdownTroquel(!mostrarDropdownTroquel)} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">
                      <svg className={`w-5 h-5 transition-transform ${mostrarDropdownTroquel ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {productoActual.idMedidaTroquel && (
                      <button type="button" onClick={() => setProductoActual(p => ({ ...p, idMedidaTroquel: null, medidaTroquelTexto: null }))}
                        className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 text-sm font-bold">✕</button>
                    )}
                  </div>
                  {mostrarDropdownTroquel && (
                    <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {medidasTroquel.map((m) => (
                        <li key={m.id_medidatro} onClick={() => { setProductoActual(p => ({ ...p, idMedidaTroquel: m.id_medidatro, medidaTroquelTexto: m.medida })); setMostrarDropdownTroquel(false); }}
                          className={`px-4 py-2 hover:bg-violet-100 cursor-pointer text-gray-900 ${productoActual.idMedidaTroquel === m.id_medidatro ? "bg-violet-50 font-semibold text-violet-700" : ""}`}>
                          {m.medida}
                        </li>
                      ))}
                    </ul>
                  )}
                  {productoActual.idMedidaTroquel && <p className="mt-1 text-xs text-violet-600 font-medium">✓ {productoActual.medidaTroquelTexto}</p>}
                </div>
              )}

              {/* Modo cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modo de cotización</label>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                  <button type="button" onClick={() => setModoCantidad("unidad")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${modoCantidad === "unidad" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    Por bolsas
                  </button>
                  <button type="button" onClick={() => setModoCantidad("kilo")} disabled={!productoActual.porKilo || Number(productoActual.porKilo) <= 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${!productoActual.porKilo || Number(productoActual.porKilo) <= 0 ? "text-gray-300 cursor-not-allowed" : modoCantidad === "kilo" ? "bg-white text-emerald-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                    Por kilos
                  </button>
                </div>
                {modoCantidad === "kilo" && productoActual.porKilo && (
                  <p className="mt-1 text-xs text-emerald-600 font-medium">✓ Factor: {productoActual.porKilo} bolsas/kg</p>
                )}
              </div>

              {/* Cantidades */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modo === "pedido"
                    ? <>Cantidad <span className="text-xs text-gray-400 font-normal">(en {labelCantidad})</span></>
                    : <>Cantidades <span className="text-xs text-gray-400 font-normal">(en {labelCantidad} — hasta 3 opciones)</span></>
                  }
                </label>
                {modo === "pedido" ? (
                  <div className="space-y-1 max-w-xs">
                    <input type="text" inputMode="numeric" value={cantidadesTexto[0]} onChange={(e) => handleCantidadChange(0, e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${getErrorKg(0) ? "border-red-400 focus:ring-red-400" : modoCantidad === "kilo" ? "border-emerald-300 focus:ring-emerald-400" : "border-gray-300 focus:ring-blue-500"}`}
                      placeholder={modoCantidad === "kilo" ? "Ingresa los kilos" : "Ingresa la cantidad"} />
                    {getEquivalente(0) && !getErrorKg(0) && <p className="text-xs text-gray-400">{getEquivalente(0)}</p>}
                    {getErrorKg(0) && <p className="text-xs text-red-500 font-medium">⚠ {getErrorKg(0)}</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {cantidadesTexto.map((valor, index) => (
                      <div key={index} className="space-y-1">
                        <input type="text" inputMode="numeric" value={valor} onChange={(e) => handleCantidadChange(index, e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${getErrorKg(index) ? "border-red-400 focus:ring-red-400" : modoCantidad === "kilo" ? "border-emerald-300 focus:ring-emerald-400" : "border-gray-300 focus:ring-blue-500"}`}
                          placeholder={modoCantidad === "kilo" ? `Kilos ${index + 1}` : `Cantidad ${index + 1}`} />
                        {getEquivalente(index) && !getErrorKg(index) && <p className="text-xs text-gray-400">{getEquivalente(index)}</p>}
                        {getErrorKg(index) && <p className="text-xs text-red-500 font-medium">⚠ {getErrorKg(index)}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Precios */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {modo === "pedido" ? "Precio" : "Precios"}{" "}
                    <span className="text-xs text-gray-400 font-normal">({modoCantidad === "kilo" ? "por kg" : "por bolsa"})</span>
                  </label>
                  {preciosEditadosManualmente.some(Boolean) && (
                    <button type="button" onClick={() => { setPreciosEditadosManualmente([false, false, false]); setPreciosTexto(["", "", ""]); }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline">↺ Restaurar</button>
                  )}
                </div>
                {errorCalculo && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">⚠️ {errorCalculo}</p></div>}

                {modo === "pedido" ? (
                  <div className="space-y-1 max-w-xs">
                    <div className="relative">
                      <input type="text" inputMode="decimal" value={preciosTexto[0]}
                        onChange={(e) => handlePrecioChange(0, e.target.value)} onBlur={() => handlePrecioBlur(0)}
                        className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${preciosEditadosManualmente[0] ? "border-orange-400 ring-1 ring-orange-300" : "border-gray-300 focus:ring-blue-500"}`}
                        placeholder={calculandoPrecios && !preciosEditadosManualmente[0] ? "Calculando..." : "0.0000"} />
                      {calculandoPrecios && !preciosEditadosManualmente[0] && cantidadesEnBolsas[0] > 0 && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div></div>
                      )}
                      {preciosEditadosManualmente[0] && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-orange-500" title="Editado manualmente">✏️</div>}
                    </div>
                    {productoActual.precios[0] > 0 && productoActual.porKilo && Number(productoActual.porKilo) > 0 && (
                      <p className="text-xs text-gray-400">{modoCantidad === "kilo" ? `≈ $${productoActual.precios[0].toFixed(4)}/bolsa` : `≈ $${(productoActual.precios[0] * Number(productoActual.porKilo)).toFixed(4)}/kg`}</p>
                    )}
                    {preciosEditadosManualmente[0] && <button type="button" onClick={() => handleRestaurarPrecioAuto(0)} className="text-xs text-blue-500 hover:text-blue-700 underline">↺ Usar automático</button>}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {productoActual.precios.map((_, index) => (
                      <div key={index} className="space-y-1">
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={preciosTexto[index]}
                            onChange={(e) => handlePrecioChange(index, e.target.value)} onBlur={() => handlePrecioBlur(index)}
                            className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${preciosEditadosManualmente[index] ? "border-orange-400 ring-1 ring-orange-300" : "border-gray-300 focus:ring-blue-500"}`}
                            placeholder={calculandoPrecios && !preciosEditadosManualmente[index] ? "Calculando..." : "0.0000"} />
                          {calculandoPrecios && !preciosEditadosManualmente[index] && cantidadesEnBolsas[index] > 0 && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div></div>
                          )}
                          {preciosEditadosManualmente[index] && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-orange-500" title="Editado manualmente">✏️</div>}
                        </div>
                        {productoActual.precios[index] > 0 && productoActual.porKilo && Number(productoActual.porKilo) > 0 && (
                          <p className="text-xs text-gray-400">{modoCantidad === "kilo" ? `≈ $${productoActual.precios[index].toFixed(4)}/bolsa` : `≈ $${(productoActual.precios[index] * Number(productoActual.porKilo)).toFixed(4)}/kg`}</p>
                        )}
                        {preciosEditadosManualmente[index] && <button type="button" onClick={() => handleRestaurarPrecioAuto(index)} className="text-xs text-blue-500 hover:text-blue-700 underline">↺ Usar automático</button>}
                      </div>
                    ))}
                  </div>
                )}
                {calculandoPrecios && (
                  <div className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                    Calculando precio automático...
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones del producto (Opcional)</label>
                <textarea value={productoActual.observacion || ""} onChange={handleObservacionChange} rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  placeholder="Ej: Impresión a 2 colores, acabado mate, etc." />
              </div>

              <button type="button" onClick={handleAgregarProducto} disabled={guardandoProducto || hayErrorKg}
                className={`w-full px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${guardandoProducto || hayErrorKg ? "bg-gray-400 cursor-not-allowed text-white" : "bg-green-600 text-white hover:bg-green-700"}`}>
                {guardandoProducto
                  ? <><div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>Guardando...</>
                  : hayErrorKg ? "⚠ Corrige las cantidades (mín. 30 kg)" : "+ Agregar Producto"}
              </button>
            </div>
          )}
        </div>

        {/* Lista productos agregados */}
        {datos.productos.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Productos agregados:</h4>
            <div className="space-y-3">
              {datos.productos.map((prod, index) => (
                <div key={index} className="flex items-start justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{prod.nombre}</p>
                      {prod.modoCantidad === "kilo" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Por kilo</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span>Material: {prod.material}</span>
                      <span>Calibre: {prod.calibre}</span>
                      <span>Tintas: {prod.tintas}</span>
                      <span>Caras: {prod.caras}</span>
                      {prod.suajeTipo       && <span className="text-blue-600 font-medium">Suaje: {prod.suajeTipo}</span>}
                      {prod.colorAsaNombre  && <span className="text-teal-600 font-medium capitalize">🎨 Asa: {prod.colorAsaNombre}</span>}
                      {prod.medidaTroquelTexto && <span className="text-violet-600 font-medium">📐 Troquel: {prod.medidaTroquelTexto}</span>}
                      {prod.pantones        && <span className="text-purple-600 font-medium">🎨 {prod.pantones}</span>}
                      {prod.pigmentos       && <span className="text-orange-600 font-medium">🧪 {prod.pigmentos}</span>}
                    </div>
                    <div className="mt-2 space-y-1">
  {(modo === "pedido" ? [0] : [0, 1, 2]).map((i) => {
    const cant = prod.cantidades[i];
    if (!cant || cant <= 0) return null;

    const pk = Number(prod.porKilo || 1);

    if (prod.modoCantidad === "kilo") {
      const kgs        = prod.kilogramos[i];
      const precioKg   = Math.round(prod.precios[i] * pk * 100) / 100;
      const importe    = Math.round(kgs * precioKg * 100) / 100;
      return (
        <p key={i} className="text-sm text-gray-700">
          {kgs} kg ({cant.toLocaleString()} bolsas) × ${precioKg.toFixed(2)}/kg = ${importe.toFixed(2)}
        </p>
      );
    }

    const importe = Math.round(cant * prod.precios[i] * 100) / 100;
    return (
      <p key={i} className="text-sm text-gray-700">
        {cant.toLocaleString()} bolsas × ${prod.precios[i].toFixed(4)}/bolsa = ${importe.toFixed(2)}
      </p>
    );
  })}
</div>
                    {/* Herramental en lista de productos agregados */}
                    {(prod.herramental_descripcion || prod.herramental_precio != null) && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
                        <span className="text-sm">🔧</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-orange-800">Herramental</span>
                          {prod.herramental_descripcion && (
                            <span className="text-xs text-orange-700 ml-1">— {prod.herramental_descripcion}</span>
                          )}
                        </div>
                        {prod.herramental_precio != null && (
                          <span className="text-xs font-bold text-orange-800 flex-shrink-0">
                            +${prod.herramental_precio.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                    {prod.observacion && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                        <span className="font-semibold text-blue-900">Obs:</span>
                        <span className="text-blue-800 ml-1">{prod.observacion}</span>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => handleEliminarProducto(index)} className="ml-4 text-red-600 hover:text-red-800 font-bold text-xl">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xl font-bold text-gray-900">Total: ${calcularTotal().toFixed(2)}</p>
              {datos.productos.some(p => p.herramental_precio != null && p.herramental_precio > 0) && (
                <p className="text-xs text-orange-600 mt-1">
                  Incluye herramental: +${datos.productos.reduce((s, p) => s + (p.herramental_precio ?? 0), 0).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Prioridad (solo pedido directo) */}
        {modo === "pedido" && (
          <div className="flex items-center gap-3 py-3 px-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <input
              type="checkbox"
              id="chk-prioridad"
              checked={datos.prioridad ?? false}
              onChange={(e) => setDatos(prev => ({ ...prev, prioridad: e.target.checked }))}
              className="w-5 h-5 rounded border-amber-400 text-amber-600 focus:ring-amber-400 cursor-pointer"
            />
            <label htmlFor="chk-prioridad" className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-amber-700 font-semibold text-sm">Pedido urgente</span>
              <span className="text-amber-500 text-xs">(prioridad alta)</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={handleAtras} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Atrás</button>

          {!productoNuevoListo && datosProductoNuevo.tipoProducto && datosProductoNuevo.material && datosProductoNuevo.calibre && (
            <button type="button" onClick={verificarDuplicadoAntesDeConfirmar} disabled={verificandoDuplicado}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:bg-blue-400">
              {verificandoDuplicado
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verificando...</>
                : "Confirmar producto →"}
            </button>
          )}

          {datos.productos.length > 0 && (
            <button type="button" onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
              {modo === "pedido" ? "Crear Pedido" : "Crear Cotización"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}