import { useState, useRef, useEffect } from "react";
import { CATS, OPCIONES_TINTAS } from "../../types/expo/expo.types";
import type { Producto } from "../../types/expo/expo.types";
import type { Catalogs } from "../../types/papel/papel.types";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";
import api from "../../services/api";
import { subirArchivo } from "../../services/archivos.service";

// ─── Tipos catálogos plástico ─────────────────────────────────────────────────
interface TipoProducto { id: number; nombre: string; }
interface Material     { id: number; nombre: string; }
interface Calibre      { id: number; valor: string | number; gramos?: number | null; }

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

// ─── Opciones locales papel / cartón ─────────────────────────────────────────
const TINTAS_DEFAULT = ["1x0","1x1","2x0","2x1","2x2","3x0","4x0","4x4"];
const MEDIDAS_PAPEL: Record<string, string[]> = {
  "Bolsas":    ["15x8x20 cm","20x10x30 cm","25x12x35 cm","30x15x40 cm","35x18x45 cm","10x5x15 cm","40x20x50 cm","12x6x25 cm"],
  "Cajas":     ["10x10x5 cm","15x10x8 cm","20x15x8 cm","22x15x5 cm","25x20x10 cm","30x20x12 cm","30x30x5 cm","40x30x15 cm"],
  "Sobres":    ["10x7 cm","11x22 cm","15x10 cm","20x15 cm","23x11 cm","25x18 cm","30x22 cm","32x24 cm"],
  "Etiquetas": ["Ø3 cm","Ø5 cm","Ø8 cm","5x3 cm","7x4 cm","10x5 cm","10x7 cm","12x8 cm"],
  "default":   ["10x7 cm","15x10x5 cm","20x10x30 cm","22x15x8 cm","25x12x35 cm","30x20x10 cm","35x25x12 cm","40x30x15 cm"],
};
const MEDIDAS_CARTON = ["15x10x6 cm","20x15x8 cm","25x20x10 cm","30x20x12 cm","30x20x60 cm","35x25x15 cm","40x30x15 cm","40x30x25 cm"];

