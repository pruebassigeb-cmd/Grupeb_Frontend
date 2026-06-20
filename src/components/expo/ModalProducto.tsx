// import { useState, useRef, useEffect } from "react";
// import {
//   CATS, OPCIONES_LAMINADO, OPCIONES_TEXTURA, OPCIONES_ASA, OPCIONES_TINTAS, OPCIONES_HS,
// } from "../../types/expo/expo.types";
// import type { Producto } from "../../types/expo/expo.types";

// // ─── Opciones locales ─────────────────────────────────────────────────────────
// const TIPOS_PAPEL         = ["Etiquetas","Bolsas","Cajas","Sobres","Carpetas","Folders","Formas continuas","Papelería","Círculo"];
// const TIPOS_PAPEL_MAT     = ["Multicapa","Bond","Couché","Kraft","Cartulina","Opalina"];
// const CALIBRES_PUNTOS     = ["10 pt","12 pt","14 pt","16 pt","18 pt","20 pt","22 pt","24 pt"];
// const CALIBRES_GRAMOS     = ["130 g","150 g","200 g","250 g"];
// const CALIBRES_ECT        = ["ECT-23","ECT-32","ECT-44"];
// const TIPOS_PLASTICO      = ["Bolsa plana","Bolsa troquelada","Celofán","Bolsa envíos","Asa flexible"];
// const MATERIALES_PLASTICO = ["Alta densidad","Baja densidad","BOPP"];
// const CALIBRES_BOPP       = ["30","35","40","50"];
// const CALIBRES_OTROS      = ["130","140","150","175","200","225","250"];
// const TINTAS_DEFAULT      = ["1x0","1x1","2x0","2x1","2x2","3x0","4x0","4x4"];

// // ─── Medidas por categoría ────────────────────────────────────────────────────
// const MEDIDAS_PAPEL: Record<string, string[]> = {
//   "Bolsas": ["15x8x20 cm","20x10x30 cm","25x12x35 cm","30x15x40 cm","35x18x45 cm","10x5x15 cm","40x20x50 cm","12x6x25 cm"],
//   "Cajas":  ["10x10x5 cm","15x10x8 cm","20x15x8 cm","22x15x5 cm","25x20x10 cm","30x20x12 cm","30x30x5 cm","40x30x15 cm"],
//   "Sobres": ["10x7 cm","11x22 cm","15x10 cm","20x15 cm","23x11 cm","25x18 cm","30x22 cm","32x24 cm"],
//   "Etiquetas": ["Ø3 cm","Ø5 cm","Ø8 cm","5x3 cm","7x4 cm","10x5 cm","10x7 cm","12x8 cm"],
//   "Carpetas": ["22x30 cm","23x32 cm","24x34 cm","25x35 cm","30x40 cm","32x45 cm","21x29.7 cm","28x43 cm"],
//   "Folders":  ["22x30 cm","23x32 cm","24x34 cm","25x35 cm","30x40 cm","21x29.7 cm","28x43 cm","32x45 cm"],
//   "default":  ["10x7 cm","15x10x5 cm","20x10x30 cm","22x15x8 cm","25x12x35 cm","30x20x10 cm","35x25x12 cm","40x30x15 cm"],
// };
// const MEDIDAS_PLASTICO = [
//   "20x30 cm","25x35 cm","30x40 cm","35x45 cm","40x50 cm",
//   "20x25x5 cm","25x30x8 cm","30x40x10 cm","40x35x10 cm","45x50x12 cm",
// ];
// const MEDIDAS_CARTON = [
//   "15x10x6 cm","20x15x8 cm","25x20x10 cm","30x20x12 cm",
//   "30x20x60 cm","35x25x15 cm","40x30x15 cm","40x30x25 cm",
// ];

// // ─── Estilos ──────────────────────────────────────────────────────────────────
// const LS: React.CSSProperties  = { display:"block", fontSize:10, fontWeight:700, color:"#888", letterSpacing:1, textTransform:"uppercase", marginBottom:4 };
// const IS: React.CSSProperties  = { width:"100%", background:"#111", border:"1px solid #333", borderRadius:6, padding:"8px 10px", color:"#EEE", fontSize:12, outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:2 };
// const ROW2: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 };
// const ROW3: React.CSSProperties = { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 };

