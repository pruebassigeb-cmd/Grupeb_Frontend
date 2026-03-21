import { useState, useEffect } from "react";
import SelectorProducto, { CONFIG_PRODUCTOS } from "./ConfigurarProducto";
import type { DatosProducto, MedidaKey } from "../types/productos-plastico.types";
import { FORMATO_MEDIDAS } from "../types/productos-plastico.types";
import { searchClientes, createClienteLigero } from "../services/clientesService";
import { searchProductosPlastico, crearOObtenerProducto, checkProductoDuplicado } from "../services/productosPlasticoService";
import { getCatalogosProduccion } from "../services/catalogosProduccionService";
import { usePreciosBatch } from "../hooks/usePrecioCalculado";
import { calcularPorKilo } from "../utils/calcularPorKilo";
import type { ClienteBusqueda } from "../types/clientes.types";
import type { ProductoBusqueda, ProductoPlasticoCreate } from "../types/productos-plastico.types";
import type { Cara, Tinta } from "../types/catalogos-produccion.types";
import { getSuajes } from "../services/suajesService";
import type { Suaje } from "../services/suajesService";

// ✅ CAMBIO 1: modo agregado a props
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
  productoId?:   number;
  nombre:        string;
  cantidades:    [number, number, number];
  kilogramos:    [number, number, number];
  precios:       [number, number, number];
  calibre:       string;
  tintas:        number;
  tintasId:      number;
  caras:         number;
  carasId:       number;
  material:      string;
  medidas:       Record<MedidaKey, string>;
  medidasFormateadas: string;
  porKilo?:      string;
  idsuaje?:      number | null;
  suajeTipo?:    string | null;
  observacion?:  string;
  pantones?:     string | null;
  pigmentos?:    string | null;
  modoCantidad:  "unidad" | "kilo";
}

// ✅ CAMBIO 5: tipo agregado a DatosCotizacion + impresion agregado
interface DatosCotizacion {
  clienteId?:    number;
  cliente:       string;
  telefono:      string;
  correo:        string;
  empresa:       string;
  impresion?:    string | null;
  productos:     Producto[];
  observaciones: string;
  tipo?:         "cotizacion" | "pedido";
}

