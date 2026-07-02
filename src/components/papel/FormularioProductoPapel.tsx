// src/components/papel/FormularioProductoPapel.tsx
import { useState, useEffect } from "react";
import ComboboxInsumo from "../ComboboxInsumo";
import ModalRegistrarInsumo from "../ModalRegistrarInsumo";
import {
  getProductosPapel,
  getProductoPapelDetalle,
  mapearOpciones,
  getFoils,
  getTexturas,
  getColoresAsa,
} from "../../services/papel/papelCotizacionService";
import { crearProductoPapel } from "../../services/papel/papel.service";
import type {
  ProductoPapelBusqueda,
  GrupoOpcion,
  AsaOpcion,
  LaminadoOpcion,
  FoilOpcion,
  TexturaOpcion,
  ColorAsaOpcion,
  ProductoPapelCotizacion,
} from "../../types/papel/cotizacion-papel.types";
import type { Insumo } from "../../services/proveedoresService";
import FormularioProductoPapelAlta from "./FormularioProductoPapelAlta";
import type { ArchivoPendiente } from "./FormularioProductoPapelAlta";
import type { ProductoPapelForm } from "../../types/papel/papel.types";

export type { ProductoPapelCotizacion };

type MetodoHojeadoPapel = "hojeado" | "guillotina";
type MaquinariaSeleccionada = Record<
  string,
  { id: number; nombre: string } | null
>;

interface Props {
  modo: "cotizacion" | "pedido";
  onAgregar: (producto: ProductoPapelCotizacion) => void;
  productoEditando?: ProductoPapelCotizacion | null;
  onCancelarEdicion?: () => void;
  tintas?: { id: number; cantidad: number }[];
  caras?: { id: number; cantidad: number }[];
  idTipoPanton?: number | null;
  onRegistrarPanton?: (nombre: string, indice: number) => void;
}

const nuevoSpecs = () => ({
  idgrupo_papel: null as number | null,
  grupo_descripcion: "",
  precio_sugerido: null as number | null,
  tintasId: null as number | null,
  tintas: 0,
  pantones: "",
  tintasDentroId: null as number | null,
  tintasDentro: 0,
  pantonesDentro: "",
  carasId: null as number | null,
  caras: 0,
  id_asa: null as number | null,
  // FIX: id_color e color_asa_nombre se inicializan explícitamente en null
  // para que TypeScript los rastree como campos reales del estado y no los
  // pierda cuando el objeto specs se recrea (ej. al cambiar producto).
  id_color: null as number | null,
  color_asa_nombre: null as string | null,
  tamano_asa: "",
  idcat_laminado: null as number | null,
  idfoil: null as number | null,
  idcat_textura: null as number | null,
  uv: false,
  alto_relieve: false,
  metodo_hojeado: null as MetodoHojeadoPapel | null,
  lleva_armado: true,
  maquinaria_seleccionada: {} as MaquinariaSeleccionada,
  observacion: "",
  descripcion: null as string | null,
  cantidades: [0, 0, 0] as [number, number, number],
  precios: [0, 0, 0] as [number, number, number],
});