// // ─── TintasSelectModal — igual al de HojaCotizacion pero con estilos del modal ─
// interface TintasModalProps { value: string; onChange: (v: string) => void; }
// function TintasSelectModal({ value, onChange }: TintasModalProps) {
//   const [open, setOpen]   = useState(false);
//   const [busq, setBusq]   = useState("");
//   const triggerRef        = useRef<HTMLDivElement>(null);
//   const inputRef          = useRef<HTMLInputElement>(null);

//   const lista = busq.trim()
//     ? OPCIONES_TINTAS.filter(o => o.includes(busq.trim()))
//     : TINTAS_DEFAULT;

//   useEffect(() => {
//     if (!open) return;
//     const fn = (e: MouseEvent) => {
//       if (!triggerRef.current?.contains(e.target as Node) &&
//           !document.getElementById("tintas-drop-modal")?.contains(e.target as Node))
//         setOpen(false);
//     };
//     document.addEventListener("mousedown", fn);
//     return () => document.removeEventListener("mousedown", fn);
//   }, [open]);

//   const seleccionar = (v: string) => { onChange(v); setOpen(false); setBusq(""); };

//   return (
//     <div style={{ position:"relative" }}>
//       {/* Trigger */}
//       <div ref={triggerRef} onClick={() => { setOpen(v => !v); setTimeout(()=>inputRef.current?.focus(),30); }}
//         style={{ ...IS, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom:0 }}>
//         <span style={{ color: value ? "#EEE" : "#555" }}>{value || "— Selecciona —"}</span>
//         <span style={{ color:"#666", fontSize:10 }}>▾</span>
//       </div>
//       {open && (
//         <div id="tintas-drop-modal"
//           style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#1A1A1A", border:"1px solid #444", borderRadius:8, zIndex:500, boxShadow:"0 8px 28px rgba(0,0,0,.8)", overflow:"hidden" }}>
//           <div style={{ padding:"6px 8px 4px", borderBottom:"1px solid #2A2A2A" }}>
//             <input ref={inputRef} value={busq} onChange={e => setBusq(e.target.value)}
//               placeholder="ej: 3x0"
//               style={{ width:"100%", background:"#111", border:"1px solid #333", borderRadius:4, padding:"5px 8px", color:"#EEE", fontSize:11, outline:"none", fontFamily:"'Inter',sans-serif" }}/>
//           </div>
//           <div style={{ maxHeight:180, overflowY:"auto" }}>
//             {lista.length === 0
//               ? <div style={{ padding:"10px", color:"#555", fontSize:11, textAlign:"center" }}>Sin resultados</div>
//               : lista.map(o => (
//                 <div key={o} onMouseDown={() => seleccionar(o)}
//                   style={{ padding:"7px 12px", cursor:"pointer", fontSize:12, color:value===o?"#C9922A":"#CCC", fontWeight:value===o?700:400, background:value===o?"#C9922A18":"transparent" }}
//                   onMouseEnter={e=>(e.currentTarget.style.background="#2A2A2A")}
//                   onMouseLeave={e=>(e.currentTarget.style.background=value===o?"#C9922A18":"transparent")}>
//                   {o}
//                 </div>
//               ))
//             }
//             {!busq && <div style={{ padding:"4px 12px 8px", color:"#444", fontSize:9 }}>Escribe para buscar más opciones</div>}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── HsSelectModal — desplegable igual que laminado/textura ──────────────────
// interface HsModalProps { value: string; hsActivo: boolean; onChange: (hs: boolean, tipo: string) => void; }
// function HsSelectModal({ value, hsActivo, onChange }: HsModalProps) {
//   return (
//     <select style={IS} value={hsActivo ? value : ""}
//       onChange={e => { const v = e.target.value; onChange(v !== "", v); }}>
//       {OPCIONES_HS.map(o => (
//         <option key={o} value={o === "Sin HS" ? "" : o}>{o}</option>
//       ))}
//     </select>
//   );
// }

