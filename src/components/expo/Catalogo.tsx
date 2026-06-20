// import { CATS } from "../../types/expo/expo.types";
// import type { Producto } from "../../types/expo/expo.types";

// // Store de búsqueda fuera del componente para que React no lo remonte al re-render
// export const busquedaStore: Record<string, string> = { papel: "", plastico: "", carton: "" };

// // Productos del sistema hardcodeados aquí temporalmente (sin data.ts)
// export const SISTEMA_PRODS: Producto[] = [
//   { id:101, nombre:"Bolsa Kraft Lisa",          categoria:"papel",    medida:"15x5x20 cm",  material:"Kraft",           calibre:"80 g",   tintas:"0x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           precio500:"$3.20",  precio1000:"$2.60",  precio3000:"$2.00",  imagen:"https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&q=80" },
//   { id:102, nombre:"Sobre Carta Bond",          categoria:"papel",    medida:"22x11 cm",    material:"Bond 75g",        calibre:"75 g",   tintas:"1x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           precio500:"$0.80",  precio1000:"$0.60",  precio3000:"$0.45",  imagen:"https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=200&q=80" },
//   { id:103, nombre:"Carpeta Corporativa",       categoria:"papel",    medida:"32x24 cm",    material:"Couché 300g",     calibre:"300 g",  tintas:"4x0", laminacion:true,  hs:false, ar:false, textura:false, uv:true,  asa:false, otro:"",           tipoLaminado:"Mate",         precio500:"$12.00", precio1000:"$9.50",  precio3000:"$7.80",  imagen:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80" },
//   { id:104, nombre:"Caja Pizza Kraft",          categoria:"papel",    medida:"30x30x5 cm",  material:"Kraft 350g",      calibre:"350 g",  tintas:"1x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Barniz",     precio500:"$7.50",  precio1000:"$6.00",  precio3000:"$4.80",  imagen:"https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=200&q=80" },
//   { id:105, nombre:"Etiqueta Redonda Couché",   categoria:"papel",    medida:"Ø5 cm",       material:"Couché 115g",     calibre:"115 g",  tintas:"4x4", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           tipoLaminado:"Brillante",    precio500:"$0.35",  precio1000:"$0.25",  precio3000:"$0.18",  imagen:"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
//   { id:106, nombre:"Folder Presentación",       categoria:"papel",    medida:"23x32 cm",    material:"Couché 250g",     calibre:"250 g",  tintas:"4x0", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           tipoLaminado:"Mate",         precio500:"$8.50",  precio1000:"$6.80",  precio3000:"$5.50",  imagen:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80" },
//   { id:201, nombre:"Bolsa Ziploc Transparente", categoria:"plastico", medida:"20x25 cm",    material:"LDPE",            calibre:"150", tintas:"1x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Troquel",    precio500:"$1.50",  precio1000:"$1.10",  precio3000:"$0.85",  imagen:"https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=200&q=80" },
//   { id:202, nombre:"Bolsa Camiseta HDPE",       categoria:"plastico", medida:"30x50 cm",    material:"Alta densidad",   calibre:"130", tintas:"2x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:true,  otro:"",           tipoAsa:"Cordel",            precio500:"$0.90",  precio1000:"$0.70",  precio3000:"$0.55",  imagen:"https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=200&q=80" },
//   { id:203, nombre:"Bolsa Courier",             categoria:"plastico", medida:"25x35 cm",    material:"BOPP",            calibre:"40", tintas:"1x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Perforado",  precio500:"$2.80",  precio1000:"$2.20",  precio3000:"$1.75",  imagen:"https://images.unsplash.com/photo-1585677980999-d6b2b7b1d8c0?w=200&q=80" },
//   { id:204, nombre:"Bolsa Arroz Laminada",      categoria:"plastico", medida:"20x35 cm",    material:"BOPP",            calibre:"35", tintas:"4x0", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           tipoLaminado:"Brillante",    precio500:"$3.90",  precio1000:"$3.10",  precio3000:"$2.50",  imagen:"https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=200&q=80" },
//   { id:301, nombre:"Caja Telescópica Blanca",   categoria:"carton",   medida:"20x15x8 cm",  material:"Cartón rígido",   calibre:"300 g",  tintas:"1x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           precio500:"$9.00",  precio1000:"$7.20",  precio3000:"$5.80",  imagen:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" },
//   { id:302, nombre:"Caja Automontable",         categoria:"carton",   medida:"15x10x6 cm",  material:"Microcanal",      calibre:"ECT-23", tintas:"4x0", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",           tipoLaminado:"Mate",         precio500:"$5.50",  precio1000:"$4.40",  precio3000:"$3.50",  imagen:"https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&q=80" },
//   { id:303, nombre:"Caja Madera Simulada",      categoria:"carton",   medida:"30x20x15 cm", material:"Cartón rígido",   calibre:"350 g",  tintas:"4x0", laminacion:true,  hs:true,  ar:false, textura:true,  uv:false, asa:false, otro:"Piel",      tipoLaminado:"Soft touch",   tipoTextura:"Piel cocodrilo", precio500:"$28.00", precio1000:"$22.00", precio3000:"$18.00", imagen:"https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=200&q=80" },
//   { id:304, nombre:"Display Mesa Corrugado",    categoria:"carton",   medida:"20x15x40 cm", material:"Corrugado doble", calibre:"ECT-32", tintas:"4x0", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Troquelado", tipoLaminado:"Brillante",    precio500:"$18.00", precio1000:"$14.00", precio3000:"$11.00", imagen:"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
//   { id:305, nombre:"Caja Vino Doble",           categoria:"carton",   medida:"18x9x32 cm",  material:"Cartón rígido",   calibre:"300 g",  tintas:"2x0", laminacion:true,  hs:true,  ar:false, textura:false, uv:false, asa:false, otro:"",           tipoLaminado:"Mate",         precio500:"$32.00", precio1000:"$26.00", precio3000:"$21.00", imagen:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" },
// ];