const LS: React.CSSProperties = { display:"block",fontSize:10,fontWeight:700,color:"#888",letterSpacing:1,textTransform:"uppercase",marginBottom:4 };
const IS: React.CSSProperties = { width:"100%",background:"#111",border:"1px solid #333",borderRadius:6,padding:"8px 10px",color:"#EEE",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif",marginBottom:2 };
const ROW2: React.CSSProperties = { display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 };
const ROW3: React.CSSProperties = { display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14 };

// ─── Helper parsear medida string → inputs ────────────────────────────────────
const parsearMedidaAInputs = (medida: string): Record<MedidaKey, string> => {
  if (!medida) return { ...MEDIDAS_VACIAS };
  const clean = medida.replace(/\s*cm\s*$/i, "").trim();
  const [vertStr, horizStr] = clean.split("x");
  const verts = (vertStr || "").split("+").filter(Boolean);
  const horiz = horizStr || "";
  return {
    altura:         verts[0] || "",
    fuelleLateral1: verts[1] || "",
    fuelleLateral2: verts[1] || "",
    fuelleFondo:    verts[2] || "",
    refuerzo:       verts[3] || "",
    ancho:          horiz,
  };
};

// ─── TintasSelectModal ────────────────────────────────────────────────────────
function TintasSelectModal({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busq, setBusq] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const lista = busq.trim() ? OPCIONES_TINTAS.filter(o => o.includes(busq.trim())) : TINTAS_DEFAULT;
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !document.getElementById("tintas-drop-modal")?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  return (
    <div style={{ position:"relative" }}>
      <div ref={triggerRef} onClick={() => { setOpen(v=>!v); setTimeout(()=>inputRef.current?.focus(),30); }}
        style={{ ...IS,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:0 }}>
        <span style={{ color:value?"#EEE":"#555" }}>{value||"— Selecciona —"}</span>
        <span style={{ color:"#666",fontSize:10 }}>▾</span>
      </div>
      {open && (
        <div id="tintas-drop-modal" style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#1A1A1A",border:"1px solid #444",borderRadius:8,zIndex:500,boxShadow:"0 8px 28px rgba(0,0,0,.8)",overflow:"hidden" }}>
          <div style={{ padding:"6px 8px 4px",borderBottom:"1px solid #2A2A2A" }}>
            <input ref={inputRef} value={busq} onChange={e=>setBusq(e.target.value)} placeholder="ej: 3x0"
              style={{ width:"100%",background:"#111",border:"1px solid #333",borderRadius:4,padding:"5px 8px",color:"#EEE",fontSize:11,outline:"none",fontFamily:"'Inter',sans-serif" }} />
          </div>
          <div style={{ maxHeight:180,overflowY:"auto" }}>
            {lista.length===0 ? <div style={{ padding:"10px",color:"#555",fontSize:11,textAlign:"center" }}>Sin resultados</div>
              : lista.map(o=>(
                <div key={o} onMouseDown={()=>{ onChange(o); setOpen(false); setBusq(""); }}
                  style={{ padding:"7px 12px",cursor:"pointer",fontSize:12,color:value===o?"#C9922A":"#CCC",background:value===o?"#C9922A18":"transparent" }}>
                  {o}
                </div>
              ))}
            {!busq && <div style={{ padding:"4px 12px 8px",color:"#444",fontSize:9 }}>Escribe para buscar más opciones</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MedidaSelectModal ────────────────────────────────────────────────────────
function MedidaSelectModal({ opciones, value, onChange }: { opciones: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !document.getElementById("medida-drop-modal")?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);
  const seleccionar = (v: string) => { onChange(v); setOpen(false); setCustom(""); };
  return (
    <div style={{ position:"relative" }}>
      <div ref={triggerRef} onClick={()=>setOpen(v=>!v)}
        style={{ ...IS,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",marginBottom:0 }}>
        <span style={{ color:value?"#EEE":"#555" }}>{value||"— Selecciona o escribe —"}</span>
        <span style={{ color:"#666",fontSize:10 }}>▾</span>
      </div>
      {open && (
        <div id="medida-drop-modal" style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#1A1A1A",border:"1px solid #444",borderRadius:8,zIndex:500,boxShadow:"0 8px 28px rgba(0,0,0,.8)",overflow:"hidden" }}>
          <div style={{ maxHeight:220,overflowY:"auto" }}>
            {opciones.map(o=>(
              <div key={o} onMouseDown={()=>seleccionar(o)}
                style={{ padding:"8px 12px",cursor:"pointer",fontSize:12,color:value===o?"#C9922A":"#CCC",background:value===o?"#C9922A18":"transparent" }}>
                {o}
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid #2A2A2A",padding:"6px 8px" }}>
            <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Otra medida personalizada..."
              onMouseDown={e=>e.stopPropagation()}
              onKeyDown={e=>{ if(e.key==="Enter"&&custom.trim()) seleccionar(custom.trim()); }}
              style={{ width:"100%",background:"#111",border:"1px solid #333",borderRadius:4,padding:"5px 8px",color:"#EEE",fontSize:11,outline:"none",fontFamily:"'Inter',sans-serif" }} />
            {custom.trim() && (
              <button onMouseDown={()=>seleccionar(custom.trim())}
                style={{ marginTop:4,width:"100%",background:"#C9922A",border:"none",borderRadius:4,padding:"5px",color:"#1A1A1A",fontSize:11,fontWeight:700,cursor:"pointer" }}>
                ✓ Usar "{custom.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
const formVacio = (): Partial<Producto> => ({
  nombre:"",categoria:"papel",medida:"",material:"",calibre:"",tintas:"1x0",
  laminacion:false,hs:false,ar:false,textura:false,uv:false,asa:false,otro:"",
  precio500:"",precio1000:"",precio3000:"",imagen:"",
  tipo:"",ancho:"",fuelle:"",altura:"",tipoPapel:"",
  tipoProducto:"",fuelLateral:"",fuelFondo:"",troquel:false,perforado:false,
  tipoLaminado:"",tipoAsa:"",tipoTextura:"",tipoHs:"",
  fuente:"expo",
});

interface Props {
  editando:    Producto | null;
  catInicial?: "papel" | "plastico" | "carton";
  saving:      boolean;
  onClose:     () => void;
  onGuardar:   (p: Producto) => void;
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
  } : { ...formVacio(), categoria: catInicial });

  const [formCat, setFormCat] = useState<"papel"|"plastico"|"carton">(editando?.categoria ?? catInicial);

  // ─── Foto: archivo pendiente de subir a S3 ────────────────────────────────
  // form.imagen guarda solo el PREVIEW (base64) mientras hay archivo pendiente;
  // al guardar, se sube a S3 y se sustituye por la URL permanente /archivos/:id/ver
  const [archivoFoto,  setArchivoFoto]  = useState<File | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // ─── Catálogos plástico desde DB ─────────────────────────────────────────
  const [tiposProducto, setTiposProducto] = useState<TipoProducto[]>([]);
  const [materiales,    setMateriales]    = useState<Material[]>([]);
  const [calibresDB,    setCalibresDB]    = useState<Calibre[]>([]);
  const [loadingCats,   setLoadingCats]   = useState(false);
  const [loadingCal,    setLoadingCal]    = useState(false);

  // Estado seleccionado plástico
  const [tipoPlastId,  setTipoPlastId]  = useState(0);
  const [tipoPlastNom, setTipoPlastNom] = useState(editando?.tipoProducto || "");
  const [materialId,   setMaterialId]   = useState(0);
  const [materialNom,  setMaterialNom]  = useState(editando?.material || "");
  const [calibreId,    setCalibreId]    = useState(0);
  const [calibreNom,   setCalibreNom]   = useState(editando?.calibre || "");

  // Medidas — parsear desde medida string al editar
  const [medidas, setMedidas] = useState<Record<MedidaKey, string>>(
    editando?.medida && editando.categoria === "plastico"
      ? parsearMedidaAInputs(editando.medida)
      : { ...MEDIDAS_VACIAS }
  );

  const esCelofan = tipoPlastNom === "Bolsa celofán";
  const esBopp    = materialNom.toUpperCase() === "BOPP";

  // ─── Cargar catálogos plástico ────────────────────────────────────────────
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

  // ─── Cargar calibres ──────────────────────────────────────────────────────
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

  // ─── Resolver IDs al editar + cargar calibres ─────────────────────────────
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

  // ─── Recargar calibres cuando cambia tipo/material (usuario selecciona) ───
  useEffect(() => {
    if (formCat !== "plastico" || !tipoPlastNom || !materialNom) return;
    const tipoCal = (tipoPlastNom === "Bolsa celofán" && materialNom.toUpperCase() === "BOPP") ? "bopp" : "normal";
    cargarCalibres(tipoCal);
  }, [tipoPlastNom, materialNom, formCat]);

  const setF = (k: keyof Producto, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
  const soloNums = (v: string) => v.replace(/[^0-9.]/g,"").replace(/^(\d*\.?\d*).*$/,"$1");
  const esPapelCarton = form.categoria === "papel" || form.categoria === "carton";

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

  const construirMedida = () => {
    const v: string[] = [];
    if (medidas.altura)         v.push(medidas.altura);
    if (medidas.fuelleLateral1) v.push(medidas.fuelleLateral1);
    if (medidas.fuelleFondo)    v.push(medidas.fuelleFondo);
    if (medidas.refuerzo)       v.push(medidas.refuerzo);
    const h = [medidas.ancho].filter(Boolean);
    if (!v.length&&!h.length) return "";
    if (!h.length) return v.join("+");
    if (!v.length) return h.join("+");
    return `${v.join("+")}x${h.join("+")}`;
  };

  // ─── Subir foto pendiente a S3 y regresar la URL final ────────────────────
  // Regresa la URL permanente /archivos/:id/ver (redirige a presigned fresca),
  // o la imagen actual del form si no hay archivo nuevo (URL previa o base64 legacy).
const resolverImagen = async (): Promise<string | null> => {
    if (!archivoFoto) return form.imagen || "";
    setSubiendoFoto(true);
    try {
      const subcarpetaCatalogo = form.categoria === "plastico" ? "plastico"
                                : form.categoria === "carton"   ? "carton"
                                : "papel";
      const archivo = await subirArchivo(archivoFoto, "catalogoproductos", subcarpetaCatalogo);
      const base = (api.defaults.baseURL || "").replace(/\/$/, "");
      return `${base}/archivos/${archivo.id_archivo}/ver`;
    } catch (e) {
      console.error("❌ No se pudo subir la imagen a S3:", e);
      alert("No se pudo subir la imagen. Intenta de nuevo.");
      return null;
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardar = async () => {
    if (!form.nombre?.trim()) return;

    const imagenFinal = await resolverImagen();
    if (imagenFinal === null) return; // falló la subida — no guardar el producto

    if (esPapelCarton) {
      let medida = form.medida || "";
      if (form.ancho && form.altura)
        medida = `${form.ancho}x${form.fuelle||"0"}x${form.altura} cm`;
      onGuardar({ ...(form as Producto), id: editando?.id??0, fuente:"expo", medida, imagen: imagenFinal });
    } else {
      const medida = construirMedida();
      onGuardar({
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
        imagen:       imagenFinal,
      });
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
          <button onClick={onClose} style={{ background:"#2A2A2A",border:"none",color:"#AAA",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:18 }}>✕</button>
        </div>

        {/* Selector categoría */}
        {!editando && (
          <div style={{ marginBottom:18 }}>
            <label style={LS}>Categoría</label>
            <div style={{ display:"flex",gap:8,marginTop:6 }}>
              {CATS.map(c=>(
                <button key={c.key} onClick={()=>{ setFormCat(c.key as typeof formCat); setF("categoria",c.key); setTipoPlastNom(""); setMaterialNom(""); setCalibreNom(""); setMedidas({...MEDIDAS_VACIAS}); }}
                  style={{ flex:1,padding:"8px 4px",borderRadius:7,border:`1.5px solid ${formCat===c.key?c.color:"#333"}`,background:formCat===c.key?`${c.color}22`:"#111",color:formCat===c.key?c.color:"#666",cursor:"pointer",fontSize:11,fontWeight:700 }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nombre */}
        <div style={{ marginBottom:14 }}>
          <label style={LS}>Nombre del producto *</label>
          <input style={IS} value={form.nombre||""} onChange={e=>setF("nombre",e.target.value)} placeholder="Ej. Bolsa Kraft Boutique" />
        </div>

        {/* ── PAPEL / CARTÓN ── */}
        {esPapelCarton && (<>
          <div style={ROW3}>
            <div>
              <label style={LS}>Tipo</label>
              <select style={IS} value={form.tipo||""} onChange={e=>setF("tipo",e.target.value)}>
                <option value="">— Selecciona —</option>
                {catalogs.tipo_producto.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Tipo de papel</label>
              <select style={IS} value={form.tipoPapel||""} onChange={e=>{ setF("tipoPapel",e.target.value); setF("material",e.target.value); }}>
                <option value="">— Selecciona —</option>
                {catalogs.tipo_papel.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Medida</label>
              <MedidaSelectModal
                opciones={form.categoria==="carton"?MEDIDAS_CARTON:(MEDIDAS_PAPEL[form.tipo||"default"]||MEDIDAS_PAPEL["default"])}
                value={form.medida||""}
                onChange={v=>{
                  setF("medida",v);
                  const m3=v.match(/^([\d.]+)x([\d.]+)x([\d.]+)/);
                  const m2=v.match(/^([\d.]+)x([\d.]+)/);
                  if(m3){setF("ancho",m3[1]);setF("fuelle",m3[2]);setF("altura",m3[3]);}
                  else if(m2){setF("ancho",m2[1]);setF("altura",m2[2]);setF("fuelle","0");}
                }}
              />
            </div>
          </div>
          <div style={ROW3}>
            <div><label style={LS}>Ancho (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.ancho||""} onChange={e=>{setF("ancho",soloNums(e.target.value));setF("medida","");}} placeholder="20" /></div>
            <div><label style={LS}>Fuelle (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.fuelle||""} onChange={e=>{setF("fuelle",soloNums(e.target.value));setF("medida","");}} placeholder="10" /></div>
            <div><label style={LS}>Altura (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.altura||""} onChange={e=>{setF("altura",soloNums(e.target.value));setF("medida","");}} placeholder="30" /></div>
          </div>
          {(form.ancho||form.altura)&&(
            <div style={{ background:"#111",border:"1px solid #333",borderRadius:6,padding:"6px 10px",marginBottom:14,fontSize:11,color:"#C9922A",fontWeight:600 }}>
              📐 Medida: {form.ancho||"?"}x{form.fuelle||"0"}x{form.altura||"?"} cm
            </div>
          )}
          <div style={ROW3}>
            <div>
              <label style={LS}>Calibre</label>
              <select style={IS} value={form.calibre||""} onChange={e=>setF("calibre",e.target.value)}>
                <option value="">— Selecciona —</option>
                {catalogs.calibre.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={LS}>Tintas</label>
              <TintasSelectModal value={form.tintas||""} onChange={v=>setF("tintas",v)} />
            </div>
            <div>
              <label style={LS}>Asa</label>
              <select style={IS} value={form.tipoAsa||""} onChange={e=>{ setF("tipoAsa",e.target.value); setF("asa",e.target.value!==""); }}>
                <option value="">Sin asa</option>
                {(form.categoria==="plastico" ? coloresAsa : catalogs.tipo_asa).map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={ROW3}>
            <div>
              <label style={LS}>Laminado</label>
              <select style={IS} value={form.laminacion?(form.tipoLaminado||""):""} onChange={e=>{ setF("laminacion",e.target.value!==""); setF("tipoLaminado",e.target.value); }}>
                <option value="">Sin laminado</option>
                {catalogs.laminado.map(item=><option key={item.id} value={item.nombre}>{item.nombre}</option>)}
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
              setTipoPlastId(id); setTipoPlastNom(label);
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
            onSelect={(id,label)=>{ setMaterialId(id); setMaterialNom(label); setF("material",label); }}
          />

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
                        onChange={e=>setMedida(m.key,e.target.value)}
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
              <TintasSelectModal value={form.tintas||""} onChange={v=>setF("tintas",v)} />
            </div>
          </div>
        </>)}

        {/* ── PRECIOS ── */}
        <div style={{ borderTop:"1px solid #2A2A2A",paddingTop:14,marginBottom:14 }}>
          <label style={LS}>Precios unitarios (expo)</label>
          <div style={ROW3}>
            <div><label style={{ ...LS,color:"#C9922A" }}>500 pzs</label><input style={IS} value={form.precio500||""} onChange={e=>setF("precio500",e.target.value)} placeholder="$0.00" /></div>
            <div><label style={{ ...LS,color:"#C9922A" }}>1,000 pzs</label><input style={IS} value={form.precio1000||""} onChange={e=>setF("precio1000",e.target.value)} placeholder="$0.00" /></div>
            <div><label style={{ ...LS,color:"#C9922A" }}>3,000 pzs</label><input style={IS} value={form.precio3000||""} onChange={e=>setF("precio3000",e.target.value)} placeholder="$0.00" /></div>
          </div>
        </div>

        {/* ── IMAGEN ── */}
        <div style={{ marginBottom:20 }}>
          <label style={LS}>Imagen del producto</label>
          <label style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,border:"1.5px dashed #444",borderRadius:8,padding:"16px",cursor:"pointer",background:"#111" }}
            onMouseEnter={e=>(e.currentTarget.style.borderColor="#C9922A")}
            onMouseLeave={e=>(e.currentTarget.style.borderColor="#444")}>
            {form.imagen ? <img src={form.imagen} alt="preview" style={{ width:80,height:80,objectFit:"cover",borderRadius:6,border:"1px solid #333" }} /> : <span style={{ fontSize:28 }}>📷</span>}
            <span style={{ color:"#888",fontSize:11 }}>
              {form.imagen ? "Cambiar imagen" : "Subir imagen (JPG, PNG, WEBP)"}
            </span>
            {archivoFoto && (
              <span style={{ color:"#C9922A",fontSize:10 }}>
                📎 {archivoFoto.name} — se sube a S3 al guardar
              </span>
            )}
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
              const file=e.target.files?.[0]; if(!file) return;
              // El archivo se sube a S3 hasta que se guarda el producto;
              // mientras, el base64 solo sirve como preview local.
              setArchivoFoto(file);
              const reader=new FileReader();
              reader.onload=ev=>setF("imagen",ev.target?.result as string);
              reader.readAsDataURL(file);
            }} />
          </label>
          {form.imagen && <button onClick={()=>{ setF("imagen",""); setArchivoFoto(null); }} style={{ marginTop:6,background:"transparent",border:"none",color:"#666",fontSize:11,cursor:"pointer",textDecoration:"underline" }}>✕ Quitar imagen</button>}
        </div>

       {/* Acciones */}
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ background:"transparent",border:"1px solid #444",color:"#888",fontSize:12,fontWeight:600,padding:"9px 18px",borderRadius:7,cursor:"pointer" }}>
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