// // ─── MedidaSelectModal ───────────────────────────────────────────────────────
// interface MedidaProps {
//   opciones: string[];
//   value:    string;
//   onChange: (v: string) => void;
// }
// function MedidaSelectModal({ opciones, value, onChange }: MedidaProps) {
//   const [open,   setOpen]   = useState(false);
//   const [custom, setCustom] = useState("");
//   const triggerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!open) return;
//     const fn = (e: MouseEvent) => {
//       if (!triggerRef.current?.contains(e.target as Node) &&
//           !document.getElementById("medida-drop-modal")?.contains(e.target as Node))
//         setOpen(false);
//     };
//     document.addEventListener("mousedown", fn);
//     return () => document.removeEventListener("mousedown", fn);
//   }, [open]);

//   const seleccionar = (v: string) => { onChange(v); setOpen(false); setCustom(""); };

//   return (
//     <div style={{ position:"relative" }}>
//       <div ref={triggerRef} onClick={() => setOpen(v => !v)}
//         style={{ ...IS, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom:0 }}>
//         <span style={{ color: value ? "#EEE" : "#555" }}>{value || "— Selecciona o escribe —"}</span>
//         <span style={{ color:"#666", fontSize:10 }}>▾</span>
//       </div>
//       {open && (
//         <div id="medida-drop-modal"
//           style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#1A1A1A", border:"1px solid #444", borderRadius:8, zIndex:500, boxShadow:"0 8px 28px rgba(0,0,0,.8)", overflow:"hidden" }}>
//           <div style={{ maxHeight:220, overflowY:"auto" }}>
//             {opciones.map(o => (
//               <div key={o} onMouseDown={() => seleccionar(o)}
//                 style={{ padding:"8px 12px", cursor:"pointer", fontSize:12, color:value===o?"#C9922A":"#CCC", fontWeight:value===o?700:400, background:value===o?"#C9922A18":"transparent" }}
//                 onMouseEnter={e=>(e.currentTarget.style.background="#2A2A2A")}
//                 onMouseLeave={e=>(e.currentTarget.style.background=value===o?"#C9922A18":"transparent")}>
//                 {o}
//               </div>
//             ))}
//           </div>
//           {/* Campo libre */}
//           <div style={{ borderTop:"1px solid #2A2A2A", padding:"6px 8px" }}>
//             <input
//               value={custom}
//               onChange={e => setCustom(e.target.value)}
//               placeholder="Otra medida personalizada..."
//               onMouseDown={e => e.stopPropagation()}
//               onKeyDown={e => { if (e.key === "Enter" && custom.trim()) seleccionar(custom.trim()); }}
//               style={{ width:"100%", background:"#111", border:"1px solid #333", borderRadius:4, padding:"5px 8px", color:"#EEE", fontSize:11, outline:"none", fontFamily:"'Inter',sans-serif" }}
//             />
//             {custom.trim() && (
//               <button onMouseDown={() => seleccionar(custom.trim())}
//                 style={{ marginTop:4, width:"100%", background:"#C9922A", border:"none", borderRadius:4, padding:"5px", color:"#1A1A1A", fontSize:11, fontWeight:700, cursor:"pointer" }}>
//                 ✓ Usar "{custom.trim()}"
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// const formVacio = (): Partial<Producto> => ({
//   nombre:"", categoria:"papel", medida:"", material:"", calibre:"", tintas:"1x0",
//   laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",
//   precio500:"", precio1000:"", precio3000:"", imagen:"",
//   tipo:"", ancho:"", fuelle:"", altura:"", tipoPapel:"", otro2:"",
//   tipoProducto:"", fuelLateral:"", fuelFondo:"", troquel:false, perforado:false,
//   tipoLaminado:"", tipoAsa:"", tipoTextura:"", tipoHs:"",
// });

// interface Props {
//   editando:    Producto | null;
//   catInicial?: "papel" | "plastico" | "carton";
//   onClose:     () => void;
//   onGuardar:   (p: Producto) => void;
// }

// export default function ModalProducto({ editando, catInicial = "papel", onClose, onGuardar }: Props) {
//   const [form,    setForm]    = useState<Partial<Producto>>(editando ? { ...editando } : { ...formVacio(), categoria: catInicial });
//   const [formCat, setFormCat] = useState<"papel"|"plastico"|"carton">(editando?.categoria ?? catInicial);