export default function FormularioProductoPapel({
  modo,
  onAgregar,
  productoEditando,
  onCancelarEdicion,
  tintas = [],
  caras = [],
  idTipoPanton = null,
  onRegistrarPanton,
}: Props) {
  const [modoProductoPapel, setModoProductoPapel] = useState<
    "registrado" | "nuevo"
  >("registrado");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<ProductoPapelBusqueda[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [savingNuevo, setSavingNuevo] = useState(false);

  const [productoSel, setProductoSel] = useState<ProductoPapelBusqueda | null>(
    null,
  );
  const [grupos, setGrupos] = useState<GrupoOpcion[]>([]);
  const [asas, setAsas] = useState<AsaOpcion[]>([]);
  const [laminados, setLaminados] = useState<LaminadoOpcion[]>([]);

  const [foils, setFoils] = useState<FoilOpcion[]>([]);
  const [texturas, setTexturas] = useState<TexturaOpcion[]>([]);
const [coloresAsa, setColoresAsa] = useState<ColorAsaOpcion[]>([]);
const [loadingColores, setLoadingColores] = useState(true);
  const [specs, setSpecs] = useState(nuevoSpecs());
  const [inputsPantones, setInputsPantones] = useState<string[]>([]);
  const [usaTintasDentro, setUsaTintasDentro] = useState(false);
  const [inputsPantonesDentro, setInputsPantonesDentro] = useState<string[]>(
    [],
  );
  const [cantidadesTexto, setCantidadesTexto] = useState<
    [string, string, string]
  >(["", "", ""]);
  const [preciosTexto, setPreciosTexto] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);

  // ── Herramental ──────────────────────────────────────────────────────────
  const [herramentalExpandido, setHerramentalExpandido] = useState(false);
  const [herramentalDescripcion, setHerramentalDescripcion] = useState("");
  const [herramentalPrecioTexto, setHerramentalPrecioTexto] = useState("");

  // ── Modal registrar insumo (pantones) ───────────────────────────────────
  // Autocontenido: no depende de onRegistrarPanton del padre.
  const [modalInsumo, setModalInsumo] = useState<{
    abierto: boolean;
    nombre: string;
    indice: number | null;
    esDentro: boolean;
  }>({ abierto: false, nombre: "", indice: null, esDentro: false });

  const herramentalTieneData =
    !!herramentalDescripcion.trim() ||
    (herramentalPrecioTexto !== "" && parseFloat(herramentalPrecioTexto) > 0);

  const indices = modo === "pedido" ? [0] : [0, 1, 2];
  const tintasPapel = tintas.filter((t) => {
    const cantidad = Number(t.cantidad);
    return cantidad >= 1 && cantidad <= 6;
  });

  const calcularCarasAutomaticas = (s = specs) => {
    const tieneTintasFrente = Number(s.tintas ?? 0) > 0 || s.tintasId != null;
    const tieneTintasDentro =
      Number(s.tintasDentro ?? 0) > 0 || s.tintasDentroId != null;

    if (!tieneTintasFrente && !tieneTintasDentro) {
      return { carasId: null as number | null, caras: 0 };
    }

    const cantidadCaras = tieneTintasDentro ? 2 : 1;
    const caraCatalogo = caras.find(
      (c) => Number(c.cantidad) === cantidadCaras,
    );

    return {
      carasId: caraCatalogo?.id ?? null,
      caras: Number(caraCatalogo?.cantidad ?? cantidadCaras),
    };
  };

  const carasAutomaticas = calcularCarasAutomaticas();

  useEffect(() => {
    (async () => {
      try {
        const [f, t] = await Promise.all([
          getFoils().catch(() => []),
          getTexturas().catch(() => []),
        ]);
        setFoils(Array.isArray(f) ? f : []);
        setTexturas(Array.isArray(t) ? t : []);
      } catch {
        setFoils([]);
        setTexturas([]);
      }
    })();
  }, []);

  useEffect(() => {
  setLoadingColores(true);
  getColoresAsa()
    .then((data) => {
      const lista = Array.isArray(data) ? data : [];
      setColoresAsa(lista);
      setSpecs((prev) => {
        if (prev.id_color != null && !prev.color_asa_nombre) {
          const found = lista.find((c) => c.id_color === prev.id_color);
          if (found) return { ...prev, color_asa_nombre: found.color };
        }
        if (prev.id_color == null && prev.color_asa_nombre) {
          const found = lista.find(
            (c) => c.color.toLowerCase() === prev.color_asa_nombre!.toLowerCase()
          );
          if (found) return { ...prev, id_color: found.id_color };
        }
        return prev;
      });
    })
    .catch((error) => {
      console.error("Error cargando colores de asa:", error);
      setColoresAsa([]);
    })
    .finally(() => setLoadingColores(false));
}, []);

  useEffect(() => {
    setInputsPantones((prev) =>
      Array(specs.tintas)
        .fill("")
        .map((_, i) => prev[i] || ""),
    );
  }, [specs.tintas]);

  useEffect(() => {
    setInputsPantonesDentro((prev) =>
      Array(specs.tintasDentro)
        .fill("")
        .map((_, i) => prev[i] || ""),
    );
  }, [specs.tintasDentro]);

  // FIX: Este efecto SOLO actualiza carasId y caras, y usa la forma
  // funcional de setSpecs para no depender del valor actual de specs
  // en el closure — así no puede borrar accidentalmente id_color.
  useEffect(() => {
    const auto = calcularCarasAutomaticas();
    setSpecs((prev) => {
      if (
        prev.carasId === auto.carasId &&
        Number(prev.caras ?? 0) === auto.caras
      )
        return prev;
      // Solo sobreescribe carasId y caras; el resto (incluido id_color) se preserva.
      return { ...prev, carasId: auto.carasId, caras: auto.caras };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    specs.tintasId,
    specs.tintas,
    specs.tintasDentroId,
    specs.tintasDentro,
    caras,
  ]);

  useEffect(() => {
    if (!productoEditando) return;
    setProductoSel({
      idproducto_papel: productoEditando.idproducto_papel,
      tipo_producto: productoEditando.nombre,
      descripcion_papel: productoEditando.descripcion_papel,
      medida: productoEditando.medida,
    });

    const idColorRestaurado = productoEditando.id_color ?? null;
    const nombreColorRestaurado =
      productoEditando.color_asa_nombre ??
      (productoEditando as any).asa_color ??
      null;

    let idColorFinal = idColorRestaurado;
    if (idColorFinal == null && nombreColorRestaurado && coloresAsa.length > 0) {
      const encontrado = coloresAsa.find(
        (c) => c.color.toLowerCase() === nombreColorRestaurado.toLowerCase(),
      );
      if (encontrado) idColorFinal = encontrado.id_color;
    }

    setSpecs({
      idgrupo_papel: productoEditando.idgrupo_papel,
      grupo_descripcion: productoEditando.grupo_descripcion,
      precio_sugerido: productoEditando.precio_sugerido,
      tintasId: productoEditando.tintasId,
      tintas: productoEditando.tintas,
      pantones: productoEditando.pantones,
      tintasDentroId: productoEditando.tintasDentroId,
      tintasDentro: productoEditando.tintasDentro,
      pantonesDentro: productoEditando.pantonesDentro,
      carasId: productoEditando.carasId,
      caras: productoEditando.caras,
      id_asa: productoEditando.id_asa,
      id_color: idColorFinal,
      color_asa_nombre: nombreColorRestaurado,
      tamano_asa: productoEditando.tamano_asa ?? "",
      idcat_laminado: productoEditando.idcat_laminado,
      idfoil: productoEditando.idfoil,
      idcat_textura: productoEditando.idcat_textura,
      uv: productoEditando.uv,
      alto_relieve: productoEditando.alto_relieve,
      metodo_hojeado:
        (
          productoEditando as ProductoPapelCotizacion & {
            metodo_hojeado?: MetodoHojeadoPapel | null;
          }
        ).metodo_hojeado ?? null,
      lleva_armado:
        (
          productoEditando as ProductoPapelCotizacion & {
            lleva_armado?: boolean;
          }
        ).lleva_armado ?? true,
      maquinaria_seleccionada:
        (
          productoEditando as ProductoPapelCotizacion & {
            maquinaria_seleccionada?: MaquinariaSeleccionada;
          }
        ).maquinaria_seleccionada ?? {},
      observacion: productoEditando.observacion,
      descripcion: productoEditando.descripcion,
      cantidades: productoEditando.cantidades,
      precios: productoEditando.precios,
    });
    setInputsPantones(
      productoEditando.pantones
        ? productoEditando.pantones.split(", ").map((s) => s.trim())
        : [],
    );
    setUsaTintasDentro(!!productoEditando.tintasDentroId);
    setInputsPantonesDentro(
      productoEditando.pantonesDentro
        ? productoEditando.pantonesDentro.split(", ").map((s) => s.trim())
        : [],
    );
    setCantidadesTexto([
      productoEditando.cantidades[0] > 0
        ? String(productoEditando.cantidades[0])
        : "",
      productoEditando.cantidades[1] > 0
        ? String(productoEditando.cantidades[1])
        : "",
      productoEditando.cantidades[2] > 0
        ? String(productoEditando.cantidades[2])
        : "",
    ]);
    setPreciosTexto([
      productoEditando.precios[0] > 0
        ? productoEditando.precios[0].toFixed(4)
        : "",
      productoEditando.precios[1] > 0
        ? productoEditando.precios[1].toFixed(4)
        : "",
      productoEditando.precios[2] > 0
        ? productoEditando.precios[2].toFixed(4)
        : "",
    ]);
    setHerramentalDescripcion(
      (productoEditando as any).herramental_descripcion || "",
    );
    setHerramentalPrecioTexto(
      (productoEditando as any).herramental_precio != null
        ? String((productoEditando as any).herramental_precio)
        : "",
    );
    setHerramentalExpandido(
      !!(productoEditando as any).herramental_descripcion ||
        (productoEditando as any).herramental_precio != null,
    );
    cargarDetalleProducto(productoEditando.idproducto_papel);
  }, [productoEditando]);

  // AGREGAR después del useEffect de productoEditando:
useEffect(() => {
  if (loadingColores || coloresAsa.length === 0) return;
  setSpecs((prev) => {
    if (prev.id_color != null && !prev.color_asa_nombre) {
      const found = coloresAsa.find((c) => c.id_color === prev.id_color);
      if (found) return { ...prev, color_asa_nombre: found.color };
    }
    if (prev.id_color == null && prev.color_asa_nombre) {
      const found = coloresAsa.find(
        (c) => c.color.toLowerCase() === prev.color_asa_nombre!.toLowerCase()
      );
      if (found) return { ...prev, id_color: found.id_color };
    }
    return prev;
  });
}, [loadingColores, coloresAsa]);

  const resetForm = () => {
    setProductoSel(null);
    setGrupos([]);
    setAsas([]);
    setLaminados([]);
    setSpecs(nuevoSpecs());
    setInputsPantones([]);
    setUsaTintasDentro(false);
    setInputsPantonesDentro([]);
    setCantidadesTexto(["", "", ""]);
    setPreciosTexto(["", "", ""]);
    setHerramentalExpandido(false);
    setHerramentalDescripcion("");
    setHerramentalPrecioTexto("");
  };

  const cargarProductos = async (q = "") => {
    setLoadingProductos(true);
    try {
      setProductos(await getProductosPapel(q));
    } catch {
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    if (!mostrarModal) return;
    const t = setTimeout(() => cargarProductos(busqueda), 400);
    return () => clearTimeout(t);
  }, [busqueda, mostrarModal]);

  useEffect(() => {
    if (mostrarModal && productos.length === 0) cargarProductos();
  }, [mostrarModal]);

  const cargarDetalleProducto = async (
    id: number,
    aplicarTamanoAsaDefault = false,
  ): Promise<GrupoOpcion[]> => {
    try {
      const det = await getProductoPapelDetalle(id);
      const { grupos: g, asas: a, laminados: l } = mapearOpciones(det);
      setGrupos(g);
      setAsas(a);
      setLaminados(l);
      if (aplicarTamanoAsaDefault) {
        setSpecs((prev) => ({
          ...prev,
          tamano_asa: det.tamano_asa_default?.trim() ?? "",
        }));
      }
      return g;
    } catch {
      setGrupos([]);
      setAsas([]);
      setLaminados([]);
      return [];
    }
  };

  const aplicarSugerido = (precio: number | null) => {
    if (precio == null) return;
    setPreciosTexto((prev) => {
      const t = [...prev] as [string, string, string];
      indices.forEach((i) => {
        t[i] = precio.toFixed(4);
      });
      return t;
    });
    setSpecs((prev) => {
      const p = [...prev.precios] as [number, number, number];
      indices.forEach((i) => {
        p[i] = precio;
      });
      return { ...prev, precios: p };
    });
  };

  const seleccionarProducto = async (p: ProductoPapelBusqueda) => {
    setProductoSel(p);
    setMostrarModal(false);
    setBusqueda("");
    // Al cambiar de producto se reinicia todo el formulario porque el nuevo
    // producto puede tener asas y colores completamente distintos.
    setSpecs(nuevoSpecs());
    setInputsPantones([]);
    setUsaTintasDentro(false);
    setInputsPantonesDentro([]);
    setCantidadesTexto(["", "", ""]);
    setPreciosTexto(["", "", ""]);

    const gruposParsed = await cargarDetalleProducto(p.idproducto_papel, true);
    if (gruposParsed.length > 0) {
      const g = gruposParsed[0];
      setSpecs((prev) => ({
        ...prev,
        idgrupo_papel: g.idgrupo_papel,
        grupo_descripcion: g.etiqueta,
        precio_sugerido: g.precio_sugerido,
      }));
      aplicarSugerido(g.precio_sugerido);
    }
  };

  const handleGuardarNuevo = async (
    form: ProductoPapelForm,
    pendientes: ArchivoPendiente[],
  ) => {
    setSavingNuevo(true);
    try {
      const creado = await crearProductoPapel(form);

      if (pendientes.length > 0) {
        const BASE = (import.meta as any).env.VITE_API_URL;
        const CATEGORIA_A_SUBCARPETA: Record<string, string> = {
          "catalogo-suaje-papel": "catalogo",
          "imagen-suaje-papel": "imagen",
          "rendimiento-suaje-papel": "rendimiento",
        };
        await Promise.allSettled(
          pendientes.map(async (p) => {
            const subcarpeta =
              CATEGORIA_A_SUBCARPETA[p.categoria] ?? "catalogo";
            const fd = new FormData();
            fd.append("archivo", p.file);
            fd.append("carpeta", "suaje");
            fd.append("subcarpeta", subcarpeta);
            fd.append("categoria", p.categoria);
            fd.append("idproducto_papel", String(creado.idproducto_papel));
            await fetch(`${BASE}/archivos/upload`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
              },
              body: fd,
            });
          }),
        );
      }

      const productoBase: ProductoPapelBusqueda = {
        idproducto_papel: creado.idproducto_papel,
        tipo_producto: form.tipoProductoNombre,
        descripcion_papel: form.descripcion || null,
        medida: form.medida || null,
        tamano_asa_default: form.tamanoAsaDefault?.trim() || null,
      };
      setProductoSel(productoBase);
      setMostrarModalNuevo(false);
      setModoProductoPapel("registrado");
      setSpecs(nuevoSpecs());
      setInputsPantones([]);
      setUsaTintasDentro(false);
      setInputsPantonesDentro([]);
      setCantidadesTexto(["", "", ""]);
      setPreciosTexto(["", "", ""]);

      const gruposParsed = await cargarDetalleProducto(
        creado.idproducto_papel,
        true,
      );
      if (gruposParsed.length > 0) {
        const g = gruposParsed[0];
        setSpecs((prev) => ({
          ...prev,
          idgrupo_papel: g.idgrupo_papel,
          grupo_descripcion: g.etiqueta,
          precio_sugerido: g.precio_sugerido,
        }));
        aplicarSugerido(g.precio_sugerido);
      }
    } catch (e: any) {
      alert(e.message ?? "Error al registrar el producto");
    } finally {
      setSavingNuevo(false);
    }
  };

  const handleGrupo = (idStr: string) => {
    const g = grupos.find((x) => x.idgrupo_papel === Number(idStr));
    if (!g) return;
    setSpecs((prev) => ({
      ...prev,
      idgrupo_papel: g.idgrupo_papel,
      grupo_descripcion: g.etiqueta,
      precio_sugerido: g.precio_sugerido,
    }));
    aplicarSugerido(g.precio_sugerido);
  };

  // FIX: handleColorAsa ahora también actualiza color_asa_nombre de forma
  // garantizada usando el catálogo local. Antes podía quedar desincronizado
  // si coloresAsa tardaba en cargarse o si el usuario cambiaba el asa
  // primero y el color después.
  const handleColorAsa = (idStr: string) => {
    const idColor = idStr ? Number(idStr) : null;
    const color = coloresAsa.find((item) => item.id_color === idColor) ?? null;

    setSpecs((prev) => ({
      ...prev,
      id_color: idColor,
      color_asa_nombre: color?.color ?? null,
    }));
  };

  const handleTintas = (idStr: string) => {
    const t = tintasPapel.find((x) => x.id === Number(idStr));
    setSpecs((prev) => ({
      ...prev,
      tintasId: t?.id ?? null,
      tintas: t?.cantidad ?? 0,
    }));
  };
  const handleTintasDentro = (idStr: string) => {
    const t = tintasPapel.find((x) => x.id === Number(idStr));
    setSpecs((prev) => ({
      ...prev,
      tintasDentroId: t?.id ?? null,
      tintasDentro: t?.cantidad ?? 0,
    }));
  };
  const handlePantone = (i: number, val: string) => {
    const nuevos = [...inputsPantones];
    nuevos[i] = val;
    setInputsPantones(nuevos);
    setSpecs((prev) => ({
      ...prev,
      pantones: nuevos.join(", ").replace(/^[\s,]+|[\s,]+$/g, ""),
    }));
  };
  const handlePantoneDentro = (i: number, val: string) => {
    const nuevos = [...inputsPantonesDentro];
    nuevos[i] = val;
    setInputsPantonesDentro(nuevos);
    setSpecs((prev) => ({
      ...prev,
      pantonesDentro: nuevos.join(", ").replace(/^[\s,]+|[\s,]+$/g, ""),
    }));
  };

  // ── Modal registrar insumo (pantones frente / interior) ─────────────────
  const abrirModalInsumo = (nombre: string, indice: number, esDentro: boolean) => {
    setModalInsumo({ abierto: true, nombre, indice, esDentro });
  };

  const handleInsumoRegistrado = (item: Insumo) => {
    // Si el insumo quedó con un solo proveedor, usamos su código; si tiene
    // varios (o ninguno), no hay un código único que mostrar en el texto.
    const codigo =
      item.proveedores && item.proveedores.length === 1
        ? item.proveedores[0].codigo
        : null;
    const texto = codigo ? `${item.nombre} (${codigo})` : item.nombre;

    if (modalInsumo.indice !== null) {
      if (modalInsumo.esDentro) {
        handlePantoneDentro(modalInsumo.indice, texto);
      } else {
        handlePantone(modalInsumo.indice, texto);
      }
    }
    setModalInsumo({ abierto: false, nombre: "", indice: null, esDentro: false });
  };

  const handleCantidad = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const t = [...cantidadesTexto] as [string, string, string];
    t[i] = v;
    setCantidadesTexto(t);
    const c = [...specs.cantidades] as [number, number, number];
    c[i] = v === "" ? 0 : parseInt(v);
    setSpecs((prev) => ({ ...prev, cantidades: c }));
  };

  const handlePrecio = (i: number, v: string) => {
    if (!/^\d*\.?\d{0,4}$/.test(v)) return;
    const t = [...preciosTexto] as [string, string, string];
    t[i] = v;
    setPreciosTexto(t);
    const p = [...specs.precios] as [number, number, number];
    p[i] = v === "" ? 0 : parseFloat(v);
    setSpecs((prev) => ({ ...prev, precios: p }));
  };

  const handlePrecioBlur = (i: number) => {
    const v = parseFloat(preciosTexto[i]);
    const t = [...preciosTexto] as [string, string, string];
    t[i] = isNaN(v) ? "" : v.toFixed(4);
    setPreciosTexto(t);
  };

  const handleAgregar = () => {
    if (!productoSel) return;
    const tieneValido = indices.some(
      (i) => specs.cantidades[i] > 0 && specs.precios[i] > 0,
    );
    if (!tieneValido) {
      alert("Ingresa al menos una cantidad y precio válidos");
      return;
    }
    if (!specs.tintasId || specs.tintas <= 0) {
      alert("Selecciona las tintas. La impresión es obligatoria para papel");
      return;
    }

    const asaSel = asas.find((a) => a.idcat_tipo_asa === specs.id_asa);
    const lamSel = laminados.find(
      (l) => l.idcat_laminado === specs.idcat_laminado,
    );
    const foilSel = foils.find((f) => f.idfoil === specs.idfoil);
    const texSel = texturas.find(
      (t) => t.idcat_textura === specs.idcat_textura,
    );

    // FIX: id_color y color_asa_nombre se resuelven desde specs directamente.
    // NO se condicionan a que asaSel exista en este momento — la condición
    // de "solo guardar si hay asa" la aplica el backend. Aquí solo enviamos
    // lo que el usuario seleccionó. Si el usuario eligió asa+color y luego
    // deseleccionó el asa, tanto id_asa como id_color quedarán en null
    // porque handleAsa ya los limpia en ese caso.
    const idColorFinal = specs.id_asa ? (specs.id_color ?? null) : null;
    let colorNombreFinal = specs.id_asa ? (specs.color_asa_nombre ?? null) : null;
    if (idColorFinal != null && !colorNombreFinal && coloresAsa.length > 0) {
      const found = coloresAsa.find((c) => c.id_color === idColorFinal);
      if (found) colorNombreFinal = found.color;
    }

    const herramentalPrecioFinal =
      herramentalPrecioTexto !== ""
        ? parseFloat(herramentalPrecioTexto) || null
        : null;
    const herramentalDescFinal = herramentalDescripcion.trim() || null;
    const carasFinales = calcularCarasAutomaticas();

    // Log de diagnóstico — confirma que id_color llega al payload.
    console.log(
      `🎨 handleAgregar papel: id_asa=${specs.id_asa} | id_color=${specs.id_color} | id_color enviado=${idColorFinal} | color_asa_nombre=${colorNombreFinal}`
    );

    const producto: ProductoPapelCotizacion = {
      tipoCotizacion: "papel",
      idproducto_papel: productoSel.idproducto_papel,
      nombre: productoSel.tipo_producto,
      descripcion_papel: productoSel.descripcion_papel,
      medida: productoSel.medida,
      idgrupo_papel: specs.idgrupo_papel,
      grupo_descripcion: specs.grupo_descripcion,
      precio_sugerido: specs.precio_sugerido,
      tintasId: specs.tintasId,
      tintas: specs.tintas,
      pantones: specs.pantones,
      tintasDentroId: specs.tintasDentroId,
      tintasDentro: specs.tintasDentro,
      pantonesDentro: specs.pantonesDentro,
      carasId: carasFinales.carasId,
      caras: carasFinales.caras,
      id_asa: specs.id_asa,
      asa_nombre: asaSel?.nombre ?? null,
      // FIX: se usan las variables resueltas arriba, no el acceso directo
      // a specs dentro de una expresión condicional que podría evaluarse
      // en el momento equivocado del ciclo de renders.
      id_color: idColorFinal,
      color_asa_nombre: colorNombreFinal,
      asa_color: colorNombreFinal,
      tamano_asa: specs.id_asa ? specs.tamano_asa.trim() || null : null,
      idcat_laminado: specs.idcat_laminado,
      laminado_nombre: lamSel?.nombre ?? null,
      idfoil: specs.idfoil,
      foil_nombre: foilSel
        ? `${foilSel.colorfoil}${foilSel.codigofoil ? " " + foilSel.codigofoil : ""}`
        : null,
      idcat_textura: specs.idcat_textura,
      textura_nombre: texSel?.nombre ?? null,
      uv: specs.uv,
      alto_relieve: specs.alto_relieve,
      metodo_hojeado: specs.metodo_hojeado,
      lleva_armado: specs.lleva_armado,
      maquinaria_seleccionada: specs.maquinaria_seleccionada,
      observacion: specs.observacion,
      descripcion: specs.descripcion,
      cantidades: specs.cantidades,
      precios: specs.precios,
      herramental_descripcion: herramentalDescFinal,
      herramental_precio: herramentalPrecioFinal,
    } as any;

    onAgregar(producto);
    resetForm();
  };

  const hayProducto = !!productoSel;
  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400";
  const selectCls = inputCls + " cursor-pointer";
  const checkCls =
    "w-4 h-4 rounded border-gray-400 text-amber-600 focus:ring-amber-400 cursor-pointer";

  const celdasPantone = (
    lista: string[],
    onChange: (i: number, v: string) => void,
    onRegistrarNuevo: (nombre: string, i: number) => void,
  ) => (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
      {lista.map((valor, i) => (
        <div key={i} className="flex items-center gap-2 w-full">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <ComboboxInsumo
              tipoId={idTipoPanton}
              placeholder={`Tinta ${i + 1}...`}
              value={valor}
              onChange={(val: string) => onChange(i, val)}
              onSeleccionar={(item: any) => {
                // buscarInsumos ahora agrupa por insumo — un mismo pantón
                // puede tener varios proveedores. Si solo tiene uno,
                // mostramos su código; si tiene varios (o ninguno), solo
                // el nombre, ya que no hay un código único que mostrar.
                const codigo =
                  item.proveedores && item.proveedores.length === 1
                    ? item.proveedores[0].codigo
                    : null;
                onChange(i, codigo ? `${item.nombre} (${codigo})` : item.nombre);
              }}
              onRegistrarNuevo={(nombre: string) => onRegistrarNuevo(nombre, i)}
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Modal búsqueda existente ── */}
      {mostrarModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Buscar Producto de Papel
                </h3>
                <button
                  onClick={() => {
                    setMostrarModal(false);
                    setBusqueda("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por tipo, medida, descripción o material..."
                  className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-amber-400"
                  autoFocus
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              {loadingProductos ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
                  <p className="mt-3 text-gray-500 text-sm">Cargando...</p>
                </div>
              ) : productos.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {productos.map((p) => (
                    <div
                      key={p.idproducto_papel}
                      onClick={() => seleccionarProducto(p)}
                      className="p-4 hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {p.tipo_producto}
                        </span>
                        {p.descripcion_papel && (
                          <span className="text-xs text-gray-500">
                            — {p.descripcion_papel}
                          </span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">
                          #{p.idproducto_papel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
                        {p.medida && <span>Medida: {p.medida}</span>}
                        {(p as any).primer_tipo_papel && (
                          <span>Material: {(p as any).primer_tipo_papel}</span>
                        )}
                        {(p as any).primer_calibre && (
                          <span>Calibre: {(p as any).primer_calibre}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No se encontraron productos
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal alta de nuevo producto ── */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-hidden p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 relative max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden">
            <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white z-10 rounded-t-xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Registrar nuevo producto de papel
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Todos los campos son opcionales — guarda lo que tengas
                  disponible
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalNuevo(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <FormularioProductoPapelAlta
                onSave={handleGuardarNuevo}
                onCancel={() => setMostrarModalNuevo(false)}
                saving={savingNuevo}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal registrar insumo nuevo (pantones) ── */}
      {modalInsumo.abierto && (
        <ModalRegistrarInsumo
          tipoInsumoInicial={idTipoPanton ?? 0}
          nombreInicial={modalInsumo.nombre}
          onRegistrado={handleInsumoRegistrado}
          onCancelar={() =>
            setModalInsumo({ abierto: false, nombre: "", indice: null, esDentro: false })
          }
        />
      )}

      <div className="pr-1">
        {/* ── Banner edición ── */}
        {productoEditando && (
          <div className="mb-4 flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">✏️</span>
              <span className="text-sm font-semibold text-amber-800">
                Editando: {productoEditando.nombre}
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelarEdicion}
              className="text-xs text-amber-500 hover:text-amber-700 underline"
            >
              Cancelar edición
            </button>
          </div>
        )}

        {/* ── Tabs Existente / Nuevo ── */}
        <div className="mb-4 flex gap-3 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setModoProductoPapel("registrado")}
            className={`flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-all ${modoProductoPapel === "registrado" ? "bg-white text-amber-600 shadow" : "text-gray-600 hover:text-gray-900"}`}
          >
            📄 Existente
          </button>
          <button
            type="button"
            onClick={() => setModoProductoPapel("nuevo")}
            className={`flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-all ${modoProductoPapel === "nuevo" ? "bg-white text-green-600 shadow" : "text-gray-600 hover:text-gray-900"}`}
          >
            ✚ Nuevo
          </button>
        </div>

        {/* ── Selector de producto ── */}
        <div className="mb-4">
          {modoProductoPapel === "registrado" ? (
            <button
              type="button"
              onClick={() => setMostrarModal(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg text-gray-600 hover:border-amber-500 hover:text-amber-700 flex items-center justify-center gap-2 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {productoSel
                ? "Cambiar producto"
                : "Click para buscar producto de papel"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarModalNuevo(true)}
              className="w-full px-4 py-3 border-2 border-dashed border-green-300 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-700 flex items-center justify-center gap-2 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {productoSel
                ? "Registrar otro producto nuevo"
                : "Click para registrar producto nuevo"}
            </button>
          )}

          {productoSel && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {productoSel.tipo_producto}
                  </p>
                  {productoSel.descripcion_papel && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {productoSel.descripcion_papel}
                    </p>
                  )}
                  {productoSel.medida && (
                    <p className="text-xs text-gray-600 mt-1">
                      Medida: {productoSel.medida}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  #{productoSel.idproducto_papel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Specs ── */}
        {hayProducto && (
          <div className="space-y-4 border-t border-gray-200 pt-4">
            {/* Grupo / material */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de papel / Opción{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (materiales registrados)
                </span>
              </label>
              {grupos.length > 0 ? (
                <select
                  value={specs.idgrupo_papel ?? ""}
                  onChange={(e) => handleGrupo(e.target.value)}
                  className={selectCls}
                >
                  {grupos.map((g) => (
                    <option key={g.idgrupo_papel} value={g.idgrupo_papel}>
                      {g.etiqueta}
                      {g.precio_sugerido != null
                        ? `  —  $${g.precio_sugerido.toFixed(2)}`
                        : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Este producto no tiene opciones de material registradas.
                </p>
              )}
              {specs.precio_sugerido != null && (
                <p className="text-xs text-amber-600 mt-1">
                  💡 Precio sugerido aplicado:{" "}
                  <strong>${specs.precio_sugerido.toFixed(2)}</strong>
                </p>
              )}
            </div>

            {/* Cantidades y precios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {modo === "pedido"
                  ? "Cantidad (piezas)"
                  : "Cantidades (piezas — hasta 3 opciones)"}
              </label>
              <div
                className={`grid gap-3 ${modo === "pedido" ? "grid-cols-1 max-w-xs" : "grid-cols-3"}`}
              >
                {indices.map((i) => (
                  <div key={i} className="space-y-1">
                    {modo === "cotizacion" && (
                      <span className="text-xs text-gray-400">
                        Opción {i + 1}
                      </span>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cantidadesTexto[i]}
                      onChange={(e) => handleCantidad(i, e.target.value)}
                      placeholder={
                        modo === "pedido" ? "Piezas" : `Piezas ${i + 1}`
                      }
                      className={inputCls}
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={preciosTexto[i]}
                        onChange={(e) => handlePrecio(i, e.target.value)}
                        onBlur={() => handlePrecioBlur(i)}
                        placeholder="Precio c/u"
                        className={`${inputCls} pl-6`}
                      />
                    </div>
                    {specs.cantidades[i] > 0 && specs.precios[i] > 0 && (
                      <p className="text-xs text-gray-400">
                        Total: $
                        {(
                          specs.cantidades[i] * specs.precios[i]
                        ).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tintas y Caras */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tintas frente
                </label>
                <select
                  value={specs.tintasId ?? ""}
                  onChange={(e) => handleTintas(e.target.value)}
                  className={selectCls}
                >
                  <option value="" disabled>
                    Selecciona...
                  </option>
                  {tintasPapel.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caras
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
                  {carasAutomaticas.caras > 0
                    ? `${carasAutomaticas.caras} cara${carasAutomaticas.caras > 1 ? "s" : ""}`
                    : "Automático"}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Frente = 1 cara · Frente + interior = 2 caras
                </p>
              </div>
            </div>

            {/* Pantones exteriores */}
            {specs.tintas > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pantones{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    ({specs.tintas} tinta{specs.tintas > 1 ? "s" : ""})
                  </span>
                </label>
                {celdasPantone(inputsPantones, handlePantone, (nombre, i) =>
                  abrirModalInsumo(nombre, i, false),
                )}
                {specs.pantones && (
                  <p className="text-xs text-purple-500 mt-1">
                    Guardado:{" "}
                    <span className="font-medium">{specs.pantones}</span>
                  </p>
                )}
              </div>
            )}

            {/* Tintas por dentro */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={usaTintasDentro}
                  onChange={(e) => {
                    setUsaTintasDentro(e.target.checked);
                    if (!e.target.checked) {
                      setSpecs((prev) => ({
                        ...prev,
                        tintasDentroId: null,
                        tintasDentro: 0,
                        pantonesDentro: "",
                      }));
                      setInputsPantonesDentro([]);
                    }
                  }}
                  className={checkCls}
                />
                <span className="text-sm font-medium text-gray-700">
                  ¿Tintas por dentro?
                </span>
              </label>
              {usaTintasDentro && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-amber-200">
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tintas (interior)
                    </label>
                    <select
                      value={specs.tintasDentroId ?? ""}
                      onChange={(e) => handleTintasDentro(e.target.value)}
                      className={selectCls}
                    >
                      <option value="" disabled>
                        Selecciona...
                      </option>
                      {tintasPapel.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.cantidad} tinta{t.cantidad > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {specs.tintasDentro > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pantones interior{" "}
                        <span className="text-xs text-gray-400 font-normal">
                          ({specs.tintasDentro})
                        </span>
                      </label>
                      {celdasPantone(
                        inputsPantonesDentro,
                        handlePantoneDentro,
                        (nombre, i) => abrirModalInsumo(nombre, i, true),
                      )}
                      {specs.pantonesDentro && (
                        <p className="text-xs text-purple-500 mt-1">
                          Guardado:{" "}
                          <span className="font-medium">
                            {specs.pantonesDentro}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Asa, Color de Asa y Laminado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asa{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (opcional)
                  </span>
                </label>
                <select
                  value={specs.id_asa ?? ""}
                  onChange={(e) => {
                    const nuevoIdAsa = e.target.value ? Number(e.target.value) : null;
                    setSpecs((prev) => ({
                      ...prev,
                      id_asa: nuevoIdAsa,
                      id_color: nuevoIdAsa ? prev.id_color : null,
                      color_asa_nombre: nuevoIdAsa ? prev.color_asa_nombre : null,
                      tamano_asa: nuevoIdAsa ? prev.tamano_asa : "",
                    }));
                  }}
                  className={selectCls}
                  disabled={asas.length === 0}
                >
                  <option value="">
                    {asas.length === 0 ? "Sin asas en el producto" : "Sin asa"}
                  </option>
                  {asas.map((a) => (
                    <option key={a.idcat_tipo_asa} value={a.idcat_tipo_asa}>
                      {a.nombre}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                  Color de asa{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (opcional)
                  </span>
                </label>
                <select
                  value={specs.id_color ?? ""}
                  onChange={(e) => handleColorAsa(e.target.value)}
                  className={selectCls}
                  disabled={!specs.id_asa || loadingColores}
                >
                  <option value="">
                    {loadingColores
                      ? "Cargando colores..."
                      : coloresAsa.length === 0
                        ? "Sin colores registrados"
                        : "Sin color"}
                  </option>
                  {!loadingColores && coloresAsa.map((color) => (
                    <option key={color.id_color} value={color.id_color}>
                      {color.color}
                    </option>
                  ))}
                </select>
                {/* FIX: indicador visual del color seleccionado para confirmar
                    que el estado se actualizó correctamente antes de agregar. */}
                {specs.id_asa && specs.color_asa_nombre && (
                  <p className="text-xs text-amber-600 mt-1">
                    ✓ Color: <strong>{specs.color_asa_nombre}</strong>
                  </p>
                )}

                <label className="block text-sm font-medium text-gray-700 mt-3 mb-1">
                  Tamaño de asa{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (editable)
                  </span>
                </label>
                <input
                  type="text"
                  value={specs.tamano_asa}
                  onChange={(e) =>
                    setSpecs((prev) => ({
                      ...prev,
                      tamano_asa: e.target.value,
                    }))
                  }
                  placeholder="Ej. 30 x 2 cm"
                  className={inputCls}
                  disabled={!specs.id_asa}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Laminado{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (opcional)
                  </span>
                </label>
                <select
                  value={specs.idcat_laminado ?? ""}
                  onChange={(e) =>
                    setSpecs((prev) => ({
                      ...prev,
                      idcat_laminado: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  className={selectCls}
                  disabled={laminados.length === 0}
                >
                  <option value="">
                    {laminados.length === 0
                      ? "Sin laminados en el producto"
                      : "Sin laminado"}
                  </option>
                  {laminados.map((l) => (
                    <option key={l.idcat_laminado} value={l.idcat_laminado}>
                      {l.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Foil y Textura */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Foil{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (opcional)
                  </span>
                </label>
                <select
                  value={specs.idfoil ?? ""}
                  onChange={(e) =>
                    setSpecs((prev) => ({
                      ...prev,
                      idfoil: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className={selectCls}
                >
                  <option value="">Sin foil</option>
                  {foils.map((f) => (
                    <option key={f.idfoil} value={f.idfoil}>
                      {f.colorfoil}
                      {f.codigofoil ? ` ${f.codigofoil}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Texturizado{" "}
                  <span className="text-xs text-gray-400 font-normal">
                    (opcional)
                  </span>
                </label>
                <select
                  value={specs.idcat_textura ?? ""}
                  onChange={(e) =>
                    setSpecs((prev) => ({
                      ...prev,
                      idcat_textura: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  className={selectCls}
                >
                  <option value="">Sin textura</option>
                  {texturas.map((t) => (
                    <option key={t.idcat_textura} value={t.idcat_textura}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* UV y Alto relieve */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acabados especiales
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["uv", "🔆 UV"],
                    ["alto_relieve", "🔳 Alto relieve"],
                  ] as [keyof typeof specs, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors ${specs[key] ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!specs[key]}
                      onChange={(e) =>
                        setSpecs((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className={checkCls}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                value={specs.descripcion ?? ""}
                onChange={(e) =>
                  setSpecs((prev) => ({
                    ...prev,
                    descripcion: e.target.value || null,
                  }))
                }
                placeholder="Ej: 1er Grado..."
                className={inputCls}
                maxLength={150}
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones{" "}
                <span className="text-xs text-gray-400 font-normal">
                  (opcional)
                </span>
              </label>
              <textarea
                value={specs.observacion}
                onChange={(e) =>
                  setSpecs((prev) => ({ ...prev, observacion: e.target.value }))
                }
                rows={2}
                placeholder="Detalles adicionales..."
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* ── Herramental ─────────────────────────────────────────────────── */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setHerramentalExpandido((prev) => !prev)}
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left
                ${herramentalTieneData ? "bg-orange-50 hover:bg-orange-100" : "bg-gray-100 hover:bg-gray-200"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🔧</span>
                  <span
                    className={`text-sm font-semibold ${herramentalTieneData ? "text-orange-800" : "text-gray-600"}`}
                  >
                    Herramental
                  </span>
                  <span className="text-xs font-normal text-gray-400">
                    (opcional)
                  </span>
                  {herramentalTieneData && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
                      ${parseFloat(herramentalPrecioTexto || "0").toFixed(2)}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${herramentalExpandido ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {herramentalExpandido && (
                <div className="p-4 bg-white space-y-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400">
                    Indica el herramental requerido para este producto. Se
                    sumará al total.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Descripción / Características
                    </label>
                    <textarea
                      value={herramentalDescripcion}
                      onChange={(e) =>
                        setHerramentalDescripcion(e.target.value)
                      }
                      rows={2}
                      placeholder="Ej: Suaje nuevo para troquel 40x30..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900
                               bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Precio <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={herramentalPrecioTexto}
                          onChange={(e) => {
                            if (!/^\d*\.?\d{0,2}$/.test(e.target.value)) return;
                            setHerramentalPrecioTexto(e.target.value);
                          }}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                                   text-gray-900 bg-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                        />
                      </div>
                    </div>
                    {herramentalTieneData && (
                      <button
                        type="button"
                        onClick={() => {
                          setHerramentalDescripcion("");
                          setHerramentalPrecioTexto("");
                          setHerramentalExpandido(false);
                        }}
                        className="px-3 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50
                                 border border-red-200 rounded-lg transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  {herramentalTieneData && (
                    <p className="text-xs text-orange-600 font-medium">
                      ✓ Herramental de $
                      {parseFloat(herramentalPrecioTexto || "0").toFixed(2)}{" "}
                      incluido en el total
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              {productoEditando && (
                <button
                  type="button"
                  onClick={onCancelarEdicion}
                  className="h-10 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={handleAgregar}
                className={`h-10 px-5 rounded-lg font-semibold text-white transition-colors ${productoEditando ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-600 hover:bg-amber-700"}`}
              >
                {productoEditando
                  ? "Guardar cambios"
                  : "+ Agregar Producto de Papel"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}