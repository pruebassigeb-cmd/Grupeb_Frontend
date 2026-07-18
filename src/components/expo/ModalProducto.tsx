// src/components/expo/ModalProducto.tsx
import { useState, useRef, useEffect, useMemo } from "react";
import { CATS } from "../../types/expo/expo.types";
import type {
  Producto,
  OpcionesRegistroExpoResponse,
  ProductoSistemaPapelExpo,
  ProductoSistemaPlasticoExpo,
} from "../../types/expo/expo.types";
import type { Catalogs } from "../../types/papel/papel.types";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";
import api from "../../services/api";
import { getOpcionesRegistroExpo } from "../../services/expo/expoService";
import { getTiposInsumo, buscarInsumos, type Insumo } from "../../services/proveedoresService";
import {
  construirMedidaPapel,
  construirMedidaPlastico,
} from "../../utils/expo/formatoMedidas";
import {
  calibresPapelCompatibles,
  grupoPapelPorCalibre,
  precioFormulario,
  productosPlasticoCompatibles,
  valorFormulario,
} from "../../utils/expo/opcionesRegistroExpo";

// ─── Tipos catálogos plástico ─────────────────────────────────────────────────
interface TipoProducto { id: number; nombre: string; }
interface Material     { id: number; nombre: string; }
interface Calibre      { id: number; valor: string | number; gramos?: number | null; }
interface PigmentoOpcion { id: number; nombre: string; codigo: string | null; }

// Cantidades de tintas soportadas — número plano; el backend resuelve el id
// real de la tabla `tintas` justo antes de guardar. No se maneja pantones
// en este cotizador — solo el número de tintas.
const OPCIONES_CANTIDAD_TINTAS = [0, 1, 2, 3, 4, 5, 6];

// ─── CONFIG medidas por tipo ──────────────────────────────────────────────────
type MedidaPos = "top" | "left" | "bottom" | "right" | "right-top" | "left-bottom" | "top-inside";
interface MedidaDef { key: MedidaKey; label: string; position: MedidaPos; }
type MedidaKey = "altura" | "ancho" | "fuelleFondo" | "fuelleLateral1" | "fuelleLateral2" | "refuerzo";

const CONFIG_MEDIDAS: Record<string, MedidaDef[]> = {
  "Bolsa plana":       [{ key:"altura",label:"Altura",position:"left"},{ key:"ancho",label:"Ancho",position:"top"}],
  "Bolsa troquelada":  [{ key:"altura",label:"Altura",position:"left"},{ key:"ancho",label:"Ancho",position:"top"},{ key:"fuelleFondo",label:"Fuelle fondo",position:"bottom"},{ key:"refuerzo",label:"Refuerzo",position:"right-top"},{ key:"fuelleLateral1",label:"Fuelle lateral",position:"right"},{ key:"fuelleLateral2",label:"Fuelle lateral",position:"left-bottom"}],
  "Bolsa celofán":     [{ key:"altura",label:"Altura",position:"left"},{ key:"ancho",label:"Ancho",position:"top"},{ key:"fuelleFondo",label:"Fuelle fondo",position:"bottom"},{ key:"refuerzo",label:"Refuerzo",position:"right-top"},{ key:"fuelleLateral1",label:"Fuelle lateral",position:"right"},{ key:"fuelleLateral2",label:"Fuelle lateral",position:"left-bottom"}],
  "Bolsa envíos":      [{ key:"altura",label:"Altura",position:"left"},{ key:"ancho",label:"Ancho",position:"top"},{ key:"refuerzo",label:"Refuerzo",position:"top-inside"},{ key:"fuelleFondo",label:"Fuelle fondo",position:"bottom"}],
  "Bolsa asa flexible":[{ key:"altura",label:"Altura",position:"left"},{ key:"ancho",label:"Ancho",position:"top"},{ key:"fuelleFondo",label:"Fuelle fondo",position:"bottom"},{ key:"fuelleLateral1",label:"Fuelle lateral",position:"right"},{ key:"fuelleLateral2",label:"Fuelle lateral",position:"left-bottom"}],
};
const MEDIDAS_VACIAS: Record<MedidaKey, string> = { altura:"",ancho:"",fuelleFondo:"",fuelleLateral1:"",fuelleLateral2:"",refuerzo:"" };