//   const setF     = (k: keyof Producto, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));
//   const soloNums = (v: string) => v.replace(/[^0-9.]/g,"").replace(/^(\d*\.?\d*).*$/,"$1");
//   const esBopp   = form.material === "BOPP";

//   const guardar = () => {
//     if (!form.nombre?.trim()) return;
//     let medida = form.medida || "";
//     if ((form.categoria==="papel"||form.categoria==="carton") && form.ancho && form.altura)
//       medida = `${form.ancho}x${form.fuelle||"0"}x${form.altura} cm`;
//     else if (form.categoria==="plastico" && form.ancho && form.altura)
//       medida = `${form.ancho}x${form.altura} cm`;
//     onGuardar({ ...(form as Producto), id: editando?.id ?? Date.now(), medida });
//   };

//   // El label de material en papel es "Tipo de papel"
//   const esPapelCarton = form.categoria==="papel" || form.categoria==="carton";

//   return (
//     <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
//       onClick={onClose}>
//       <div style={{ background:"#1A1A1A", border:"1px solid #333", borderRadius:12, width:"100%", maxWidth:600, maxHeight:"92vh", overflowY:"auto", padding:24 }}
//         onClick={e=>e.stopPropagation()}>

//         {/* Header */}
//         <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, borderBottom:"2px solid #C9922A", paddingBottom:12 }}>
//           <div>
//             <div style={{ color:"#C9922A", fontSize:13, fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{editando?"Editar producto":"Nuevo producto"}</div>
//             <div style={{ color:"#666", fontSize:11, marginTop:2 }}>{editando?editando.nombre:"Completa los campos"}</div>
//           </div>
//           <button onClick={onClose} style={{ background:"#2A2A2A", border:"none", color:"#AAA", width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:18 }}>✕</button>
//         </div>

//         {/* Selector categoría (solo nuevo) */}
//         {!editando && (
//           <div style={{ marginBottom:18 }}>
//             <label style={LS}>Categoría</label>
//             <div style={{ display:"flex", gap:8, marginTop:6 }}>
//               {CATS.map(c=>(
//                 <button key={c.key} onClick={()=>{setFormCat(c.key as typeof formCat);setF("categoria",c.key);}}
//                   style={{ flex:1, padding:"8px 4px", borderRadius:7, border:`1.5px solid ${formCat===c.key?c.color:"#333"}`, background:formCat===c.key?`${c.color}22`:"#111", color:formCat===c.key?c.color:"#666", cursor:"pointer", fontSize:11, fontWeight:700 }}>
//                   {c.emoji} {c.label}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Nombre */}
//         <div style={{ marginBottom:14 }}>
//           <label style={LS}>Nombre del producto *</label>
//           <input style={IS} value={form.nombre||""} onChange={e=>setF("nombre",e.target.value)} placeholder="Ej. Bolsa Kraft Boutique"/>
//         </div>

//         {/* ══ PAPEL / CARTÓN ══ */}
//         {esPapelCarton && (<>
//           <div style={ROW2}>
//             <div>
//               <label style={LS}>Tipo</label>
//               <select style={IS} value={form.tipo||""} onChange={e=>setF("tipo",e.target.value)}>
//                 <option value="">— Selecciona —</option>
//                 {TIPOS_PAPEL.map(o=><option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//             <div>
//               {/* FIX: "Tipo de papel" = material para papel/cartón */}
//               <label style={LS}>Tipo de papel</label>
//               <select style={IS} value={form.tipoPapel||""} onChange={e=>{setF("tipoPapel",e.target.value);setF("material",e.target.value);}}>
//                 <option value="">— Selecciona —</option>
//                 {TIPOS_PAPEL_MAT.map(o=><option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//           </div>