// interface Props {
//   grid?: boolean;
//   mob: boolean;
//   tab: boolean;
//   desk: boolean;
//   catalogo: Producto[];
//   expanded: Record<string, boolean>;
//   sistemaOpen: Record<string, boolean>;
//   addedId: number | null;
//   busquedaTick: number;
//   setBusquedaTick: React.Dispatch<React.SetStateAction<number>>;
//   toggleExp: (k: string) => void;
//   setSistemaOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
//   onDragStart: (e: React.DragEvent, id: number) => void;
//   onDragEnd: () => void;
//   addProd: (p: Producto) => void;
//   abrirEditar: (p: Producto) => void;
//   eliminarProd: (id: number) => void;
// }

// export default function Catalogo({
//   grid, mob, tab, desk, catalogo, expanded, sistemaOpen, addedId,
//   busquedaTick, setBusquedaTick, toggleExp, setSistemaOpen,
//   onDragStart, onDragEnd, addProd, abrirEditar, eliminarProd,
// }: Props) {
//   void busquedaTick; // solo fuerza re-render al buscar

//   return (
//     <div style={{ paddingBottom: mob ? 80 : 16 }}>
//       {CATS.map(cat => {
//         const ps    = catalogo.filter(p => p.categoria === cat.key);
//         const open  = expanded[cat.key];
//         const sOpen = sistemaOpen[cat.key];
//         const busq  = busquedaStore[cat.key]?.toLowerCase() || "";
//         const sPs   = SISTEMA_PRODS
//           .filter(p => p.categoria === cat.key)
//           .filter(p => !busq ||
//             p.nombre.toLowerCase().includes(busq) ||
//             p.medida.toLowerCase().includes(busq) ||
//             p.material.toLowerCase().includes(busq)
//           );
//         const totalSistema = SISTEMA_PRODS.filter(p => p.categoria === cat.key).length;

//         return (
//           <div key={cat.key} style={{ marginBottom: 2 }}>