const LS: React.CSSProperties = { display:"block",fontSize:10,fontWeight:700,color:"#888",letterSpacing:1,textTransform:"uppercase",marginBottom:4 };
const IS: React.CSSProperties = { width:"100%",background:"#111",border:"1px solid #333",borderRadius:6,padding:"8px 10px",color:"#EEE",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif",marginBottom:2 };
const ROW2: React.CSSProperties = { display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 };
const ROW3: React.CSSProperties = { display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14 };

// Compara los tipos sin importar mayúsculas, espacios ni acentos.
// El material/tipo de papel no participa en este filtro.
const normalizarTexto = (valor: unknown): string =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-MX");

// ─── Helper parsear medida string → inputs ────────────────────────────────────
const parsearMedidaAInputs = (medida: string): Record<MedidaKey, string> => {
  if (!medida) return { ...MEDIDAS_VACIAS };

  const clean = medida.replace(/\s*cm\s*$/i, "").trim();
  const [verticalStr = "", horizontalStr = ""] = clean.split("x");
  const verticales = verticalStr.split("+").filter(Boolean);
  const horizontales = horizontalStr.split("+").filter(Boolean);

  return {
    altura: verticales[0] || "",
    fuelleFondo: verticales[1] || "",
    refuerzo: verticales[2] || "",
    ancho: horizontales[0] || "",
    fuelleLateral1: horizontales[1] || "",
    fuelleLateral2: horizontales[2] || horizontales[1] || "",
  };
};

// ─── Imagen: mismo patrón que Papel.tsx/Plastico.tsx ─────────────────────────
const subirImagenVinculada = async (
  file: File,
  categoria: "papel" | "plastico" | "carton" | undefined,
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
  const { data } = await api.post("/archivos/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.url as string;
};

// ─── DropdownDB ───────────────────────────────────────────────────────────────
function DropdownDB({ label, value, opciones, loading, disabled, onSelect, placeholder }: {
  label: string; value: string; opciones: { id: number; label: string }[];
  loading?: boolean; disabled?: boolean;
  onSelect: (id: number, label: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div ref={ref} style={{ position:"relative", marginBottom:14 }}>
      <label style={LS}>{label}</label>
      <div onClick={() => !disabled && !loading && setOpen(v=>!v)}
        style={{ ...IS, display:"flex", alignItems:"center", justifyContent:"space-between",
          cursor: disabled||loading ? "not-allowed" : "pointer",
          opacity: disabled ? .5 : 1, marginBottom:0,
          background: disabled ? "#0D0D0D" : "#111" }}>
        <span style={{ color: value ? "#EEE" : "#555" }}>
          {loading ? "Cargando..." : value || placeholder || "— Selecciona —"}
        </span>
        <span style={{ color:"#666", fontSize:10 }}>{loading ? "⏳" : "▾"}</span>
      </div>
      {open && !loading && (
        <div style={{ position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"#1A1A1A",border:"1px solid #444",borderRadius:8,zIndex:500,boxShadow:"0 8px 28px rgba(0,0,0,.8)",maxHeight:200,overflowY:"auto" }}>
          {opciones.length === 0
            ? <div style={{ padding:"10px",color:"#555",fontSize:11,textAlign:"center" }}>Sin opciones</div>
            : opciones.map(o => (
              <div key={o.id} onMouseDown={() => { onSelect(o.id, o.label); setOpen(false); }}
                style={{ padding:"8px 12px",cursor:"pointer",fontSize:12,color:value===o.label?"#C9922A":"#CCC",background:value===o.label?"#C9922A18":"transparent" }}>
                {o.label}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── Form vacío ───────────────────────────────────────────────────────────────
// NUEVO: tintasFrenteDefault arranca en 1 explícitamente. Sin esto, el
// <select> se ve en "1 tinta" (por el fallback `?? 1` del render) pero el
// estado real queda `undefined` hasta que el usuario lo toca a mano — y si
// no lo toca, el payload nunca manda el campo y el backend guarda null.
const formVacio = (): Partial<Producto> => ({
  nombre:"",categoria:"papel",medida:"",material:"",calibre:"",tintas:"1x0",
  laminacion:false,hs:false,ar:false,textura:false,uv:false,asa:false,otro:"",
  precio500:"",precio1000:"",precio3000:"",precioBase:"",imagen:"",
  tipo:"",ancho:"",fuelle:"",altura:"",tipoPapel:"",
  tipoProducto:"",fuelLateral:"",fuelFondo:"",troquel:false,perforado:false,
  tipoLaminado:"",tipoAsa:"",tipoTextura:"",tipoHs:"",
  pigmento:"",
  tamanoProd:"",
  idTamanoProducto: undefined,
  tintasFrenteDefault: 0,
  fuente:"expo",
});

interface Props {
  editando:    Producto | null;
  catInicial?: "papel" | "plastico" | "carton";
  saving:      boolean;
  onClose:     () => void;
  onGuardar:   (p: Producto, imagenPendiente: File | null) => Promise<void>;
  catalogs:    Catalogs;
  foils:       FoilOpcion[];
  texturas:    TexturaOpcion[];
  coloresAsa?: {id: number; nombre: string}[];
}

export default function ModalProducto({ editando, catInicial="papel", saving, onClose, onGuardar, catalogs, foils, texturas, coloresAsa=[] }: Props) {
  const [form, setForm] = useState<Partial<Producto>>(editando ? {
    ...editando,
    tipoLaminado: editando.tipoLaminado || "",
    tipoAsa:      editando.tipoAsa      || "",
    tipoTextura:  editando.tipoTextura  || "",
    tipoHs:       editando.tipoHs       || "",
    tipo:         editando.tipo         || "",
    tipoPapel:    editando.tipoPapel    || editando.material || "",
    pigmento:     editando.pigmento     || "",
    tamanoProd:    editando.tamanoProd   || "",
    // Papel/cartón permiten cero tintas. Plástico conserva una tinta como
    // valor inicial por compatibilidad con su flujo actual.
    tintasFrenteDefault: editando.tintasFrenteDefault
      ?? (editando.categoria === "plastico" ? 1 : 0),
  } : { ...formVacio(), categoria: catInicial });

  const [formCat, setFormCat] = useState<"papel"|"plastico"|"carton">(editando?.categoria ?? catInicial);

  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<File | null>(null);

  // Toggle de "¿tintas por dentro?" en el registro (solo papel/cartón)
  const [usaTintasDentroModal, setUsaTintasDentroModal] = useState(!!editando?.tintasDentroDefault);

  // Productos del catálogo del sistema usados únicamente como plantilla.
  // El producto nuevo sigue guardándose como producto Expo independiente.
  const [opcionesSistema, setOpcionesSistema] = useState<OpcionesRegistroExpoResponse>({
    papel: [],
    plastico: [],
    tamanos: [],
  });
  const [loadingOpcionesSistema, setLoadingOpcionesSistema] = useState(true);
  const [errorOpcionesSistema, setErrorOpcionesSistema] = useState("");
  const [productoPapelBaseId, setProductoPapelBaseId] = useState<number | null>(null);
  const [productoPlasticoBaseId, setProductoPlasticoBaseId] = useState<number | null>(null);

  // Pigmentos: reutiliza el mismo catálogo de insumos que usa el cotizador.
  // El input conserva texto libre, así que el usuario puede escribir uno nuevo
  // aunque no aparezca entre las sugerencias.
  const [pigmentosDB, setPigmentosDB] = useState<PigmentoOpcion[]>([]);
  const [loadingPigmentos, setLoadingPigmentos] = useState(false);
  const [errorPigmentos, setErrorPigmentos] = useState("");

  useEffect(() => {
    let activo = true;
    setLoadingOpcionesSistema(true);
    getOpcionesRegistroExpo()
      .then(data => {
        if (!activo) return;
        setOpcionesSistema(data);
        setErrorOpcionesSistema("");
      })
      .catch(error => {
        console.error("No se pudieron cargar las opciones del sistema para Expo:", error);
        if (activo) setErrorOpcionesSistema("No se pudo cargar el catálogo del sistema. Puedes continuar capturando manualmente.");
      })
      .finally(() => { if (activo) setLoadingOpcionesSistema(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;

    const cargarPigmentos = async () => {
      setLoadingPigmentos(true);
      setErrorPigmentos("");

      try {
        const tipos = await getTiposInsumo();
        const tipoPigmento = tipos.find(
          tipo => tipo.nombre.trim().toLocaleLowerCase("es-MX") === "pigmento"
        );

        if (!tipoPigmento) {
          if (activo) setPigmentosDB([]);
          return;
        }

        const items: Insumo[] = await buscarInsumos(tipoPigmento.idtipo_insumo, "");
        if (!activo) return;

        const unicos = new Map<string, PigmentoOpcion>();
        for (const item of items) {
          const nombre = item.nombre?.trim();
          if (!nombre) continue;

          const codigo =
            item.proveedores?.length === 1
              ? item.proveedores[0]?.codigo || null
              : null;

          const clave = nombre.toLocaleLowerCase("es-MX");
          if (!unicos.has(clave)) {
            unicos.set(clave, {
              id: item.idinsumo,
              nombre,
              codigo,
            });
          }
        }

        setPigmentosDB(
          Array.from(unicos.values()).sort((a, b) =>
            a.nombre.localeCompare(b.nombre, "es-MX")
          )
        );
      } catch (error) {
        console.error("No se pudieron cargar los pigmentos:", error);
        if (activo) {
          setPigmentosDB([]);
          setErrorPigmentos(
            "No se pudo cargar el catálogo de pigmentos. Puedes escribirlo manualmente."
          );
        }
      } finally {
        if (activo) setLoadingPigmentos(false);
      }
    };

    cargarPigmentos();
    return () => { activo = false; };
  }, []);

  // ─── Catálogos plástico desde DB ─────────────────────────────────────────
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);
  const [materiales,    setMateriales]    = useState<Material[]>([]);
  const [calibresDB,    setCalibresDB]    = useState<Calibre[]>([]);
  const [loadingCats,   setLoadingCats]   = useState(false);
  const [loadingCal,    setLoadingCal]    = useState(false);

  const [tipoPlastId,  setTipoPlastId]  = useState(0);
  const [tipoPlastNom, setTipoPlastNom] = useState(editando?.tipoProducto || "");
  const [materialId,   setMaterialId]   = useState(0);
  const [materialNom,  setMaterialNom]  = useState(editando?.material || "");
  const [calibreId,    setCalibreId]    = useState(0);
  const [calibreNom,   setCalibreNom]   = useState(editando?.calibre || "");

  const [medidas, setMedidas] = useState<Record<MedidaKey, string>>(
    editando?.medida && editando.categoria === "plastico"
      ? parsearMedidaAInputs(editando.medida)
      : { ...MEDIDAS_VACIAS }
  );

  const esCelofan = tipoPlastNom === "Bolsa celofán";
  const esBopp    = materialNom.toUpperCase() === "BOPP";

  useEffect(() => {
    if (formCat !== "plastico") return;
    setLoadingCats(true);
    api.get("/catalogos-productos/plastico")
      .then(r => {
        setTiposProducto(r.data.tiposProducto || []);
        setMateriales(r.data.materiales || []);
      })
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, [formCat]);

  const cargarCalibres = async (tipoCal: "bopp" | "normal", calibreARestaurar?: string) => {
    setLoadingCal(true);
    setCalibreId(0);
    setCalibreNom("");
    try {
      const r = await api.get(`/catalogos-productos/plastico/calibres?tipo=${tipoCal}`);
      setCalibresDB(r.data || []);
      if (calibreARestaurar) {
        const cal = (r.data as Calibre[]).find(c => String(c.valor) === calibreARestaurar);
        if (cal) { setCalibreId(cal.id); setCalibreNom(String(cal.valor)); }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCal(false);
    }
  };

  useEffect(() => {
    if (!editando || !tiposProducto.length || !materiales.length) return;
    const tipo = tiposProducto.find(t => t.nombre === editando.tipoProducto);
    const mat  = materiales.find(m => m.nombre === editando.material);
    if (tipo) { setTipoPlastId(tipo.id); setTipoPlastNom(tipo.nombre); }
    if (mat)  { setMaterialId(mat.id);   setMaterialNom(mat.nombre); }
    if (tipo && mat) {
      const tipoCal = (tipo.nombre === "Bolsa celofán" && mat.nombre.toUpperCase() === "BOPP") ? "bopp" : "normal";
      cargarCalibres(tipoCal, editando.calibre || undefined);
    }
  }, [tiposProducto, materiales]);

  useEffect(() => {
    if (formCat !== "plastico" || !tipoPlastNom || !materialNom) return;
    const tipoCal = (tipoPlastNom === "Bolsa celofán" && materialNom.toUpperCase() === "BOPP") ? "bopp" : "normal";
    cargarCalibres(tipoCal);
  }, [tipoPlastNom, materialNom, formCat]);

  const setF = (k: keyof Producto, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const soloNums = (v: string) => v.replace(/[^0-9.]/g,"").replace(/^(\d*\.?\d*).*$/,"$1");
  const esPapelCarton = form.categoria === "papel" || form.categoria === "carton";

  const productosPapelFiltrados = useMemo(() => {
    const tipoSeleccionado = normalizarTexto(form.tipo);

    if (!tipoSeleccionado) return [];

    return opcionesSistema.papel
      .filter((producto) =>
        normalizarTexto(producto.tipo_producto) === tipoSeleccionado
      )
      .sort((a, b) =>
        String(a.medida ?? "").localeCompare(
          String(b.medida ?? ""),
          "es-MX",
          { numeric: true, sensitivity: "base" }
        )
      );
  }, [opcionesSistema.papel, form.tipo]);

  const productoPapelBase = useMemo<ProductoSistemaPapelExpo | null>(
    () => opcionesSistema.papel.find(p => p.id === productoPapelBaseId) || null,
    [opcionesSistema.papel, productoPapelBaseId],
  );

  const calibresPapelBase = useMemo(
    () => calibresPapelCompatibles(productoPapelBase, form.tipoPapel || ""),
    [productoPapelBase, form.tipoPapel],
  );

  const productosPlasticoFiltrados = useMemo(
    () => productosPlasticoCompatibles(opcionesSistema.plastico, tipoPlastNom, materialNom),
    [opcionesSistema.plastico, tipoPlastNom, materialNom],
  );

  const limpiarPlantillaPapel = () => {
    setProductoPapelBaseId(null);
  };

  const aplicarProductoPapelBase = (producto: ProductoSistemaPapelExpo) => {
    setProductoPapelBaseId(producto.id);
    const calibres = calibresPapelCompatibles(producto, form.tipoPapel || "");
    const primerCalibre = calibres[0] || "";
    const grupoInicial = grupoPapelPorCalibre(
      producto,
      form.tipoPapel || "",
      primerCalibre,
    );

    setForm(prev => ({
      ...prev,
      medida: producto.medida || "",
      ancho: valorFormulario(producto.ancho),
      fuelle: valorFormulario(producto.fuelle),
      altura: valorFormulario(producto.altura),
      tamanoProd: producto.tamano_producto || producto.tamano_prod || "",
      idTamanoProducto: producto.id_tamano_producto ?? undefined,
      calibre: primerCalibre,
      precioBase: precioFormulario(grupoInicial?.precio_sugerido ?? null),
      costoLaminado: producto.costo_laminado != null
        ? Number(producto.costo_laminado)
        : 0,
      tintasFrenteDefault: producto.tintas_frente_default ?? 0,
      tintasDentroDefault: producto.tintas_dentro_default ?? undefined,
      laminacion: (producto.laminados || []).length > 0,
      tipoLaminado: producto.laminados?.[0]?.nombre || "",
      asa: (producto.asas || []).length > 0,
      tipoAsa: producto.asas?.[0]?.nombre || "",
      hs: producto.hs === true,
      tipoHs: producto.tipo_hs || "",
      textura: producto.textura === true,
      tipoTextura: producto.tipo_textura || "",
      ar: producto.ar === true,
      uv: producto.uv === true,
      imagen: prev.imagen || producto.imagen_url || "",
    }));
    setUsaTintasDentroModal(producto.tintas_dentro_default != null);
  };

  const aplicarProductoPlasticoBase = (producto: ProductoSistemaPlasticoExpo) => {
    setProductoPlasticoBaseId(producto.id);
    const calibre = producto.calibre || "";
    const calibreCatalogo = calibresDB.find(c => String(c.valor) === String(calibre));
    setCalibreNom(calibre);
    setCalibreId(calibreCatalogo?.id || 0);
    setMedidas({
      altura: valorFormulario(producto.altura),
      ancho: valorFormulario(producto.ancho),
      fuelleFondo: valorFormulario(producto.fuelle_fondo),
      fuelleLateral1: valorFormulario(producto.fuelle_lateral_izquierdo),
      fuelleLateral2: valorFormulario(producto.fuelle_lateral_derecho),
      refuerzo: valorFormulario(producto.refuerzo),
    });
    setForm(prev => ({
      ...prev,
      calibre,
      tamanoProd: "",
      pigmento: producto.pigmento || "",
      tintasFrenteDefault: producto.tintas_frente_default ?? 1,
      precio500: precioFormulario(producto.precio_500),
      precio1000: precioFormulario(producto.precio_1000),
      precio3000: precioFormulario(producto.precio_3000),
      imagen: prev.imagen || producto.imagen_url || "",
    }));
  };

  const setMedida = (key: MedidaKey, value: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(value)) return;
    setMedidas(prev => {
      const n = { ...prev, [key]: value };
      const v = value.trim();
      if (key==="fuelleLateral1"||key==="fuelleLateral2") {
        n.fuelleLateral1=v; n.fuelleLateral2=v;
        if (v&&Number(v)>0) { n.refuerzo=""; n.fuelleFondo=""; }
      }
      if (key==="refuerzo"||key==="fuelleFondo") {
        if (v&&Number(v)>0) { n.fuelleLateral1=""; n.fuelleLateral2=""; }
      }
      return n;
    });
  };

  const tieneLateral        = Number(medidas.fuelleLateral1)>0||Number(medidas.fuelleLateral2)>0;
  const tieneFondoORefuerzo = Number(medidas.fuelleFondo)>0||Number(medidas.refuerzo)>0;

  const construirMedida = () =>
    construirMedidaPlastico({
      altura: medidas.altura,
      ancho: medidas.ancho,
      fuelleFondo: medidas.fuelleFondo,
      fuelleLateral1: medidas.fuelleLateral1,
      fuelleLateral2: medidas.fuelleLateral2,
      refuerzo: medidas.refuerzo,
    });

  const guardar = async () => {
    if (!form.nombre?.trim()) return;

    try {
      if (esPapelCarton) {
        const medida = construirMedidaPapel(
          form.ancho,
          form.fuelle,
          form.altura
        );

        await onGuardar(
          {
            ...(form as Producto),
            id: editando?.id ?? 0,
            fuente: "expo",
            medida,
          },
          imagenPendiente
        );
      } else {
        const medida = construirMedida();
        await onGuardar({
          ...(form as Producto),
          id:           editando?.id ?? 0,
          fuente:       "expo",
          categoria:    "plastico",
          tipoProducto: tipoPlastNom,
          material:     materialNom,
          calibre:      calibreNom,
          medida,
          altura:       medidas.altura,
          ancho:        medidas.ancho,
          fuelFondo:    medidas.fuelleFondo,
          fuelLateral:  medidas.fuelleLateral1,
          pigmento:     form.pigmento || "",
          tamanoProd:    "",
        }, imagenPendiente);
      }
    } catch {
      // onGuardar ya mostró su propio alert con el error
    }
  };

  const cerrarSinGuardar = () => {
    onClose();
  };

  const handleSeleccionImagen = async (file: File) => {
    if (editando?.id) {
      setSubiendoFoto(true);
      try {
        const url = await subirImagenVinculada(file, form.categoria, editando.id);
        setF("imagen", url);
      } catch (e) {
        console.error("❌ No se pudo subir la imagen:", e);
        alert("No se pudo subir la imagen. Intenta de nuevo.");
      } finally {
        setSubiendoFoto(false);
      }
    } else {
      setImagenPendiente(file);
      setF("imagen", URL.createObjectURL(file));
    }
  };

  const opTipos = tiposProducto.map(t => ({ id:t.id, label:t.nombre }));
  const opMats  = materiales.map(m => ({ id:m.id, label:m.nombre }));
  const opCals  = calibresDB.map(c => ({ id:c.id, label:String(c.valor)+(c.gramos?` (${c.gramos}g)`:"") }));
  const configMedidas = CONFIG_MEDIDAS[tipoPlastNom] || null;

  const ocupado = saving || subiendoFoto;

 return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:"#1A1A1A",border:"1px solid #333",borderRadius:12,width:"90vw",maxWidth:"90vw",maxHeight:"92vh",overflowY:"auto",padding:24 }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,borderBottom:"2px solid #C9922A",paddingBottom:12 }}>
          <div>
            <div style={{ color:"#C9922A",fontSize:13,fontWeight:700,letterSpacing:1,textTransform:"uppercase" }}>{editando?"Editar producto":"Nuevo producto"}</div>
            <div style={{ color:"#666",fontSize:11,marginTop:2 }}>{editando?editando.nombre:"Completa los campos"}</div>
          </div>
          <button onClick={cerrarSinGuardar} style={{ background:"#2A2A2A",border:"none",color:"#AAA",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:18 }}>✕</button>
        </div>

        {/* Selector categoría */}
        {!editando && (
          <div style={{ marginBottom:18 }}>
            <label style={LS}>Categoría</label>
            <div style={{ display:"flex",gap:8,marginTop:6 }}>
              {CATS.map(c=>(
                <button key={c.key} onClick={()=>{
                  const categoria = c.key as typeof formCat;
                  setFormCat(categoria);
                  setForm(prev=>({
                    ...prev,
                    categoria,
                    tamanoProd: categoria === "plastico" ? "" : prev.tamanoProd,
                    idTamanoProducto: categoria === "plastico" ? undefined : prev.idTamanoProducto,
                    precioBase: categoria === "plastico" ? "" : prev.precioBase,
                    tintasFrenteDefault: categoria === "plastico"
                      ? (prev.tintasFrenteDefault ?? 1)
                      : (prev.tintasFrenteDefault ?? 0),
                  }));
                  setTipoPlastNom("");
                  setMaterialNom("");
                  setCalibreNom("");
                  setMedidas({...MEDIDAS_VACIAS});
                }}
                  style={{ flex:1,padding:"8px 4px",borderRadius:7,border:`1.5px solid ${formCat===c.key?c.color:"#333"}`,background:formCat===c.key?`${c.color}22`:"#111",color:formCat===c.key?c.color:"#666",cursor:"pointer",fontSize:11,fontWeight:700 }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nombre */}
        <div style={{ marginBottom:14 }}>
          <label style={LS}>Descripción *</label>
          <input style={IS} value={form.nombre||""} onChange={e=>setF("nombre",e.target.value)} placeholder="Ej. Bolsa Kraft Boutique" />
        </div>

        {errorOpcionesSistema && (
          <div style={{ marginBottom:14, padding:"8px 10px", border:"1px solid #7C5B24", borderRadius:6, background:"#2A210F", color:"#E0B96A", fontSize:11 }}>
            {errorOpcionesSistema}
          </div>
        )}

        {/* ── PAPEL / CARTÓN ── */}
        {esPapelCarton && (<>
          <div style={ROW3}>
            <div>
              <label style={LS}>Tipo</label>
              <select style={IS} value={form.tipo||""} onChange={e=>{ setF("tipo",e.target.value); limpiarPlantillaPapel(); }}>
                <option value="">— Selecciona —</option>
                {catalogs.tipo_producto.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Tipo de papel</label>
              <select
                style={IS}
                value={form.tipoPapel || ""}
                onChange={(event) => {
                  const tipoPapel = event.target.value;
                  setF("tipoPapel", tipoPapel);
                  setF("material", tipoPapel);

                  // Cambiar el material ya no elimina el producto/medida
                  // seleccionado, porque la lista se filtra únicamente por tipo.
                  if (productoPapelBase) {
                    const calibres = calibresPapelCompatibles(
                      productoPapelBase,
                      tipoPapel
                    );
                    const primerCalibre = calibres[0] || "";
                    const grupo = grupoPapelPorCalibre(
                      productoPapelBase,
                      tipoPapel,
                      primerCalibre
                    );

                    setF("calibre", primerCalibre);
                    setF(
                      "precioBase",
                      precioFormulario(grupo?.precio_sugerido ?? null)
                    );
                  }
                }}
              >
                <option value="">— Selecciona —</option>
                {catalogs.tipo_papel.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Producto / medida del sistema</label>
              <select
                style={{...IS, marginBottom:0}}
                value={productoPapelBaseId ?? ""}
                disabled={!form.tipo || loadingOpcionesSistema}
                onChange={e=>{
                  const id = Number(e.target.value);
                  if (!id) { limpiarPlantillaPapel(); return; }
                  const producto = opcionesSistema.papel.find(p=>p.id===id);
                  if (producto) aplicarProductoPapelBase(producto);
                }}
              >
                <option value="">
                  {loadingOpcionesSistema
                    ? "Cargando productos del sistema..."
                    : !form.tipo
                      ? "Primero selecciona un tipo"
                      : productosPapelFiltrados.length
                        ? `— Selecciona entre ${productosPapelFiltrados.length} productos —`
                        : "Sin productos registrados para ese tipo"}
                </option>
                {productosPapelFiltrados.map(producto=><option key={producto.id} value={producto.id}>
                  {producto.medida || "Sin medida"}{producto.descripcion ? ` · ${producto.descripcion}` : ""}
                </option>)}
              </select>
            </div>
          </div>
          <div style={ROW3}>
            <div><label style={LS}>Ancho (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.ancho||""} onChange={e=>{setF("ancho",soloNums(e.target.value));setF("medida","");}} placeholder="20" /></div>
            <div><label style={LS}>Fuelle (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.fuelle||""} onChange={e=>{setF("fuelle",soloNums(e.target.value));setF("medida","");}} placeholder="10" /></div>
            <div><label style={LS}>Altura (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.altura||""} onChange={e=>{setF("altura",soloNums(e.target.value));setF("medida","");}} placeholder="30" /></div>
          </div>
          {(form.ancho||form.altura)&&(
            <div style={{ background:"#111",border:"1px solid #333",borderRadius:6,padding:"6px 10px",marginBottom:14,fontSize:11,color:"#C9922A",fontWeight:600 }}>
              📐 Medida: {construirMedidaPapel(form.ancho, form.fuelle, form.altura) || "—"}
            </div>
          )}
          <div style={ROW3}>
            <div>
              <label style={LS}>Tamaño</label>
              <select
                style={IS}
                value={form.idTamanoProducto ?? ""}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : undefined;
                  const tamano = opcionesSistema.tamanos.find(item => item.id === id);
                  setF("idTamanoProducto", id);
                  setF("tamanoProd", tamano?.nombre || "");
                }}
              >
                <option value="">— Selecciona —</option>
                {opcionesSistema.tamanos.map(tamano => (
                  <option key={tamano.id} value={tamano.id}>{tamano.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LS}>Calibre</label>
              <select style={IS} value={form.calibre||""} onChange={e=>{
                const calibre=e.target.value;
                setF("calibre",calibre);
                const material=grupoPapelPorCalibre(productoPapelBase, form.tipoPapel||"", calibre);
                if (material?.precio_sugerido != null) {
                  setF("precioBase", precioFormulario(material.precio_sugerido));
                }
              }}>
                <option value="">— Selecciona —</option>
                {productoPapelBase
                  ? calibresPapelBase.map(calibre=><option key={calibre} value={calibre}>{calibre}</option>)
                  : catalogs.calibre.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Tintas (frente)</label>
              <select style={IS} value={form.tintasFrenteDefault ?? 0}
                onChange={e=>setF("tintasFrenteDefault", Number(e.target.value))}>
                {OPCIONES_CANTIDAD_TINTAS.map(n=><option key={n} value={n}>{n} tinta{n!==1?"s":""}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:14, maxWidth:"calc((100% - 24px) / 3)" }}>
            <label style={LS}>Asa</label>
            <select style={IS} value={form.tipoAsa||""} onChange={e=>{ setF("tipoAsa",e.target.value); setF("asa",e.target.value!==""); }}>
              <option value="">Sin asa</option>
              {(productoPapelBase
                ? productoPapelBase.asas
                : catalogs.tipo_asa
              ).map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
            </select>
          </div>

          {/* Toggle de tintas por dentro (solo cantidad — sin pantones) */}
          <div style={{ marginBottom:14 }}>
            <label style={{...LS, display:"flex", alignItems:"center", gap:6, cursor:"pointer"}}>
              <input type="checkbox" checked={usaTintasDentroModal}
                onChange={e=>{
                  const checked=e.target.checked;
                  setUsaTintasDentroModal(checked);
                  setForm(prev=>({ ...prev, tintasDentroDefault: checked ? (prev.tintasDentroDefault ?? 1) : undefined }));
                }}
                style={{accentColor:"#C9922A"}} />
              ¿Tintas por dentro?
            </label>
            {usaTintasDentroModal && (
              <select style={{...IS, maxWidth:220, marginTop:6}} value={form.tintasDentroDefault ?? 1}
                onChange={e=>setF("tintasDentroDefault", Number(e.target.value))}>
                {OPCIONES_CANTIDAD_TINTAS.map(n=><option key={n} value={n}>{n} tinta{n!==1?"s":""}</option>)}
              </select>
            )}
          </div>

          <div style={ROW3}>
            <div>
              <label style={LS}>Laminado</label>
              <select style={IS} value={form.laminacion?(form.tipoLaminado||""):""} onChange={e=>{ setF("laminacion",e.target.value!==""); setF("tipoLaminado",e.target.value); }}>
                <option value="">Sin laminado</option>
                {(productoPapelBase
                  ? productoPapelBase.laminados
                  : catalogs.laminado
                ).map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Textura</label>
              <select style={IS} value={form.textura?(form.tipoTextura||""):""} onChange={e=>{ setF("textura",e.target.value!==""); setF("tipoTextura",e.target.value); }}>
                <option value="">Sin textura</option>
                {texturas.map(o=><option key={o.idcat_textura} value={o.nombre}>{o.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Hot Stamping (Foil)</label>
              <select style={IS} value={form.hs?(form.tipoHs||""):""} onChange={e=>{ setF("hs",e.target.value!==""); setF("tipoHs",e.target.value); }}>
                <option value="">Sin foil</option>
                {foils.map(o=>{ const label=`${o.colorfoil}${o.codigofoil?" "+o.codigofoil:""}`; return <option key={o.idfoil} value={label}>{label}</option>; })}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={LS}>Otros acabados</label>
            <div style={{ display:"flex",gap:16,marginTop:8 }}>
              {([["ar","AR"],["uv","UV"]] as const).map(([k,l])=>(
                <label key={k} style={{ display:"flex",alignItems:"center",gap:6,color:"#CCC",fontSize:12,cursor:"pointer" }}>
                  <input type="checkbox" checked={!!form[k]} onChange={e=>setF(k,e.target.checked)} style={{ accentColor:"#C9922A",width:15,height:15 }} />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </div>
        </>)}

        {/* ── PLÁSTICO ── */}
        {formCat === "plastico" && (<>
          {loadingCats && <div style={{ color:"#666",fontSize:12,marginBottom:14,textAlign:"center" }}>Cargando catálogos...</div>}

          <DropdownDB label="Tipo de producto" value={tipoPlastNom} opciones={opTipos} loading={loadingCats}
            onSelect={(id,label)=>{
              setTipoPlastId(id); setTipoPlastNom(label); setProductoPlasticoBaseId(null);
              setF("tipoProducto",label);
              setMedidas({...MEDIDAS_VACIAS});
              if (label==="Bolsa celofán") {
                const bopp = materiales.find(m=>m.nombre.toUpperCase()==="BOPP");
                if (bopp) { setMaterialId(bopp.id); setMaterialNom(bopp.nombre); setF("material",bopp.nombre); }
              } else if (esBopp) {
                setMaterialId(0); setMaterialNom(""); setF("material","");
              }
            }}
          />

          <DropdownDB label="Material" value={materialNom}
            opciones={opMats} loading={loadingCats}
            disabled={esCelofan}
            onSelect={(id,label)=>{ setMaterialId(id); setMaterialNom(label); setF("material",label); setProductoPlasticoBaseId(null); }}
          />

          <div style={{ marginBottom:14 }}>
            <label style={LS}>Producto / medida del sistema</label>
            <select
              style={IS}
              value={productoPlasticoBaseId ?? ""}
              disabled={!tipoPlastNom || !materialNom || loadingOpcionesSistema}
              onChange={e=>{
                const id=Number(e.target.value);
                if(!id){ setProductoPlasticoBaseId(null); return; }
                const producto=opcionesSistema.plastico.find(p=>p.id===id);
                if(producto) aplicarProductoPlasticoBase(producto);
              }}
            >
              <option value="">
                {loadingOpcionesSistema
                  ? "Cargando productos del sistema..."
                  : !tipoPlastNom || !materialNom
                    ? "Primero elige tipo y material"
                    : productosPlasticoFiltrados.length
                      ? "— Selecciona para autocompletar —"
                      : "Sin coincidencias · captura manual"}
              </option>
              {productosPlasticoFiltrados.map(producto=><option key={producto.id} value={producto.id}>
                {producto.medida || "Sin medida"}{producto.calibre ? ` · calibre ${producto.calibre}` : ""}
              </option>)}
            </select>
          </div>

          <DropdownDB label="Calibre" value={calibreNom}
            opciones={opCals} loading={loadingCal}
            disabled={!tipoPlastNom||!materialNom}
            placeholder={!tipoPlastNom||!materialNom?"Primero elige tipo y material":"— Selecciona —"}
            onSelect={(id,label)=>{ setCalibreId(id); setCalibreNom(label.split(" (")[0]); setF("calibre",label.split(" (")[0]); }}
          />

          {/* Inputs de medidas según tipo */}
          {configMedidas ? (
            <div style={{ marginBottom:14 }}>
              <label style={LS}>Medidas (cm)</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:6 }}>
                {configMedidas.map(m => {
                  const esLateral  = m.key==="fuelleLateral1"||m.key==="fuelleLateral2";
                  const esFondoRef = m.key==="fuelleFondo"||m.key==="refuerzo";
                  const bloqueado  = (esLateral&&tieneFondoORefuerzo)||(esFondoRef&&tieneLateral);
                  return (
                    <div key={m.key}>
                      <label style={{ ...LS, color: bloqueado?"#444":"#888" }}>
                        {m.label}{esLateral&&!bloqueado&&<span style={{ color:"#C9922A",marginLeft:3 }}>⇄</span>}
                      </label>
                      <input type="text" inputMode="decimal"
                        value={medidas[m.key]} disabled={bloqueado}
                        onChange={e=>{ setProductoPlasticoBaseId(null); setMedida(m.key,e.target.value); }}
                        placeholder="0"
                        style={{ ...IS, opacity:bloqueado?.4:1, cursor:bloqueado?"not-allowed":"text", marginBottom:0 }}
                      />
                    </div>
                  );
                })}
              </div>
              {construirMedida() && (
                <div style={{ background:"#111",border:"1px solid #333",borderRadius:6,padding:"6px 10px",marginTop:8,fontSize:11,color:"#C9922A",fontWeight:600 }}>
                  📐 {construirMedida()} cm
                </div>
              )}
            </div>
          ) : tipoPlastNom ? null : (
            <div style={{ color:"#555",fontSize:11,marginBottom:14,fontStyle:"italic" }}>← Selecciona un tipo de producto para ver los campos de medida</div>
          )}

          <div style={ROW2}>
            <div>
              <label style={LS}>Tintas</label>
              <select style={IS} value={form.tintasFrenteDefault ?? 1}
                onChange={e=>setF("tintasFrenteDefault", Number(e.target.value))}>
                {OPCIONES_CANTIDAD_TINTAS.map(n=><option key={n} value={n}>{n} tinta{n!==1?"s":""}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Pigmento</label>
              <input
                list="pigmentos-expo-opciones"
                style={IS}
                value={form.pigmento||""}
                onChange={e=>setF("pigmento",e.target.value)}
                placeholder={loadingPigmentos ? "Cargando pigmentos..." : "Selecciona o escribe un pigmento"}
                autoComplete="off"
              />
              <datalist id="pigmentos-expo-opciones">
                {pigmentosDB.map(pigmento => (
                  <option
                    key={pigmento.id}
                    value={pigmento.nombre}
                    label={pigmento.codigo ? `${pigmento.nombre} · ${pigmento.codigo}` : pigmento.nombre}
                  />
                ))}
              </datalist>
              <div style={{ color:errorPigmentos?"#E0B96A":"#666", fontSize:10, marginTop:4 }}>
                {errorPigmentos ||
                  (pigmentosDB.length
                    ? "Elige una sugerencia o escribe un pigmento diferente."
                    : "Puedes escribir el pigmento libremente.")}
              </div>
            </div>
          </div>
        </>)}

        {/* ── PRECIOS ── */}
        <div style={{ borderTop:"1px solid #2A2A2A",paddingTop:14,marginBottom:14 }}>
          {esPapelCarton ? (
            <>
              <label style={LS}>Precio base unitario</label>
              <div style={{ maxWidth: 260 }}>
                <input
                  style={IS}
                  type="text"
                  inputMode="decimal"
                  value={form.precioBase || ""}
                  onChange={e => {
                    const limpio = e.target.value.replace(/[^0-9.]/g, "");
                    const partes = limpio.split(".");
                    const normalizado = partes.length > 2
                      ? `${partes.shift()}.${partes.join("")}`
                      : limpio;
                    setF("precioBase", normalizado);
                  }}
                  placeholder="$0.00"
                />
              </div>
              <div style={{ color:"#666",fontSize:10,marginTop:4 }}>
                Se guarda en el grupo de papel y será la base del cálculo por cantidad y acabados.
              </div>
            </>
          ) : (
            <>
              <label style={LS}>Precio unitario Expo</label>
              <div style={{ maxWidth: 420 }}>
                <label style={{ ...LS,color:"#C9922A" }}>
                  Precio por pieza
                </label>
                <input
                  style={IS}
                  value={form.precio500 || ""}
                  onChange={e => setF("precio500", e.target.value)}
                  placeholder="$0.00"
                  inputMode="decimal"
                />
              </div>
              <div style={{ color:"#666",fontSize:10,marginTop:4 }}>
                Este precio se guarda internamente en el campo de 500 piezas,
                pero para plástico Expo se utilizará como precio unitario e
                incluye tintas y pigmento.
              </div>
            </>
          )}
        </div>

        {/* ── IMAGEN ── */}
        <div style={{ marginBottom:20 }}>
          <label style={LS}>Imagen del producto</label>

          {form.imagen && (
            <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
              <img src={form.imagen} alt="preview" style={{ width:90,height:90,objectFit:"cover",borderRadius:6,border:"1px solid #333" }} />
            </div>
          )}

          {!editando && imagenPendiente && (
            <div style={{ background:"#3A2A0D", border:"1px solid #C9922A55", borderRadius:6, padding:"6px 10px", marginBottom:10, fontSize:10.5, color:"#E0B96A", textAlign:"center" }}>
              ⏳ Esta foto se subirá al guardar el producto.
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <label style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,border:"1.5px dashed #444",borderRadius:8,padding:"14px 8px",cursor: subiendoFoto ? "not-allowed" : "pointer",background:"#111",opacity: subiendoFoto?.5:1 }}
              onMouseEnter={e=>{ if(!subiendoFoto) e.currentTarget.style.borderColor="#C9922A"; }}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="#444")}>
              <span style={{ fontSize:22 }}>🖼️</span>
              <span style={{ color:"#888",fontSize:10.5,textAlign:"center" }}>
                {form.imagen ? "Cambiar imagen" : "Subir imagen"}
              </span>
              <input type="file" accept="image/*" disabled={subiendoFoto} style={{ display:"none" }} onChange={e=>{
                const file=e.target.files?.[0]; if(!file) return;
                handleSeleccionImagen(file);
              }} />
            </label>

            <label style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,border:"1.5px dashed #444",borderRadius:8,padding:"14px 8px",cursor: subiendoFoto ? "not-allowed" : "pointer",background:"#111",opacity: subiendoFoto?.5:1 }}
              onMouseEnter={e=>{ if(!subiendoFoto) e.currentTarget.style.borderColor="#C9922A"; }}
              onMouseLeave={e=>(e.currentTarget.style.borderColor="#444")}>
              <span style={{ fontSize:22 }}>📷</span>
              <span style={{ color:"#888",fontSize:10.5,textAlign:"center" }}>
                Tomar foto
              </span>
              <input type="file" accept="image/*" capture="environment" disabled={subiendoFoto} style={{ display:"none" }} onChange={e=>{
                const file=e.target.files?.[0]; if(!file) return;
                handleSeleccionImagen(file);
              }} />
            </label>
          </div>

          {subiendoFoto && (
            <div style={{ marginTop:8, textAlign:"center" }}>
              <span style={{ color:"#C9922A",fontSize:10 }}>⏳ Subiendo imagen...</span>
            </div>
          )}

          {form.imagen && !subiendoFoto && (
            <div style={{ textAlign:"center", marginTop:6 }}>
              <button onClick={()=>{ setF("imagen",""); setImagenPendiente(null); }} style={{ background:"transparent",border:"none",color:"#666",fontSize:11,cursor:"pointer",textDecoration:"underline" }}>✕ Quitar imagen</button>
            </div>
          )}
        </div>

       {/* Acciones */}
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <button onClick={cerrarSinGuardar} style={{ background:"transparent",border:"1px solid #444",color:"#888",fontSize:12,fontWeight:600,padding:"9px 18px",borderRadius:7,cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={!form.nombre?.trim()||ocupado}
            style={{ background:form.nombre?.trim()&&!ocupado?"#C9922A":"#4A3A1A",border:"none",color:form.nombre?.trim()&&!ocupado?"#1A1A1A":"#666",fontSize:12,fontWeight:700,padding:"9px 24px",borderRadius:7,cursor:form.nombre?.trim()&&!ocupado?"pointer":"not-allowed" }}>
            {subiendoFoto?"Subiendo imagen...":saving?"Guardando...":editando?"Guardar cambios":"Agregar al catálogo"}
          </button>
        </div>
      </div>
    </div>
  );
}