//           {/* Medidas rápidas según tipo + campo libre */}
//           <div style={{ marginBottom:14 }}>
//             <label style={LS}>Medida</label>
//             <MedidaSelectModal
//               opciones={form.categoria==="carton" ? MEDIDAS_CARTON : (MEDIDAS_PAPEL[form.tipo||"default"] || MEDIDAS_PAPEL["default"])}
//               value={form.medida||""}
//               onChange={v => {
//                 setF("medida", v);
//                 // Intentar parsear "AxBxC cm" → ancho/fuelle/altura
//                 const m3 = v.match(/^([\d.]+)x([\d.]+)x([\d.]+)/);
//                 const m2 = v.match(/^([\d.]+)x([\d.]+)/);
//                 if (m3) { setF("ancho",m3[1]); setF("fuelle",m3[2]); setF("altura",m3[3]); }
//                 else if (m2) { setF("ancho",m2[1]); setF("altura",m2[2]); setF("fuelle","0"); }
//               }}
//             />
//           </div>
//           {/* Medidas manuales individuales (opcional, para ajustar) */}
//           <div style={ROW3}>
//             <div><label style={LS}>Ancho (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.ancho||""} onChange={e=>{setF("ancho",soloNums(e.target.value));setF("medida","");}} placeholder="20"/></div>
//             <div><label style={LS}>Fuelle (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.fuelle||""} onChange={e=>{setF("fuelle",soloNums(e.target.value));setF("medida","");}} placeholder="10"/></div>
//             <div><label style={LS}>Altura (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.altura||""} onChange={e=>{setF("altura",soloNums(e.target.value));setF("medida","");}} placeholder="30"/></div>
//           </div>
//           {(form.ancho||form.altura)&&(
//             <div style={{ background:"#111", border:"1px solid #333", borderRadius:6, padding:"6px 10px", marginBottom:14, fontSize:11, color:"#C9922A", fontWeight:600 }}>
//               📐 Medida: {form.ancho||"?"}x{form.fuelle||"0"}x{form.altura||"?"} cm
//             </div>
//           )}

//           <div style={ROW2}>
//             <div>
//               <label style={LS}>Calibre</label>
//               <select style={IS} value={form.calibre||""} onChange={e=>setF("calibre",e.target.value)}>
//                 <option value="">— Selecciona —</option>
//                 <optgroup label="Puntos">{CALIBRES_PUNTOS.map(o=><option key={o} value={o}>{o}</option>)}</optgroup>
//                 <optgroup label="Gramos">{CALIBRES_GRAMOS.map(o=><option key={o} value={o}>{o}</option>)}</optgroup>
//                 <optgroup label="ECT">{CALIBRES_ECT.map(o=><option key={o} value={o}>{o}</option>)}</optgroup>
//               </select>
//             </div>
//             <div>
//               {/* FIX 1: TintasSelectModal en lugar del select nativo gigante */}
//               <label style={LS}>Tintas</label>
//               <TintasSelectModal value={form.tintas||""} onChange={v=>setF("tintas",v)}/>
//             </div>
//           </div>

//           <div style={ROW2}>
//             <div>
//               <label style={LS}>Asa</label>
//               <select style={IS} value={form.tipoAsa||""} onChange={e=>{setF("tipoAsa",e.target.value);setF("asa",e.target.value!=="");setF("otro",e.target.value);}}>
//                 {OPCIONES_ASA.map(o=><option key={o} value={o==="Sin asa"?"":o}>{o}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={LS}>Laminado</label>
//               <select style={IS} value={form.laminacion?(form.tipoLaminado||"Mate"):""} onChange={e=>{setF("laminacion",e.target.value!=="");setF("tipoLaminado",e.target.value);}}>
//                 {OPCIONES_LAMINADO.map(o=><option key={o} value={o==="Sin laminado"?"":o}>{o}</option>)}
//               </select>
//             </div>
//           </div>

//           <div style={ROW2}>
//             <div>
//               <label style={LS}>Textura</label>
//               <select style={IS} value={form.textura?(form.tipoTextura||"Piel cocodrilo"):""} onChange={e=>{setF("textura",e.target.value!=="");setF("tipoTextura",e.target.value);}}>
//                 {OPCIONES_TEXTURA.map(o=><option key={o} value={o==="Sin textura"?"":o}>{o}</option>)}
//               </select>
//             </div>
//             <div>
//               {/* FIX 2: HS como desplegable igual que laminado */}
//               <label style={LS}>Hot Stamping</label>
//               <HsSelectModal value={form.tipoHs||""} hsActivo={!!form.hs} onChange={(hs,tipo)=>{setF("hs",hs);setF("tipoHs",tipo);}}/>
//             </div>
//           </div>

