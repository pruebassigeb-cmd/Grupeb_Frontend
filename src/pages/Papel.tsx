import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Dashboard from "../layouts/Sidebar";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface TipoPapelEntry {
  id: number;
  tipo: string;
  calibre: string;
  pliego: string;
  rendimiento: string;
  corte: string;
  hojeado: {
    bobina: string;
    corte: string;
    rendimiento: string;
    guillotina: string;
    hilo: string;
  };
}

interface GrupoPapel {
  id: number;
  materiales: TipoPapelEntry[];
  draft: TipoPapelEntry;
  precioSugerido: string;
}

interface Producto {
  id: number;
  tipoProducto: string;
  ancho: string;
  fuelle: string;
  altura: string;
  medida: string;
  grupos: Omit<GrupoPapel, "draft">[];
  suaje: { numero: string; tamano: string; corte: string; dobles: string; metros: string; matrix: string };
  tipoPegado: string;
  pegamento: string;
  asa: string;
  refuerzo: string;
  base: string;
  empaque: string;
  pzsCaja: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const TIPOS_PRODUCTO = ["Etiquetas","Bolsas","Cajas","Sobres","Carpetas","Folders","Formas continuas","Papelería"];
const TIPOS_PAPEL    = ["Multicapa","Bond","Couché","Kraft","Cartulina","Duplex","Triplex","Opalina","Periódico","Manila"];
const TIPOS_PEGADO   = ["Fuelle","Esquina","Armado automático","Lineal","Fondo automático","4 Esquinas","6 Esquinas","Manual","Empalmadora"];
const TIPOS_PEGAMENTO= ["Blanco 393","Blanco 263","Blanco 200","Hot Melt","Cinta doble cara","Dextrina","PVA"];
const TIPOS_ASA      = ["Cordel","Listón satinado","Listón popotillo","Entorchado","Cordel armado automático","Especial"];
const TIPOS_EMPAQUE  = ["Caja 15x15x15","Caja EB 61x40x60","Tarima","Paquetes","Otro"];

const CAT_REFUERZO = [
  "Cartón gris — 5x5 cm",
  "Papel kraft — 10x10 cm",
  "Cartulina — 8x8 cm",
  "Polipropileno — 6x6 cm",
];
const CAT_BASE = [
  "Cartón duplex — 15x20 cm",
  "Polipropileno — 12x12 cm",
  "Cartón gris — 10x15 cm",
  "Foam — 20x20 cm",
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════
const newEntry = (): TipoPapelEntry => ({
  id: Date.now() + Math.random(),
  tipo:"", calibre:"", pliego:"", rendimiento:"", corte:"",
  hojeado:{ bobina:"", corte:"", rendimiento:"", guillotina:"", hilo:"" },
});
const newGrupo = (): GrupoPapel => ({
  id: Date.now()+Math.random(), materiales:[], draft:newEntry(), precioSugerido:"",
});
const fmt = (n: string) =>
  n ? `$${parseFloat(n).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—";

const DEMO_PRODUCTOS: Producto[] = [
  {
    id: 1,
    tipoProducto:"Bolsas", ancho:"9", fuelle:"5", altura:"5", medida:"9x5",
    grupos:[
      { id:1, precioSugerido:"12.50", materiales:[{ id:1, tipo:"Multicapa", calibre:"24pts", pliego:"90x125", rendimiento:"6", corte:"61x61.2", hojeado:{ bobina:"61", corte:"61.2", rendimiento:"1", guillotina:"61", hilo:"" } }] },
      { id:2, precioSugerido:"9.00",  materiales:[{ id:2, tipo:"Kraft",     calibre:"20pts", pliego:"80x110", rendimiento:"4", corte:"55x55",   hojeado:{ bobina:"",   corte:"",    rendimiento:"",  guillotina:"",   hilo:"" } }] },
    ],
    suaje:{ numero:"338", tamano:"389.27x607", corte:"3PTS", dobles:"", metros:"2", matrix:"" },
    tipoPegado:"Fuelle", pegamento:"Blanco 393", asa:"Cordel",
    refuerzo:"Cartón gris — 5x5 cm",
    base:"Cartón duplex — 15x20 cm",
    empaque:"Caja 15x15x15", pzsCaja:"10,000",
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVOS UI
// ═══════════════════════════════════════════════════════════════════════════
function Inp({ placeholder, value, onChange, style }:
  { placeholder?:string; value:string; onChange:(v:string)=>void; style?:React.CSSProperties }) {
  return (
    <input type="text" placeholder={placeholder} value={value}
      onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", height:36, padding:"0 10px", border:"1px solid #D1D5DB",
        borderRadius:6, fontSize:13, color:"#111827", background:"#fff",
        outline:"none", boxSizing:"border-box", ...style }}/>
  );
}

function Sel({ options, value, onChange, placeholder }:
  { options:string[]; value:string; onChange:(v:string)=>void; placeholder?:string }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{ width:"100%", height:36, padding:"0 10px", border:"1px solid #D1D5DB",
        borderRadius:6, fontSize:13, color:value?"#111827":"#9CA3AF",
        background:"#fff", outline:"none", boxSizing:"border-box", cursor:"pointer" }}>
      <option value="" disabled>{placeholder??"Seleccionar…"}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#6B7280",
        marginBottom:4, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

function FG({ children, cols=2 }: { children:React.ReactNode; cols?:number }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:"10px 14px" }}>
      {children}
    </div>
  );
}

function SecTitle({ children }: { children:React.ReactNode }) {
  return (
    <h3 style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
      color:"#6B7280", margin:"0 0 14px", paddingBottom:6, borderBottom:"1px solid #E5E7EB" }}>
      {children}
    </h3>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DRAFT FORM (material individual)
// ═══════════════════════════════════════════════════════════════════════════
function DraftForm({ entry, onChange, onConfirm, isEditing }:
  { entry:TipoPapelEntry; onChange:(e:TipoPapelEntry)=>void; onConfirm:()=>void; isEditing?:boolean }) {
  const upd  = (k:keyof TipoPapelEntry, v:string) => onChange({...entry,[k]:v});
  const updH = (k:keyof TipoPapelEntry["hojeado"], v:string) =>
    onChange({...entry, hojeado:{...entry.hojeado,[k]:v}});
  return (
    <div style={{ background:isEditing?"#FFFBEB":"#F9FAFB",
      border:`1px ${isEditing?"solid #FCD34D":"dashed #D1D5DB"}`, borderRadius:8, padding:"14px 16px" }}>
      {isEditing && (
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
          textTransform:"uppercase", color:"#D97706", margin:"0 0 10px" }}>Editando material</p>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr 1fr 1fr 1fr auto",
        gap:"10px 12px", alignItems:"end" }}>
        <Field label="Tipo de papel">
          <Sel options={TIPOS_PAPEL} value={entry.tipo} onChange={v=>upd("tipo",v)} placeholder="Tipo…"/>
        </Field>
        <Field label="Calibre"><Inp placeholder="ej: 24pts"    value={entry.calibre}     onChange={v=>upd("calibre",v)}/></Field>
        <Field label="Pliego"> <Inp placeholder="ej: 90x125"   value={entry.pliego}      onChange={v=>upd("pliego",v)}/></Field>
        <Field label="Rendimiento"><Inp placeholder="ej: 6"    value={entry.rendimiento} onChange={v=>upd("rendimiento",v)}/></Field>
        <Field label="Corte">  <Inp placeholder="ej: 61x62.55" value={entry.corte}       onChange={v=>upd("corte",v)}/></Field>
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <button onClick={onConfirm}
            style={{ width:36, height:36, background:isEditing?"#D97706":"#1D4ED8", border:"none",
              borderRadius:6, cursor:"pointer", color:"#fff", fontSize:isEditing?14:20,
              display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
            {isEditing?"✓":"+"}
          </button>
        </div>
      </div>
      <div style={{ marginTop:12 }}>
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em",
          textTransform:"uppercase", color:"#9CA3AF", margin:"0 0 8px" }}>Hojeado</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px 12px" }}>
          {([ ["bobina","Bobina"],["corte","Corte"],["rendimiento","Rendimiento"],
              ["guillotina","Guillotina"],["hilo","Hilo"] ] as [keyof TipoPapelEntry["hojeado"],string][])
            .map(([k,lbl])=>(
              <Field key={k} label={lbl}>
                <Inp placeholder="" value={entry.hojeado[k]} onChange={v=>updH(k,v)}/>
              </Field>
            ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MATERIAL CARD
// ═══════════════════════════════════════════════════════════════════════════
function MaterialCard({ entry, index, onEdit, onRemove }:
  { entry:TipoPapelEntry; index:number; onEdit:()=>void; onRemove:()=>void }) {
  const chip = (label:string, val:string) => val ? (
    <span key={label} style={{ display:"inline-flex", flexDirection:"column", gap:1 }}>
      <span style={{ fontSize:9, fontWeight:700, color:"#9CA3AF",
        textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</span>
      <span style={{ fontSize:12, color:"#111827", fontWeight:500 }}>{val}</span>
    </span>
  ) : null;
  const hFields = [
    ["Bobina",entry.hojeado.bobina],["Corte",entry.hojeado.corte],
    ["Rend.",entry.hojeado.rendimiento],["Guillotina",entry.hojeado.guillotina],["Hilo",entry.hojeado.hilo],
  ].filter(([,v])=>v);
  return (
    <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:8,
      padding:"10px 14px", display:"flex", alignItems:"flex-start", gap:12, marginBottom:8 }}>
      <div style={{ width:24, height:24, borderRadius:"50%", background:"#1D4ED8", color:"#fff",
        fontSize:11, fontWeight:700, display:"flex", alignItems:"center",
        justifyContent:"center", flexShrink:0, marginTop:2 }}>{index+1}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 20px",
          marginBottom:hFields.length?6:0 }}>
          {chip("Tipo",entry.tipo)}{chip("Calibre",entry.calibre)}
          {chip("Pliego",entry.pliego)}{chip("Rendimiento",entry.rendimiento)}{chip("Corte",entry.corte)}
        </div>
        {hFields.length>0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 16px",
            paddingTop:6, borderTop:"1px solid #BFDBFE" }}>
            <span style={{ fontSize:9, fontWeight:700, color:"#6B7280",
              textTransform:"uppercase", letterSpacing:"0.06em", alignSelf:"center" }}>Hojeado:</span>
            {hFields.map(([lbl,val])=>chip(lbl,val))}
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        <button onClick={onEdit} style={{ width:26, height:26, background:"#FEF3C7", border:"none",
          borderRadius:5, cursor:"pointer", color:"#D97706", fontSize:13,
          display:"flex", alignItems:"center", justifyContent:"center" }}>✎</button>
        <button onClick={onRemove} style={{ width:26, height:26, background:"#FEE2E2", border:"none",
          borderRadius:5, cursor:"pointer", color:"#DC2626", fontSize:14,
          display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GRUPO BLOCK
// ═══════════════════════════════════════════════════════════════════════════
function GrupoBlock({ grupo, grupoIndex, totalGrupos, onUpdate, onRemoveGrupo }:
  { grupo:GrupoPapel; grupoIndex:number; totalGrupos:number;
    onUpdate:(g:GrupoPapel)=>void; onRemoveGrupo:()=>void }) {
  const [editingId, setEditingId] = useState<number|null>(null);
  const [editDraft, setEditDraft] = useState<TipoPapelEntry|null>(null);

  const confirmarMaterial = () => {
    if (!grupo.draft.tipo) return;
    onUpdate({ ...grupo, materiales:[...grupo.materiales,{...grupo.draft}], draft:newEntry() });
  };
  const startEdit = (e:TipoPapelEntry) => { setEditingId(e.id); setEditDraft({...e}); };
  const saveEdit  = () => {
    if (!editDraft) return;
    onUpdate({ ...grupo, materiales:grupo.materiales.map(m=>m.id===editDraft.id?editDraft:m) });
    setEditingId(null); setEditDraft(null);
  };
  const removeMaterial = (id:number) => {
    onUpdate({ ...grupo, materiales:grupo.materiales.filter(m=>m.id!==id) });
    if (editingId===id) { setEditingId(null); setEditDraft(null); }
  };

  const COLORS = ["#7C3AED","#0891B2","#059669","#D97706","#DC2626","#DB2777"];
  const LIGHTS = ["#EDE9FE","#CFFAFE","#D1FAE5","#FEF3C7","#FEE2E2","#FCE7F3"];
  const color  = COLORS[grupoIndex%COLORS.length];
  const light  = LIGHTS[grupoIndex%LIGHTS.length];

  return (
    <div style={{ border:`1.5px solid ${color}30`, borderLeft:`3px solid ${color}`,
      borderRadius:10, marginBottom:14, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 16px", background:light, borderBottom:`1px solid ${color}20` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:"50%", background:color, color:"#fff",
            fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {grupoIndex+1}
          </div>
          <span style={{ fontSize:12, fontWeight:600, color }}>Grupo {grupoIndex+1}</span>
          <span style={{ fontSize:11, color:"#9CA3AF" }}>
            — {grupo.materiales.length} material{grupo.materiales.length!==1?"es":""}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <label style={{ fontSize:11, fontWeight:600, color:"#6B7280",
              letterSpacing:"0.04em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              Precio sugerido
            </label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)",
                fontSize:12, color:"#6B7280", pointerEvents:"none" }}>$</span>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={grupo.precioSugerido}
                onChange={e=>onUpdate({...grupo, precioSugerido:e.target.value})}
                style={{ width:110, height:30, paddingLeft:18, paddingRight:8,
                  border:"1px solid #D1D5DB", borderRadius:6, fontSize:13,
                  color:"#111827", background:"#fff", outline:"none", boxSizing:"border-box" }}/>
            </div>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>MXN</span>
          </div>
          {totalGrupos>1 && (
            <button onClick={onRemoveGrupo}
              style={{ padding:"2px 10px", height:26, background:"#FEE2E2", border:"none",
                borderRadius:5, cursor:"pointer", color:"#DC2626", fontSize:11, fontWeight:600 }}>
              Eliminar grupo
            </button>
          )}
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        {grupo.materiales.length>0 && (
          <div style={{ marginBottom:12 }}>
            {grupo.materiales.map((m,i)=>
              editingId===m.id ? (
                <div key={m.id} style={{ marginBottom:8 }}>
                  <DraftForm entry={editDraft!} onChange={setEditDraft}
                    onConfirm={saveEdit} isEditing/>
                  <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
                    <button onClick={()=>{setEditingId(null);setEditDraft(null);}}
                      style={{ fontSize:12, color:"#6B7280", background:"none",
                        border:"none", cursor:"pointer", padding:"4px 8px" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <MaterialCard key={m.id} entry={m} index={i}
                  onEdit={()=>startEdit(m)} onRemove={()=>removeMaterial(m.id)}/>
              )
            )}
          </div>
        )}
        {editingId===null && (
          <DraftForm entry={grupo.draft}
            onChange={d=>onUpdate({...grupo,draft:d})}
            onConfirm={confirmarMaterial}/>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// UPLOAD BUTTON
// ═══════════════════════════════════════════════════════════════════════════
function UploadBtn({ label, accept, file, onFile, icon }:
  { label:string; accept:string; file:File|null; onFile:(f:File)=>void; icon:string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept={accept} style={{ display:"none" }}
        onChange={e=>{ if(e.target.files?.[0]) onFile(e.target.files[0]); }}/>
      <button onClick={()=>ref.current?.click()}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"0 18px", height:40,
          background:"#fff", border:"1.5px dashed #D1D5DB", borderRadius:8, cursor:"pointer",
          fontSize:13, color:"#374151", fontWeight:500, whiteSpace:"nowrap" }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        {file?file.name:label}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO ALTA / EDICIÓN
// ═══════════════════════════════════════════════════════════════════════════
function FormularioProducto({ initial, onSave, onCancel }:
  { initial?:Producto; onSave:(p:Producto)=>void; onCancel:()=>void }) {
  const isEdit = !!initial;

  const [tipoProducto, setTipoProducto] = useState(initial?.tipoProducto??"");
  const [ancho,  setAncho]  = useState(initial?.ancho??"");
  const [fuelle, setFuelle] = useState(initial?.fuelle??"");
  const [altura, setAltura] = useState(initial?.altura??"");
  const [medida, setMedida] = useState(initial?.medida??"");

  const [grupos, setGrupos] = useState<GrupoPapel[]>(
    initial?.grupos.map(g=>({...g, draft:newEntry()})) ?? [newGrupo()]
  );

  const [suajeNumero,  setSuajeNumero]  = useState(initial?.suaje.numero??"");
  const [suajeTamano,  setSuajeTamano]  = useState(initial?.suaje.tamano??"");
  const [suajeCorte,   setSuajeCorte]   = useState(initial?.suaje.corte??"");
  const [suajeDobles,  setSuajeDobles]  = useState(initial?.suaje.dobles??"");
  const [suajeMetros,  setSuajeMetros]  = useState(initial?.suaje.metros??"");
  const [suajeMatrix,  setSuajeMatrix]  = useState(initial?.suaje.matrix??"");
  const [tipoPegado,   setTipoPegado]   = useState(initial?.tipoPegado??"");
  const [pegamento,    setPegamento]    = useState(initial?.pegamento??"");
  const [asa,          setAsa]          = useState(initial?.asa??"");
  const [refuerzo,     setRefuerzo]     = useState(initial?.refuerzo??"");
  const [base,         setBase]         = useState(initial?.base??"");
  const [empaque,      setEmpaque]      = useState(initial?.empaque??"");
  const [pzsCaja,      setPzsCaja]      = useState(initial?.pzsCaja??"");
  const [catalogo,     setCatalogo]     = useState<File|null>(null);
  const [imagen,       setImagen]       = useState<File|null>(null);
  const [rendimiento,  setRendimiento]  = useState<File|null>(null);

  const updateGrupo = (g:GrupoPapel) => setGrupos(prev=>prev.map(x=>x.id===g.id?g:x));
  const removeGrupo = (id:number)    => setGrupos(prev=>prev.filter(x=>x.id!==id));
  const addGrupo    = ()             => setGrupos(prev=>[...prev,newGrupo()]);

  const handleGuardar = () => {
    if (!tipoProducto) { alert("Selecciona el tipo de producto"); return; }
    const producto: Producto = {
      id: initial?.id ?? Date.now(),
      tipoProducto, ancho, fuelle, altura, medida,
      grupos: grupos.map(({ draft:_d, ...rest })=>rest),
      suaje:{ numero:suajeNumero, tamano:suajeTamano, corte:suajeCorte,
              dobles:suajeDobles, metros:suajeMetros, matrix:suajeMatrix },
      tipoPegado, pegamento, asa, refuerzo, base, empaque, pzsCaja,
    };
    onSave(producto);
  };

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"32px 24px 64px",
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#111827" }}>
      <div style={{ marginBottom:28 }}>
        <button onClick={onCancel}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:13,
            color:"#6B7280", display:"flex", alignItems:"center", gap:4, padding:0, marginBottom:12 }}>
          ← Regresar al catálogo
        </button>
        <p style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase",
          color:"#9CA3AF", margin:"0 0 4px", fontWeight:600 }}>
          {isEdit?"Editar producto":"Alta de producto"}
        </p>
        <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:"#111827" }}>
          Producto de papel
        </h1>
      </div>

      <div style={secStyle}>
        <SecTitle>Tipo de producto</SecTitle>
        <FG cols={5}>
          <Field label="Tipo">
            <Sel options={TIPOS_PRODUCTO} value={tipoProducto} onChange={setTipoProducto} placeholder="Seleccionar…"/>
          </Field>
          <Field label="Ancho">  <Inp placeholder="ej: 9"   value={ancho}  onChange={setAncho}/></Field>
          <Field label="Fuelle"> <Inp placeholder="ej: 5"   value={fuelle} onChange={setFuelle}/></Field>
          <Field label="Altura"> <Inp placeholder="ej: 5"   value={altura} onChange={setAltura}/></Field>
          <Field label="Medida"> <Inp placeholder="ej: 9x5" value={medida} onChange={setMedida}/></Field>
        </FG>
      </div>

      <div style={secStyle}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <SecTitle>Tipo de papel</SecTitle>
          <button onClick={addGrupo}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"0 14px", height:32,
              background:"#F3F4F6", border:"1px solid #D1D5DB", borderRadius:6,
              cursor:"pointer", color:"#374151", fontSize:12, fontWeight:600 }}>
            + Grupo
          </button>
        </div>
        {grupos.map((g,i)=>(
          <GrupoBlock key={g.id} grupo={g} grupoIndex={i} totalGrupos={grupos.length}
            onUpdate={updateGrupo} onRemoveGrupo={()=>removeGrupo(g.id)}/>
        ))}
      </div>

      <div style={secStyle}>
        <SecTitle>Suaje</SecTitle>
        <FG cols={6}>
          <Field label="Número">   <Inp placeholder="ej: 338"        value={suajeNumero} onChange={setSuajeNumero}/></Field>
          <Field label="Tamaño">   <Inp placeholder="ej: 389.27x607" value={suajeTamano} onChange={setSuajeTamano}/></Field>
          <Field label="Corte">    <Inp placeholder="ej: 3PTS"        value={suajeCorte}  onChange={setSuajeCorte}/></Field>
          <Field label="Dobles">   <Inp placeholder=""               value={suajeDobles} onChange={setSuajeDobles}/></Field>
          <Field label="Metros">   <Inp placeholder="ej: 2"           value={suajeMetros} onChange={setSuajeMetros}/></Field>
          <Field label="Matrix">   <Inp placeholder=""               value={suajeMatrix} onChange={setSuajeMatrix}/></Field>
        </FG>
      </div>

      <div style={secStyle}>
        <SecTitle>Pegado, pegamento y asa</SecTitle>
        <FG cols={3}>
          <Field label="Tipo de pegado"><Sel options={TIPOS_PEGADO}    value={tipoPegado} onChange={setTipoPegado}/></Field>
          <Field label="Pegamento">     <Sel options={TIPOS_PEGAMENTO} value={pegamento}  onChange={setPegamento}/></Field>
          <Field label="Asa">           <Sel options={TIPOS_ASA}       value={asa}        onChange={setAsa}/></Field>
        </FG>
      </div>

      <div style={secStyle}>
        <SecTitle>Refuerzo y base</SecTitle>
        <FG cols={2}>
          <Field label="Refuerzo">
            <Sel options={CAT_REFUERZO} value={refuerzo} onChange={setRefuerzo}
              placeholder="Seleccionar refuerzo…"/>
          </Field>
          <Field label="Base">
            <Sel options={CAT_BASE} value={base} onChange={setBase}
              placeholder="Seleccionar base…"/>
          </Field>
        </FG>
      </div>

      <div style={secStyle}>
        <SecTitle>Empaque</SecTitle>
        <FG cols={2}>
          <Field label="Tipo de empaque">
            <Sel options={TIPOS_EMPAQUE} value={empaque} onChange={setEmpaque}/>
          </Field>
          <Field label="Piezas por caja">
            <Inp placeholder="ej: 10,000" value={pzsCaja} onChange={setPzsCaja}/>
          </Field>
        </FG>
      </div>

      <div style={secStyle}>
        <SecTitle>Archivos</SecTitle>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <UploadBtn label="Subir catálogo" accept=".pdf,.doc,.docx,.xls,.xlsx"
            file={catalogo} onFile={setCatalogo} icon="📄"/>
          <UploadBtn label="Subir imagen" accept="image/*"
            file={imagen} onFile={setImagen} icon="🖼️"/>
          <UploadBtn label="Subir rendimiento" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
            file={rendimiento} onFile={setRendimiento} icon="📊"/>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
        <button onClick={onCancel}
          style={{ height:40, padding:"0 20px", border:"1px solid #D1D5DB",
            borderRadius:8, background:"#fff", color:"#374151",
            fontSize:13, fontWeight:500, cursor:"pointer" }}>Cancelar</button>
        <button onClick={handleGuardar}
          style={{ height:40, padding:"0 24px", border:"none", borderRadius:8,
            background:"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
          {isEdit?"Guardar cambios":"Registrar producto"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE EXPANDIBLE
// ═══════════════════════════════════════════════════════════════════════════
function DetalleProducto({ producto }: { producto:Producto }) {
  const row = (label:string, val:string) => val ? (
    <div key={label} style={{ display:"flex", gap:8, fontSize:13 }}>
      <span style={{ color:"#6B7280", minWidth:130, flexShrink:0 }}>{label}</span>
      <span style={{ color:"#111827", fontWeight:500 }}>{val}</span>
    </div>
  ) : null;
  return (
    <div style={{ padding:"16px 20px", background:"#F9FAFB", borderTop:"1px solid #E5E7EB" }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 40px", marginBottom:16 }}>
        {row("Ancho",        producto.ancho)}
        {row("Fuelle",       producto.fuelle)}
        {row("Altura",       producto.altura)}
        {row("Medida",       producto.medida)}
        {row("Suaje N°",     producto.suaje.numero)}
        {row("Tamaño suaje", producto.suaje.tamano)}
        {row("Corte suaje",  producto.suaje.corte)}
        {row("Metros suaje", producto.suaje.metros)}
        {row("Tipo pegado",  producto.tipoPegado)}
        {row("Pegamento",    producto.pegamento)}
        {row("Asa",          producto.asa)}
        {row("Refuerzo",     producto.refuerzo)}
        {row("Base",         producto.base)}
        {row("Empaque",      producto.empaque)}
        {row("Pzs por caja", producto.pzsCaja)}
      </div>
      <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em",
        textTransform:"uppercase", color:"#6B7280", margin:"0 0 10px" }}>
        Opciones de material
      </p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {producto.grupos.map((g,gi)=>{
          const COLORS = ["#7C3AED","#0891B2","#059669","#D97706","#DC2626","#DB2777"];
          const LIGHTS = ["#EDE9FE","#CFFAFE","#D1FAE5","#FEF3C7","#FEE2E2","#FCE7F3"];
          const c = COLORS[gi%COLORS.length];
          const l = LIGHTS[gi%LIGHTS.length];
          return (
            <div key={g.id} style={{ border:`1px solid ${c}30`, borderLeft:`3px solid ${c}`,
              borderRadius:8, overflow:"hidden" }}>
              <div style={{ background:l, padding:"8px 14px",
                display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, fontWeight:600, color:c }}>
                  Grupo {gi+1} — {g.materiales.length} material{g.materiales.length!==1?"es":""}
                </span>
                <span style={{ fontSize:13, fontWeight:700, color:c }}>
                  {fmt(g.precioSugerido)} MXN
                </span>
              </div>
              <div style={{ padding:"10px 14px" }}>
                {g.materiales.map((m,mi)=>(
                  <div key={m.id} style={{ display:"flex", flexWrap:"wrap", gap:"4px 16px",
                    paddingBottom: mi<g.materiales.length-1?8:0,
                    marginBottom:  mi<g.materiales.length-1?8:0,
                    borderBottom:  mi<g.materiales.length-1?"1px dashed #E5E7EB":"none" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#6B7280", minWidth:16 }}>{mi+1}.</span>
                    {[["Tipo",m.tipo],["Calibre",m.calibre],["Pliego",m.pliego],
                      ["Rend.",m.rendimiento],["Corte",m.corte]].filter(([,v])=>v).map(([lbl,val])=>(
                      <span key={lbl} style={{ fontSize:12 }}>
                        <span style={{ color:"#9CA3AF" }}>{lbl}: </span>
                        <span style={{ color:"#111827", fontWeight:500 }}>{val}</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TABLA CATÁLOGO
// ═══════════════════════════════════════════════════════════════════════════
function TablaCatalogo({ productos, onNuevo, onEditar, onEliminar }:
  { productos:Producto[]; onNuevo:()=>void;
    onEditar:(p:Producto)=>void; onEliminar:(id:number)=>void }) {
  const [search,     setSearch]     = useState("");
  const [expandedId, setExpandedId] = useState<number|null>(null);
  const [deleteId,   setDeleteId]   = useState<number|null>(null);

  const filtered = productos.filter(p=>
    p.tipoProducto.toLowerCase().includes(search.toLowerCase()) ||
    p.medida.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth:960, margin:"0 auto", padding:"32px 24px 64px",
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color:"#111827" }}>

      {deleteId!==null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
          <div style={{ background:"#fff", borderRadius:12, padding:"28px 32px",
            maxWidth:360, width:"90%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <p style={{ fontSize:15, color:"#111827", margin:"0 0 6px", fontWeight:600 }}>
              ¿Eliminar producto?
            </p>
            <p style={{ fontSize:13, color:"#6B7280", margin:"0 0 20px" }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button onClick={()=>setDeleteId(null)}
                style={{ height:36, padding:"0 16px", border:"1px solid #E5E7EB",
                  borderRadius:7, background:"#fff", color:"#6B7280",
                  fontSize:13, cursor:"pointer" }}>Cancelar</button>
              <button onClick={()=>{ onEliminar(deleteId!); setDeleteId(null); }}
                style={{ height:36, padding:"0 16px", border:"none", borderRadius:7,
                  background:"#DC2626", color:"#fff", fontSize:13,
                  fontWeight:600, cursor:"pointer" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"flex-end",
        justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <p style={{ fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase",
            color:"#9CA3AF", margin:"0 0 4px", fontWeight:600 }}>Alta de productos</p>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:"#111827" }}>
            Catálogo de papel
          </h1>
        </div>
        <button onClick={onNuevo}
          style={{ height:40, padding:"0 20px", border:"none", borderRadius:8,
            background:"#1D4ED8", color:"#fff", fontSize:13, fontWeight:600,
            cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          + Registrar nuevo producto
        </button>
      </div>

      <div style={{ position:"relative", marginBottom:16 }}>
        <span style={{ position:"absolute", left:12, top:"50%",
          transform:"translateY(-50%)", fontSize:14, color:"#9CA3AF" }}>🔍</span>
        <input type="text" placeholder="Buscar por tipo o medida…" value={search}
          onChange={e=>setSearch(e.target.value)}
          style={{ width:"100%", height:40, paddingLeft:36, paddingRight:12,
            border:"1px solid #D1D5DB", borderRadius:8, fontSize:13,
            color:"#111827", background:"#fff", outline:"none", boxSizing:"border-box" }}/>
      </div>

      <div style={{ border:"1px solid #E5E7EB", borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",
          background:"#F9FAFB", borderBottom:"1px solid #E5E7EB", padding:"0 20px" }}>
          {["Tipo de producto","Medida","Grupos","Pegado","Empaque",""].map(h=>(
            <div key={h} style={{ padding:"10px 0", fontSize:11, fontWeight:700,
              letterSpacing:"0.08em", textTransform:"uppercase", color:"#6B7280" }}>{h}</div>
          ))}
        </div>

        {filtered.length===0 ? (
          <div style={{ padding:"40px 20px", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
            {search?"Sin resultados para esa búsqueda.":"No hay productos registrados aún."}
          </div>
        ) : (
          filtered.map((p,idx)=>(
            <div key={p.id}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr auto",
                padding:"0 20px", alignItems:"center", minHeight:52,
                background: expandedId===p.id?"#EFF6FF": idx%2===0?"#fff":"#FAFAFA",
                borderBottom: expandedId===p.id?"none":"1px solid #F3F4F6" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <button onClick={()=>setExpandedId(expandedId===p.id?null:p.id)}
                    style={{ width:22, height:22, borderRadius:5, background:"#EFF6FF",
                      border:"1px solid #BFDBFE", cursor:"pointer", fontSize:12, color:"#1D4ED8",
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    {expandedId===p.id?"▲":"▼"}
                  </button>
                  <div>
                    <p style={{ margin:0, fontWeight:600, fontSize:13, color:"#111827" }}>
                      {p.tipoProducto}
                    </p>
                    <p style={{ margin:0, fontSize:11, color:"#9CA3AF" }}>ID #{p.id}</p>
                  </div>
                </div>
                <span style={{ fontSize:13, color:"#374151" }}>{p.medida||"—"}</span>
                <span style={{ fontSize:13, color:"#374151" }}>
                  {p.grupos.length} grupo{p.grupos.length!==1?"s":""}
                </span>
                <span style={{ fontSize:13, color:"#374151" }}>{p.tipoPegado||"—"}</span>
                <span style={{ fontSize:13, color:"#374151" }}>{p.empaque||"—"}</span>
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                  <button onClick={()=>onEditar(p)}
                    style={{ height:30, padding:"0 12px", background:"#F3F4F6",
                      border:"1px solid #D1D5DB", borderRadius:6, cursor:"pointer",
                      fontSize:12, fontWeight:600, color:"#374151" }}>✎ Editar</button>
                  <button onClick={()=>setDeleteId(p.id)}
                    style={{ height:30, padding:"0 10px", background:"#FEE2E2",
                      border:"none", borderRadius:6, cursor:"pointer",
                      fontSize:12, fontWeight:600, color:"#DC2626" }}>×</button>
                </div>
              </div>
              {expandedId===p.id && <DetalleProducto producto={p}/>}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop:10, textAlign:"right", fontSize:12, color:"#9CA3AF" }}>
        {filtered.length} de {productos.length} producto{productos.length!==1?"s":""}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
type Vista = "tabla" | "nuevo" | "editar";

export default function Papel() {
  useAuth();
  const [vista,     setVista]     = useState<Vista>("tabla");
  const [productos, setProductos] = useState<Producto[]>(DEMO_PRODUCTOS);
  const [editando,  setEditando]  = useState<Producto|undefined>(undefined);

  const handleSave = (p:Producto) => {
    setProductos(prev=>{
      const existe = prev.find(x=>x.id===p.id);
      return existe ? prev.map(x=>x.id===p.id?p:x) : [...prev,p];
    });
    setVista("tabla");
    setEditando(undefined);
  };

  const handleEditar   = (p:Producto) => { setEditando(p); setVista("editar"); };
  const handleEliminar = (id:number)  => setProductos(prev=>prev.filter(p=>p.id!==id));

  return (
    <Dashboard>
      {vista==="tabla" ? (
        <TablaCatalogo
          productos={productos}
          onNuevo={()=>{ setEditando(undefined); setVista("nuevo"); }}
          onEditar={handleEditar}
          onEliminar={handleEliminar}
        />
      ) : (
        <FormularioProducto
          initial={editando}
          onSave={handleSave}
          onCancel={()=>{ setVista("tabla"); setEditando(undefined); }}
        />
      )}
    </Dashboard>
  );
}

const secStyle: React.CSSProperties = {
  background:"#fff", border:"1px solid #E5E7EB",
  borderRadius:10, padding:"20px 22px", marginBottom:16,
};