//             {/* ── Header categoría ── */}
//             <button
//               onClick={() => toggleExp(cat.key)}
//               style={{ width:"100%", background:"#171717", border:"none", borderBottom:`1px solid ${cat.color}33`, cursor:"pointer", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}
//             >
//               <div style={{ display:"flex", alignItems:"center", gap:8 }}>
//                 <span style={{ fontSize:14 }}>{cat.emoji}</span>
//                 <span style={{ color:cat.color, fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase" }}>{cat.label}</span>
//                 <span style={{ background:`${cat.color}22`, color:cat.color, fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:10, border:`1px solid ${cat.color}44` }}>{ps.length}</span>
//               </div>
//               <span style={{ color:cat.color, fontSize:11 }}>{open ? "▲" : "▼"}</span>
//             </button>

//             {/* ── Productos propios ── */}
//             {open && (
//               <div style={{ padding:"6px 8px", display:"grid", gridTemplateColumns: grid ? "1fr 1fr" : "1fr", gap:6 }}>
//                 {ps.map(p => (
//                   <div
//                     key={p.id}
//                     className="pcard"
//                     style={{ background:"#1E1E1E", border:"1px solid #333", borderRadius:8, padding:8, display:"flex", flexDirection: grid ? "column" : "row", gap:8, cursor: mob ? "pointer" : "grab", userSelect:"none", position:"relative" }}
//                     draggable={!mob}
//                     onDragStart={e => !mob && onDragStart(e, p.id)}
//                     onDragEnd={onDragEnd}
//                     onClick={() => (mob || tab) && addProd(p)}
//                   >
//                     <img
//                       src={p.imagen || "https://via.placeholder.com/48x48/333/666?text=EB"}
//                       alt={p.nombre}
//                       style={{ width: grid ? "100%" : 46, height: grid ? 72 : 46, objectFit:"cover", borderRadius:5, flexShrink:0, border:"1px solid #333" }}
//                     />
//                     <div style={{ flex:1, minWidth:0 }}>
//                       <div style={{ color:"#EEE", fontSize:11, fontWeight:600, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace: grid ? "normal" : "nowrap" }}>{p.nombre}</div>
//                       <div style={{ color:cat.color, fontSize:9, margin:"2px 0 4px" }}>{p.medida}</div>
//                       <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
//                         {([["500", p.precio500], ["1k", p.precio1000], ["3k", p.precio3000]] as const).map(([l, v]) => (
//                           <div key={l} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
//                             <span style={{ color:"#555", fontSize:7.5, textTransform:"uppercase" }}>{l}</span>
//                             <span style={{ color:"#C9922A", fontSize:10.5, fontWeight:700 }}>{v}</span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                     {(mob || tab) && (
//                       <div style={{ position:"absolute", top:6, right:6, background: addedId === p.id ? "#22C55E" : "#C9922A", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", color:"#FFF", fontSize: addedId === p.id ? 12 : 14, fontWeight:700, transition:"background .2s" }}>
//                         {addedId === p.id ? "✓" : "+"}
//                       </div>
//                     )}
//                     {desk && <span style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", color:"#444", fontSize:13 }}>⠿</span>}
//                     <div className="pcard-actions" style={{ position:"absolute", bottom:6, right:6, display:"flex", gap:4 }}>
//                       <button onClick={e => { e.stopPropagation(); abrirEditar(p); }} style={{ background:"#2A2A2A", border:"1px solid #444", color:"#C9922A", width:22, height:22, borderRadius:4, cursor:"pointer", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>✎</button>
//                       <button onClick={e => { e.stopPropagation(); if (confirm(`¿Eliminar "${p.nombre}"?`)) eliminarProd(p.id); }} style={{ background:"#2A2A2A", border:"1px solid #444", color:"#888", width:22, height:22, borderRadius:4, cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* ── Del sistema ── */}
//             {open && (
//               <div style={{ margin:"0 8px 8px", borderRadius:8, border:"1px solid #222", overflow:"hidden" }}>
//                 <button
//                   onClick={() => setSistemaOpen(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
//                   style={{ width:"100%", background:"#141414", border:"none", padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}
//                 >
//                   <div style={{ display:"flex", alignItems:"center", gap:7 }}>
//                     <span style={{ fontSize:11 }}>🗂</span>
//                     <span style={{ color:"#555", fontSize:10, fontWeight:600, letterSpacing:.8, textTransform:"uppercase" }}>Del sistema</span>
//                     <span style={{ background:"#1E1E1E", color:"#555", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:8, border:"1px solid #2A2A2A" }}>{totalSistema}</span>
//                   </div>
//                   <span style={{ color:"#444", fontSize:10 }}>{sOpen ? "▲" : "▼"}</span>
//                 </button>