//           {/* AR y UV siguen siendo checkboxes simples — son solo sí/no */}
//           <div style={{ marginBottom:14 }}>
//             <label style={LS}>Otros acabados</label>
//             <div style={{ display:"flex", gap:16, marginTop:8 }}>
//               {([["ar","AR"],["uv","UV"]] as const).map(([k,l])=>(
//                 <label key={k} style={{ display:"flex", alignItems:"center", gap:6, color:"#CCC", fontSize:12, cursor:"pointer" }}>
//                   <input type="checkbox" checked={!!form[k]} onChange={e=>setF(k,e.target.checked)} style={{ accentColor:"#C9922A", width:15, height:15 }}/>
//                   <span>{l}</span>
//                 </label>
//               ))}
//             </div>
//           </div>
//         </>)}

//         {/* ══ PLÁSTICO ══ */}
//         {form.categoria==="plastico" && (<>
//           <div style={ROW2}>
//             <div>
//               <label style={LS}>Tipo de producto</label>
//               <select style={IS} value={form.tipoProducto||""} onChange={e=>setF("tipoProducto",e.target.value)}>
//                 <option value="">— Selecciona —</option>
//                 {TIPOS_PLASTICO.map(o=><option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={LS}>Material</label>
//               <select style={IS} value={form.material||""} onChange={e=>{setF("material",e.target.value);setF("calibre","");}}>
//                 <option value="">— Selecciona —</option>
//                 {MATERIALES_PLASTICO.map(o=><option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//           </div>

//           <div style={ROW2}>
//             <div>
//               <label style={LS}>Calibre</label>
//               <select style={IS} value={form.calibre||""} onChange={e=>setF("calibre",e.target.value)} disabled={!form.material}>
//                 <option value="">{form.material?"— Selecciona —":"Primero elige material"}</option>
//                 {(esBopp?CALIBRES_BOPP:CALIBRES_OTROS).map(o=><option key={o} value={o}>{o}</option>)}
//               </select>
//             </div>
//             <div>
//               <label style={LS}>Tintas</label>
//               <TintasSelectModal value={form.tintas||""} onChange={v=>setF("tintas",v)}/>
//             </div>
//           </div>

//           <div style={{ marginBottom:14 }}>
//             <label style={LS}>Medida</label>
//             <MedidaSelectModal
//               opciones={MEDIDAS_PLASTICO}
//               value={form.medida||""}
//               onChange={v => {
//                 setF("medida", v);
//                 const m3 = v.match(/^([\d.]+)x([\d.]+)x([\d.]+)/);
//                 const m2 = v.match(/^([\d.]+)x([\d.]+)/);
//                 if (m3) { setF("ancho",m3[1]); setF("altura",m3[2]); }
//                 else if (m2) { setF("ancho",m2[1]); setF("altura",m2[2]); }
//               }}
//             />
//           </div>
//           <div style={ROW2}>
//             <div><label style={LS}>Alto (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.altura||""} onChange={e=>{setF("altura",soloNums(e.target.value));setF("medida","");}} placeholder="35"/></div>
//             <div><label style={LS}>Ancho (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.ancho||""} onChange={e=>{setF("ancho",soloNums(e.target.value));setF("medida","");}} placeholder="25"/></div>
//           </div>
//           <div style={ROW2}>
//             <div><label style={LS}>Fuelle lateral (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.fuelLateral||""} onChange={e=>setF("fuelLateral",soloNums(e.target.value))} placeholder="0"/></div>
//             <div><label style={LS}>Fuelle fondo (cm)</label><input style={IS} type="text" inputMode="decimal" value={form.fuelFondo||""} onChange={e=>setF("fuelFondo",soloNums(e.target.value))} placeholder="0"/></div>
//           </div>
//           {(form.ancho||form.altura)&&(
//             <div style={{ background:"#111", border:"1px solid #333", borderRadius:6, padding:"6px 10px", marginBottom:14, fontSize:11, color:"#C9922A", fontWeight:600 }}>
//               📐 {form.ancho||"?"}x{form.altura||"?"} cm{form.fuelLateral?` · FL: ${form.fuelLateral} cm`:""}  {form.fuelFondo?` · FF: ${form.fuelFondo} cm`:""}
//             </div>
//           )}