// ✅ CAMBIO 2: modo desestructurado con default "cotizacion"
export default function FormularioCotizacion({
  onSubmit,
  onCancel,
  catalogos,
  modo = "cotizacion",
}: FormularioCotizacionProps) {
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState<DatosCotizacion>({
    cliente:       "",
    telefono:      "",
    correo:        "",
    empresa:       "",
    impresion:     null,
    productos:     [],
    observaciones: "",
  });

  const [caras,  setCaras]  = useState<Cara[]>([]);
  const [tintas, setTintas] = useState<Tinta[]>([]);
  const [suajes, setSuajes] = useState<Suaje[]>([]);

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
  const [mostrarDropdownCaras,  setMostrarDropdownCaras]  = useState(false);
  const [mostrarDropdownTintas, setMostrarDropdownTintas] = useState(false);
  const [mostrarDropdownSuaje,  setMostrarDropdownSuaje]  = useState(false);
  const [guardandoProducto,     setGuardandoProducto]     = useState(false);
  const [advertenciaDuplicado,  setAdvertenciaDuplicado]  = useState<string | null>(null);
  const [verificandoDuplicado,  setVerificandoDuplicado]  = useState(false);

  const [preciosEditadosManualmente, setPreciosEditadosManualmente] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [preciosTexto,               setPreciosTexto]               = useState<[string, string, string]>(["", "", ""]);

  const [modoColor,      setModoColor]      = useState<"pantones" | "pigmentos" | null>(null);
  const [inputsPantones, setInputsPantones] = useState<string[]>([]);

  const [modoCantidad, setModoCantidad] = useState<"unidad" | "kilo">("unidad");
  const [cantidadesTexto, setCantidadesTexto] = useState<[string, string, string]>(["", "", ""]);

  const estadoInicialProducto: Producto = {
    nombre:             "",
    cantidades:         [0, 0, 0],
    kilogramos:         [0, 0, 0],
    precios:            [0, 0, 0],
    calibre:            "200",
    tintas:             1,
    tintasId:           1,
    caras:              1,
    carasId:            1,
    material:           "",
    medidas: {
      altura: "", ancho: "", fuelleFondo: "",
      fuelleLateral1: "", fuelleLateral2: "",
      refuerzo: "", solapa: "",
    },
    medidasFormateadas: "",
    idsuaje:            null,
    suajeTipo:          null,
    observacion:        "",
    pantones:           null,
    pigmentos:          null,
    modoCantidad:       "unidad",
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
      setInputsPantones((prev) => {
        return Array(productoActual.tintas).fill("").map((_, i) => prev[i] || "");
      });
    }
  }, [productoActual.tintas, modoColor]);

  useEffect(() => {
    if (resultados.length === 0) return;

    setProductoActual(prev => {
      const nuevosPrecios = [...prev.precios] as [number, number, number];
      resultados.forEach((r, i) => {
        if (!preciosEditadosManualmente[i] && r?.precio_unitario !== undefined) {
          nuevosPrecios[i] = r.precio_unitario;
        }
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
    const timer = setTimeout(() => { cargarClientes(busquedaCliente); }, 500);
    return () => clearTimeout(timer);
  }, [busquedaCliente]);

  useEffect(() => {
    if (mostrarModalProductos && productosCargados.length === 0) cargarProductos();
  }, [mostrarModalProductos]);

  useEffect(() => {
    if (!mostrarModalProductos) return;
    const timer = setTimeout(() => { cargarProductos(busquedaProducto); }, 500);
    return () => clearTimeout(timer);
  }, [busquedaProducto]);

  useEffect(() => {
    setCantidadesTexto(["", "", ""]);
    setProductoActual(prev => ({ ...prev, cantidades: [0, 0, 0], kilogramos: [0, 0, 0], precios: [0, 0, 0] }));
    setPreciosEditadosManualmente([false, false, false]);
    setPreciosTexto(["", "", ""]);
  }, [modoCantidad]);

  const cargarCatalogos = async () => {
    try {
      const [catalogosData, suajesData] = await Promise.all([
        getCatalogosProduccion(),
        getSuajes(),
      ]);
      setCaras(catalogosData.caras);
      setTintas(catalogosData.tintas);
      setSuajes(suajesData);
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

  const crearNuevoClienteLigero = async () => {
    if (!datos.cliente && !datos.correo) {
      setErrorCrearCliente("Se requiere al menos nombre o correo");
      return;
    }
    setCreandoCliente(true);
    setErrorCrearCliente(null);
    try {
      const response = await createClienteLigero({
        nombre:   datos.cliente  || undefined,
        telefono: datos.telefono || undefined,
        correo:   datos.correo   || undefined,
        empresa:  datos.empresa  || undefined,
      });
      setDatos({ ...datos, clienteId: response.cliente.id });
      setPaso(2);
    } catch (error: any) {
      setErrorCrearCliente(error.response?.data?.error || "Error al crear cliente");
    } finally {
      setCreandoCliente(false);
    }
  };

  const seleccionarCliente = (cliente: ClienteBusqueda) => {
    setDatos({
      ...datos,
      clienteId: cliente.idclientes,
      cliente:   cliente.atencion  || "",
      telefono:  cliente.telefono  || "",
      correo:    cliente.correo    || "",
      empresa:   cliente.empresa   || "",
      impresion: cliente.impresion ?? null,
    });
    setMostrarModalClientes(false);
    setBusquedaCliente("");
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
      productoId:         producto.id,
      nombre:             `${producto.tipo_producto} ${producto.medida} ${producto.material.toLowerCase()}`,
      cantidades:         [0, 0, 0],
      kilogramos:         [0, 0, 0],
      precios:            [0, 0, 0],
      calibre:            producto.calibre.toString(),
      tintas:             tintas[0]?.cantidad || 1,
      tintasId:           tintas[0]?.id       || 1,
      caras:              caras[0]?.cantidad  || 1,
      carasId:            caras[0]?.id        || 1,
      material:           producto.material,
      medidas:            medidasMapeadas,
      medidasFormateadas: producto.medida,
      porKilo:            producto.por_kilo,
      idsuaje:            null,
      suajeTipo:          null,
      pantones:           null,
      pigmentos:          null,
      modoCantidad:       modoCantidad,
    });
    setCantidadesTexto(["", "", ""]);
    setPreciosEditadosManualmente([false, false, false]);
    setPreciosTexto(["", "", ""]);
    setModoColor(null);
    setInputsPantones([]);
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
      if (resultado.existe) {
        setAdvertenciaDuplicado(resultado.detalle ?? null);
      }
    } catch {
      // Si falla la verificación, no bloqueamos — el usuario puede continuar
    } finally {
      setVerificandoDuplicado(false);
      setProductoNuevoListo(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDatos({ ...datos, [name]: value });
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

  // Helper: valida que el string sea un número entero positivo (sin decimales)
  const esNumeroEnteroValido = (val: string) => /^\d*$/.test(val);

  // Helper: valida que el string sea un número decimal con hasta 4 decimales
  const esDecimalValido = (val: string) => /^\d*\.?\d{0,4}$/.test(val);

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

  const handleCambiarModoColor = (modo: "pantones" | "pigmentos") => {
    if (modoColor === modo) {
      setModoColor(null);
    } else {
      setModoColor(modo);
      if (modo === "pantones") {
        if (productoActual.pantones) {
          const arr = productoActual.pantones.split(", ").map(s => s.trim());
          setInputsPantones(Array(productoActual.tintas).fill("").map((_, i) => arr[i] || ""));
        } else {
          setInputsPantones(Array(productoActual.tintas).fill(""));
        }
      }
    }
  };

  const handlePantoneChange = (index: number, value: string) => {
    const sanitizado = sanitizarTexto(value);
    const nuevos = [...inputsPantones];
    nuevos[index] = sanitizado;
    setInputsPantones(nuevos);
    const pantonesStr = nuevos.join(", ");
    setProductoActual(prev => ({
      ...prev,
      pantones: pantonesStr.replace(/^[\s,]+|[\s,]+$/g, "") || null,
    }));
  };

  const handlePigmentoChange = (value: string) => {
    setProductoActual(prev => ({ ...prev, pigmentos: sanitizarTexto(value) || null }));
  };

  const handleAgregarProducto = async () => {
    const { bolsas: cantsBolsas, kgs: catsKgs } = calcularDesdeInput(
      cantidadesTexto,
      modoCantidad,
      productoActual.porKilo
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

    let productoParaAgregar: Producto = {
      ...productoActual,
      cantidades:   cantsBolsas,
      kilogramos:   catsKgs,
      modoCantidad: modoCantidad,
    };

    if (modoProducto === "nuevo" && !productoActual.productoId) {
      const productoCreado = await crearYAgregarProductoNuevo();
      if (!productoCreado) return;
      productoParaAgregar = {
        ...productoCreado,
        cantidades:   cantsBolsas,
        kilogramos:   catsKgs,
        modoCantidad: modoCantidad,
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
      medidasFormateadas: "",
      idsuaje:      null,
      suajeTipo:    null,
      observacion:  "",
      pantones:     null,
      pigmentos:    null,
      modoCantidad: "unidad",
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
    setModoColor(null);
    setInputsPantones([]);
    setAdvertenciaDuplicado(null);
  };

  const handleEliminarProducto = (index: number) => {
    setDatos(prev => ({ ...prev, productos: prev.productos.filter((_, i) => i !== index) }));
  };

  const handleSiguiente = async () => {
    if (!datos.cliente && !datos.correo) {
      setErrorCrearCliente("Se requiere al menos nombre o correo");
      return;
    }
    if (datos.clienteId) { setPaso(2); return; }
    await crearNuevoClienteLigero();
  };

  const handleAtras = () => setPaso(1);

  // ✅ CAMBIO 3: handleSubmit envía tipo: modo
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (datos.productos.length > 0) onSubmit({ ...datos, tipo: modo });
  };

  const calcularTotal = () =>
    datos.productos.reduce((total, prod) =>
      total + prod.cantidades.reduce((sum, cant, i) => sum + cant * prod.precios[i], 0)
    , 0);

  const hayProductoSeleccionado =
    (modoProducto === "registrado" && productoActual.nombre) ||
    (modoProducto === "nuevo"      && productoNuevoListo);

  const labelCantidad = modoCantidad === "kilo" ? "kg" : "bolsas";

  const getEquivalente = (index: number): string | null => {
    const n = cantidadesTexto[index] === "" ? 0 : Number(cantidadesTexto[index]);
    const pk = productoActual.porKilo ? Number(productoActual.porKilo) : 0;
    if (!pk || n <= 0) return null;
    if (modoCantidad === "unidad") return `≈ ${(n / pk).toFixed(2)} kg`;
    return `≈ ${Math.round(n * pk).toLocaleString()} bolsas`;
  };

  const MIN_KG = 30;
  const getErrorKg = (index: number): string | null => {
    const n = cantidadesTexto[index] === "" ? 0 : Number(cantidadesTexto[index]);
    if (n <= 0) return null;
    const pk = productoActual.porKilo ? Number(productoActual.porKilo) : 0;
    let kgs = 0;
    if (modoCantidad === "kilo") {
      kgs = n;
    } else if (pk > 0) {
      kgs = n / pk;
    } else {
      return null;
    }
    const kgsRedondeados = Math.round(kgs * 10000) / 10000;
    if (kgsRedondeados < MIN_KG) {
      const faltanKg = (MIN_KG - kgsRedondeados).toFixed(2);
      if (modoCantidad === "kilo") {
        return `Mínimo ${MIN_KG} kg (faltan ${faltanKg} kg)`;
      } else {
        const bolsasMin = Math.ceil(MIN_KG * pk);
        return `Mínimo ${MIN_KG} kg ≈ ${bolsasMin.toLocaleString()} bolsas`;
      }
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
    // Solo permite enteros para medidas
    if (!/^\d*$/.test(value)) return;
    const v = value.trim();
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
    const datosActualizados = { ...datosProductoNuevo, medidas: nuevas, medidasFormateadas };

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
                <input type="text" value={busquedaCliente} onChange={(e) => setBusquedaCliente(e.target.value)} placeholder="Buscar por nombre, empresa, teléfono o correo..." className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white" autoFocus />
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
                <input type="text" value={busquedaProducto} onChange={(e) => setBusquedaProducto(e.target.value)} placeholder="Buscar por medidas, material, calibre o tipo..." className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" autoFocus />
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

      {/* ── INDICADOR DE PASOS ── */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${paso === 1 ? "bg-blue-600 text-white" : "bg-green-600 text-white"}`}>
            {paso === 1 ? "1" : "✓"}
          </div>
          <div className={`w-24 h-1 ${paso === 2 ? "bg-blue-600" : "bg-gray-300"}`}></div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${paso === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}>2</div>
        </div>
      </div>

      {/* ── PASO 1: CLIENTE ── */}
      <div className={paso === 1 ? "block" : "hidden"}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Datos del Cliente</h3>
          <button type="button" onClick={() => setMostrarModalClientes(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Cliente Existente
          </button>
        </div>
        {errorCrearCliente && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">{errorCrearCliente}</p></div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Cliente</label>
            <input type="text" name="cliente" value={datos.cliente} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="Juan Pérez" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input type="tel" name="telefono" value={datos.telefono} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="33-1234-5678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
              <input type="email" name="correo" value={datos.correo} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="cliente@ejemplo.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Empresa (Opcional)</label>
            <input type="text" name="empresa" value={datos.empresa} onChange={handleInputChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="Nombre de la empresa" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={creandoCliente}>Cancelar</button>
          <button type="button" onClick={handleSiguiente} disabled={creandoCliente} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2">
            {creandoCliente ? (<><div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>Guardando...</>) : "Siguiente"}
          </button>
        </div>
      </div>

      {/* ── PASO 2: PRODUCTOS ── */}
      <div className={paso === 2 ? "block" : "hidden"}>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Agregar Productos</h3>

        <div className="mb-6 flex gap-4 bg-gray-100 p-1 rounded-lg w-fit">
          <button type="button" onClick={() => { setModoProducto("registrado"); setAdvertenciaDuplicado(null); }} className={`px-6 py-2 rounded-md font-medium transition-all ${modoProducto === "registrado" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>Producto Registrado</button>
          <button type="button" onClick={() => { setModoProducto("nuevo"); setAdvertenciaDuplicado(null); }} className={`px-6 py-2 rounded-md font-medium transition-all ${modoProducto === "nuevo" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>Producto Nuevo</button>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg mb-4">

          {modoProducto === "registrado" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Producto</label>
                <button type="button" onClick={() => setMostrarModalProductos(true)} className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 flex items-center justify-center gap-2">
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
                <SelectorProducto
                  catalogos={catalogos}
                  onProductoChange={handleProductoNuevoChange}
                  mostrarFigura={false}
                />
              )}

              {!productoNuevoListo && datosProductoNuevo.tipoProducto && CONFIG_PRODUCTOS[datosProductoNuevo.tipoProducto] && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div
                    className="relative w-full flex items-center justify-center"
                    style={{ minHeight: "460px", paddingLeft: "160px", paddingRight: "160px", paddingTop: "48px", paddingBottom: "48px" }}
                  >
                    <img
                      src={CONFIG_PRODUCTOS[datosProductoNuevo.tipoProducto].imagen}
                      alt={datosProductoNuevo.tipoProducto}
                      className="max-w-[220px] max-h-[340px] object-contain"
                    />
                    {CONFIG_PRODUCTOS[datosProductoNuevo.tipoProducto].medidas.map((m) => {
                      const esLateral = m.key === "fuelleLateral1" || m.key === "fuelleLateral2";
                      const esFondoORefuerzo = m.key === "fuelleFondo" || m.key === "refuerzo";
                      const bloqueado =
                        (esLateral && tieneFondoORefuerzo) || (esFondoORefuerzo && tieneLateral);
                      return (
                        <div
                          key={m.key}
                          className={`absolute flex items-center gap-1 ${
                            m.position === "top"         ? "top-4 left-1/2 -translate-x-1/2 flex-col"             : ""
                          } ${
                            m.position === "left"        ? "left-6 top-1/2 -translate-y-1/2 flex-row"             : ""
                          } ${
                            m.position === "bottom"      ? "bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse"  : ""
                          } ${
                            m.position === "right"       ? "right-6 top-1/2 -translate-y-1/2 flex-row-reverse"    : ""
                          } ${
                            m.position === "right-top"   ? "right-6 top-16 flex-row-reverse"                      : ""
                          } ${
                            m.position === "left-bottom" ? "left-6 bottom-16 flex-row"                            : ""
                          } ${
                            m.position === "top-inside"  ? "top-16 right-6 flex-col"                              : ""
                          }`}
                        >
                          <label className={`text-xs font-medium whitespace-nowrap ${bloqueado ? "text-gray-300" : "text-gray-700"}`}>
                            {m.label}
                            {esLateral && !bloqueado && (
                              <span className="ml-1 text-blue-400 text-xs" title="Se sincroniza con el otro fuelle lateral">⇄</span>
                            )}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={(datosProductoNuevo.medidas as Record<MedidaKey, string>)[m.key]}
                            onChange={(e) => !bloqueado && setMedidaInline(m.key, e.target.value)}
                            disabled={bloqueado}
                            className={`w-16 px-2 py-1 text-sm text-center border-2 rounded focus:outline-none ${
                              bloqueado
                                ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                                : "border-gray-300 focus:border-blue-500"
                            }`}
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {productoNuevoListo && advertenciaDuplicado && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-2">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800">Producto ya registrado en el catálogo</p>
                    <p className="text-xs text-amber-700 mt-0.5">{advertenciaDuplicado}</p>
                    <p className="text-xs text-amber-600 mt-1 italic">Puedes continuar — se usará el producto existente.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdvertenciaDuplicado(null)}
                    className="flex-shrink-0 text-amber-400 hover:text-amber-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
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
                  <button
                    type="button"
                    onClick={() => { setProductoNuevoListo(false); setAdvertenciaDuplicado(null); }}
                    className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 underline whitespace-nowrap"
                  >
                    ← Editar
                  </button>
                </div>
              )}
            </div>
          )}

          {hayProductoSeleccionado && (
            <div className="mt-6 space-y-4 border-t pt-4">

              {/* Tintas y Caras */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tintas</label>
                  <div className="flex gap-2">
                    <input type="text" value={`${productoActual.tintas} tinta${productoActual.tintas > 1 ? "s" : ""}`} readOnly className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer" onClick={() => setMostrarDropdownTintas(!mostrarDropdownTintas)} />
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
                    <input type="text" value={`${productoActual.caras} cara${productoActual.caras > 1 ? "s" : ""}`} readOnly className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white cursor-pointer" onClick={() => setMostrarDropdownCaras(!mostrarDropdownCaras)} />
                    <button type="button" onClick={() => setMostrarDropdownCaras(!mostrarDropdownCaras)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      <svg className={`w-5 h-5 transition-transform ${mostrarDropdownCaras ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                  {mostrarDropdownCaras && (
                    <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20">
                      {caras.map((c) => (
                        <li key={c.id} onClick={() => { setProductoActual(p => ({ ...p, caras: c.cantidad, carasId: c.id })); setMostrarDropdownCaras(false); }} className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900">
                          {c.cantidad} cara{c.cantidad > 1 ? "s" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Pantones / Pigmentos */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Color / Tintas <span className="ml-2 text-xs text-gray-400 font-normal">(opcional)</span></label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => handleCambiarModoColor("pantones")} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${modoColor === "pantones" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-300 bg-white text-gray-600 hover:border-purple-300"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                    Pantones
                  </button>
                  {(() => {
                    const esBopp = productoActual.material?.toUpperCase().includes("BOPP") || productoActual.material?.toUpperCase().includes("CELOFAN") || productoActual.material?.toUpperCase().includes("CELOFÁN");
                    return (
                      <div className="relative group">
                        <button type="button" disabled={esBopp} onClick={() => !esBopp && handleCambiarModoColor("pigmentos")} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${esBopp ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed" : modoColor === "pigmentos" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-300 bg-white text-gray-600 hover:border-orange-300"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          Pigmentos
                        </button>
                        {esBopp && <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-30">Celofán/BOPP no lleva pigmentos</div>}
                      </div>
                    );
                  })()}
                </div>
                {modoColor === "pantones" && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                    <p className="text-xs text-purple-600 font-medium">Ingresa el nombre o código de cada pantón ({productoActual.tintas} tinta{productoActual.tintas > 1 ? "s" : ""})</p>
                    <div className="grid grid-cols-2 gap-3">
                      {inputsPantones.map((valor, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <input type="text" value={valor} onChange={(e) => handlePantoneChange(i, e.target.value)} placeholder={`Tinta ${i + 1}`} className="flex-1 px-3 py-2 border border-purple-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-purple-400" />
                        </div>
                      ))}
                    </div>
                    {productoActual.pantones && <p className="text-xs text-purple-500">Guardado: <span className="font-medium">{productoActual.pantones}</span></p>}
                  </div>
                )}
                {modoColor === "pigmentos" && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                    <p className="text-xs text-orange-600 font-medium">Especifica el pigmento que llevará este producto</p>
                    <input type="text" value={productoActual.pigmentos || ""} onChange={(e) => handlePigmentoChange(e.target.value)} placeholder="Ej: Rojo intenso" className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-orange-400" />
                    {productoActual.pigmentos && <p className="text-xs text-orange-500">Guardado: <span className="font-medium">{productoActual.pigmentos}</span></p>}
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
                      {!esAsaFlexible && (
                        <span className="text-xs text-gray-400 italic">No aplica para este tipo de producto</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={productoActual.suajeTipo || "Sin suaje"}
                        readOnly
                        disabled={!esAsaFlexible}
                        className={`flex-1 px-4 py-2 border rounded-lg ${
                          !esAsaFlexible
                            ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                            : productoActual.idsuaje
                              ? "border-blue-400 bg-blue-50 text-gray-900 cursor-pointer"
                              : "border-gray-300 text-gray-900 bg-white cursor-pointer"
                        }`}
                        onClick={() => esAsaFlexible && setMostrarDropdownSuaje(!mostrarDropdownSuaje)}
                      />
                      <button
                        type="button"
                        disabled={!esAsaFlexible}
                        onClick={() => esAsaFlexible && setMostrarDropdownSuaje(!mostrarDropdownSuaje)}
                        className={`px-4 py-2 rounded-lg ${esAsaFlexible ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-200 text-gray-300 cursor-not-allowed"}`}
                      >
                        <svg className={`w-5 h-5 transition-transform ${mostrarDropdownSuaje ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {productoActual.idsuaje && esAsaFlexible && (
                        <button type="button" onClick={() => setProductoActual(p => ({ ...p, idsuaje: null, suajeTipo: null }))} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 text-sm font-bold">✕</button>
                      )}
                    </div>
                    {mostrarDropdownSuaje && esAsaFlexible && (
                      <ul className="absolute w-full bg-white border border-gray-300 mt-1 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                        <li onClick={() => { setProductoActual(p => ({ ...p, idsuaje: null, suajeTipo: null })); setMostrarDropdownSuaje(false); }} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-400 italic border-b border-gray-200 text-sm">Sin suaje</li>
                        {suajes.map((s) => (
                          <li key={s.idsuaje} onClick={() => { setProductoActual(p => ({ ...p, idsuaje: s.idsuaje, suajeTipo: s.tipo })); setMostrarDropdownSuaje(false); }} className={`px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900 ${productoActual.idsuaje === s.idsuaje ? "bg-blue-50 font-semibold text-blue-700" : ""}`}>
                            {s.tipo}
                          </li>
                        ))}
                      </ul>
                    )}
                    {productoActual.idsuaje && esAsaFlexible && (
                      <p className="mt-1 text-xs text-blue-600 font-medium">✓ {productoActual.suajeTipo}</p>
                    )}
                  </div>
                );
              })()}

              {/* Modo cantidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modo de cotización</label>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                  <button type="button" onClick={() => setModoCantidad("unidad")} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${modoCantidad === "unidad" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    Por bolsas
                  </button>
                  <button type="button" onClick={() => setModoCantidad("kilo")} disabled={!productoActual.porKilo || Number(productoActual.porKilo) <= 0} className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${!productoActual.porKilo || Number(productoActual.porKilo) <= 0 ? "text-gray-300 cursor-not-allowed" : modoCantidad === "kilo" ? "bg-white text-emerald-600 shadow" : "text-gray-600 hover:text-gray-900"}`}>
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
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cantidadesTexto[0]}
                      onChange={(e) => handleCantidadChange(0, e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${getErrorKg(0) ? "border-red-400 focus:ring-red-400" : modoCantidad === "kilo" ? "border-emerald-300 focus:ring-emerald-400" : "border-gray-300 focus:ring-blue-500"}`}
                      placeholder={modoCantidad === "kilo" ? "Ingresa los kilos" : "Ingresa la cantidad"}
                    />
                    {getEquivalente(0) && !getErrorKg(0) && <p className="text-xs text-gray-400">{getEquivalente(0)}</p>}
                    {getErrorKg(0) && <p className="text-xs text-red-500 font-medium">⚠ {getErrorKg(0)}</p>}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {cantidadesTexto.map((valor, index) => (
                      <div key={index} className="space-y-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={valor}
                          onChange={(e) => handleCantidadChange(index, e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${getErrorKg(index) ? "border-red-400 focus:ring-red-400" : modoCantidad === "kilo" ? "border-emerald-300 focus:ring-emerald-400" : "border-gray-300 focus:ring-blue-500"}`}
                          placeholder={modoCantidad === "kilo" ? `Kilos ${index + 1}` : `Cantidad ${index + 1}`}
                        />
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
                    <button type="button" onClick={() => { setPreciosEditadosManualmente([false, false, false]); setPreciosTexto(["", "", ""]); }} className="text-xs text-blue-600 hover:text-blue-800 underline">↺ Restaurar</button>
                  )}
                </div>
                {errorCalculo && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-red-700 text-sm">⚠️ {errorCalculo}</p></div>}

                {modo === "pedido" ? (
                  <div className="space-y-1 max-w-xs">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={preciosTexto[0]}
                        onChange={(e) => handlePrecioChange(0, e.target.value)}
                        onBlur={() => handlePrecioBlur(0)}
                        className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${preciosEditadosManualmente[0] ? "border-orange-400 ring-1 ring-orange-300" : "border-gray-300 focus:ring-blue-500"}`}
                        placeholder={calculandoPrecios && !preciosEditadosManualmente[0] ? "Calculando..." : "0.0000"}
                      />
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
                          <input
                            type="text"
                            inputMode="decimal"
                            value={preciosTexto[index]}
                            onChange={(e) => handlePrecioChange(index, e.target.value)}
                            onBlur={() => handlePrecioBlur(index)}
                            className={`w-full px-4 py-2 border rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 ${preciosEditadosManualmente[index] ? "border-orange-400 ring-1 ring-orange-300" : "border-gray-300 focus:ring-blue-500"}`}
                            placeholder={calculandoPrecios && !preciosEditadosManualmente[index] ? "Calculando..." : "0.0000"}
                          />
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
                <textarea value={productoActual.observacion || ""} onChange={handleObservacionChange} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white" placeholder="Ej: Impresión a 2 colores, acabado mate, etc." />
              </div>

              <button type="button" onClick={handleAgregarProducto} disabled={guardandoProducto || hayErrorKg} className={`w-full px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${guardandoProducto || hayErrorKg ? "bg-gray-400 cursor-not-allowed text-white" : "bg-green-600 text-white hover:bg-green-700"}`}>
                {guardandoProducto ? (<><div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>Guardando...</>) : hayErrorKg ? "⚠ Corrige las cantidades (mín. 30 kg)" : "+ Agregar Producto"}
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
                      {prod.suajeTipo && <span className="text-blue-600 font-medium">Suaje: {prod.suajeTipo}</span>}
                      {prod.pantones  && <span className="text-purple-600 font-medium">🎨 {prod.pantones}</span>}
                      {prod.pigmentos && <span className="text-orange-600 font-medium">🧪 {prod.pigmentos}</span>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {(modo === "pedido" ? [0] : [0, 1, 2]).map((i) => {
                        const cant = prod.cantidades[i];
                        if (!cant || cant <= 0) return null;
                        return (
                          <p key={i} className="text-sm text-gray-700">
                            {prod.modoCantidad === "kilo"
                              ? `${prod.kilogramos[i]} kg (${cant.toLocaleString()} bolsas) × $${(prod.precios[i] * Number(prod.porKilo || 1)).toFixed(4)}/kg`
                              : `${cant.toLocaleString()} bolsas × $${prod.precios[i].toFixed(4)}/bolsa`
                            }
                            {" = $"}{(cant * prod.precios[i]).toFixed(2)}
                          </p>
                        );
                      })}
                    </div>
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
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={handleAtras} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Atrás</button>

          {!productoNuevoListo && datosProductoNuevo.tipoProducto && datosProductoNuevo.material && datosProductoNuevo.calibre && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={verificarDuplicadoAntesDeConfirmar}
                disabled={verificandoDuplicado}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:bg-blue-400"
              >
                {verificandoDuplicado ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Verificando...</>
                ) : (
                  "Confirmar producto →"
                )}
              </button>
            </div>
          )}

          {datos.productos.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              {modo === "pedido" ? "Crear Pedido" : "Crear Cotización"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}