//                 {sOpen && (
//                   <div style={{ background:"#0D0D0D" }}>
//                     {/* Buscador */}
//                     <div style={{ padding:"8px 10px 4px" }}>
//                       <div style={{ position:"relative" }}>
//                         <span style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", fontSize:11, color:"#444", pointerEvents:"none" }}>🔍</span>
//                         <input
//                           key={`busq-${cat.key}`}
//                           defaultValue={busquedaStore[cat.key] || ""}
//                           onChange={e => { busquedaStore[cat.key] = e.target.value; setBusquedaTick(t => t + 1); }}
//                           placeholder="Buscar producto..."
//                           style={{ width:"100%", background:"#1A1A1A", border:"1px solid #2A2A2A", borderRadius:6, padding:"6px 28px 6px 26px", color:"#DDD", fontSize:11, outline:"none", fontFamily:"'Inter',sans-serif" }}
//                         />
//                         {busquedaStore[cat.key] && (
//                           <button
//                             onClick={() => { busquedaStore[cat.key] = ""; setBusquedaTick(t => t + 1); }}
//                             style={{ position:"absolute", right:7, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:13, lineHeight:1 }}
//                           >✕</button>
//                         )}
//                       </div>
//                     </div>

//                     <div style={{ maxHeight:260, overflowY:"auto", padding:"4px 8px 8px" }}>
//                       {sPs.length === 0
//                         ? <div style={{ color:"#444", fontSize:11, textAlign:"center", padding:"16px 0" }}>Sin resultados</div>
//                         : sPs.map(p => (
//                           <div
//                             key={p.id}
//                             className="pcard"
//                             style={{ background:"#171717", border:"1px solid #222", borderRadius:7, padding:"7px 8px", display:"flex", gap:8, cursor: mob ? "pointer" : "grab", userSelect:"none", position:"relative", marginBottom:5 }}
//                             draggable={!mob}
//                             onDragStart={e => !mob && onDragStart(e, p.id)}
//                             onDragEnd={onDragEnd}
//                             onClick={() => (mob || tab) && addProd(p)}
//                           >
//                             <img src={p.imagen} alt={p.nombre} style={{ width:38, height:38, objectFit:"cover", borderRadius:4, flexShrink:0, border:"1px solid #222" }} />
//                             <div style={{ flex:1, minWidth:0 }}>
//                               <div style={{ color:"#BBB", fontSize:10.5, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nombre}</div>
//                               <div style={{ color:"#444", fontSize:9, margin:"1px 0 3px" }}>{p.medida} · {p.material}</div>
//                               <div style={{ display:"flex", gap:8 }}>
//                                 {([["500", p.precio500], ["1k", p.precio1000], ["3k", p.precio3000]] as const).map(([l, v]) => (
//                                   <div key={l} style={{ display:"flex", gap:3, alignItems:"baseline" }}>
//                                     <span style={{ color:"#444", fontSize:7.5, textTransform:"uppercase" }}>{l}</span>
//                                     <span style={{ color:"#C9922A", fontSize:10, fontWeight:700 }}>{v}</span>
//                                   </div>
//                                 ))}
//                               </div>
//                             </div>
//                             {(mob || tab) && (
//                               <div style={{ position:"absolute", top:5, right:5, background: addedId === p.id ? "#22C55E" : "#2A2A2A", border:`1px solid ${addedId === p.id ? "#22C55E" : "#333"}`, borderRadius:"50%", width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", color: addedId === p.id ? "#FFF" : "#C9922A", fontSize: addedId === p.id ? 10 : 12, fontWeight:700, transition:"all .2s" }}>
//                                 {addedId === p.id ? "✓" : "+"}
//                               </div>
//                             )}
//                             {desk && <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", color:"#333", fontSize:11 }}>⠿</span>}
//                           </div>
//                         ))
//                       }
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// }