//           <div style={{ marginBottom:14 }}>
//             <label style={LS}>Características</label>
//             <div style={{ display:"flex", gap:16, marginTop:8 }}>
//               <label style={{ display:"flex", alignItems:"center", gap:6, color:"#CCC", fontSize:12, cursor:"pointer" }}>
//                 <input type="checkbox" checked={!!form.troquel}   onChange={e=>setF("troquel",e.target.checked)}   style={{ accentColor:"#C9922A", width:15, height:15 }}/><span>Troquel</span>
//               </label>
//               <label style={{ display:"flex", alignItems:"center", gap:6, color:"#CCC", fontSize:12, cursor:"pointer" }}>
//                 <input type="checkbox" checked={!!form.perforado} onChange={e=>setF("perforado",e.target.checked)} style={{ accentColor:"#C9922A", width:15, height:15 }}/><span>Perforado</span>
//               </label>
//             </div>
//           </div>
//         </>)}

//         {/* ══ PRECIOS ══ */}
//         <div style={{ borderTop:"1px solid #2A2A2A", paddingTop:14, marginBottom:14 }}>
//           <label style={LS}>Precios unitarios</label>
//           <div style={ROW3}>
//             <div><label style={{...LS,color:"#C9922A"}}>500 pzs</label>  <input style={IS} value={form.precio500 ||""} onChange={e=>setF("precio500", e.target.value)} placeholder="$0.00"/></div>
//             <div><label style={{...LS,color:"#C9922A"}}>1,000 pzs</label><input style={IS} value={form.precio1000||""} onChange={e=>setF("precio1000",e.target.value)} placeholder="$0.00"/></div>
//             <div><label style={{...LS,color:"#C9922A"}}>3,000 pzs</label><input style={IS} value={form.precio3000||""} onChange={e=>setF("precio3000",e.target.value)} placeholder="$0.00"/></div>
//           </div>
//         </div>

//         {/* ══ IMAGEN ══ */}
//         <div style={{ marginBottom:20 }}>
//           <label style={LS}>Imagen del producto</label>
//           <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, border:"1.5px dashed #444", borderRadius:8, padding:"16px", cursor:"pointer", background:"#111", transition:"border-color .15s" }}
//             onMouseEnter={e=>(e.currentTarget.style.borderColor="#C9922A")}
//             onMouseLeave={e=>(e.currentTarget.style.borderColor="#444")}>
//             {form.imagen
//               ? <img src={form.imagen} alt="preview" style={{ width:80, height:80, objectFit:"cover", borderRadius:6, border:"1px solid #333" }}/>
//               : <span style={{ fontSize:28 }}>📷</span>
//             }
//             <span style={{ color:"#888", fontSize:11 }}>{form.imagen?"Cambiar imagen":"Subir imagen (JPG, PNG, WEBP)"}</span>
//             <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
//               const file=e.target.files?.[0]; if(!file) return;
//               const reader=new FileReader();
//               reader.onload=ev=>setF("imagen",ev.target?.result as string);
//               reader.readAsDataURL(file);
//             }}/>
//           </label>
//           {form.imagen&&<button onClick={()=>setF("imagen","")} style={{ marginTop:6, background:"transparent", border:"none", color:"#666", fontSize:11, cursor:"pointer", textDecoration:"underline" }}>✕ Quitar imagen</button>}
//         </div>

//         {/* Acciones */}
//         <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
//           <button onClick={onClose} style={{ background:"transparent", border:"1px solid #444", color:"#888", fontSize:12, fontWeight:600, padding:"9px 18px", borderRadius:7, cursor:"pointer" }}>Cancelar</button>
//           <button onClick={guardar}
//             style={{ background:form.nombre?.trim()?"#C9922A":"#4A3A1A", border:"none", color:form.nombre?.trim()?"#1A1A1A":"#666", fontSize:12, fontWeight:700, padding:"9px 24px", borderRadius:7, cursor:form.nombre?.trim()?"pointer":"not-allowed", transition:"all .15s" }}>
//             {editando?"Guardar cambios":"Agregar al catálogo"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }