// import { useState, useEffect, useCallback, useRef } from "react";
// import {
//   CATS, CLIENTE_VACIO, filaDesdeProducto,
//   generarFolio, sumarTotales,
// } from "../../types/expo/expo.types";
// import type { Producto, FilaProducto, ClienteExpo, CotizacionGuardada, ItemPedidoAprobado } from "../../types/expo/expo.types";

// import RegistroCliente   from "../../components/expo/RegistroCliente";
// import Catalogo          from "../../components/expo/Catalogo";
// import ModalProducto     from "../../components/expo/ModalProducto";
// import HojaCotizacion    from "../../components/expo/HojaCotizacion";
// import ListaCotizaciones from "../../components/expo/ListaCotizaciones";

// // ─── Mock inicial del catálogo propio (temporal, sin DB) ──────────────────────
// const CATALOGO_INICIAL: Producto[] = [
//   { id:1,  nombre:"Bolsa Kraft Boutique",  categoria:"papel",    medida:"20x10x30 cm", material:"Kraft natural",    calibre:"90 g",    tintas:"1x0", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:true,  otro:"",              tipoLaminado:"Mate",       tipoAsa:"Cordel",            precio500:"$4.80",  precio1000:"$3.90",  precio3000:"$3.20",  imagen:"https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&q=80" },
//   { id:7,  nombre:"Sobre Joya",            categoria:"papel",    medida:"10x7 cm",     material:"Couché",           calibre:"350 g",   tintas:"4x4", laminacion:true,  hs:true,  ar:false, textura:false, uv:false, asa:false, otro:"Hotst. dorado",  tipoLaminado:"Brillante",                               precio500:"$1.20",  precio1000:"$0.90",  precio3000:"$0.70",  imagen:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80" },
//   { id:8,  nombre:"Caja Alimentos",        categoria:"papel",    medida:"22x15x5 cm",  material:"Kraft food-grade", calibre:"300 g",   tintas:"2x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Barniz acuoso",                                               precio500:"$5.60",  precio1000:"$4.40",  precio3000:"$3.50",  imagen:"https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=200&q=80" },
//   { id:9,  nombre:"Bolsa Papel Asa Plana", categoria:"papel",    medida:"15x8x20 cm",  material:"Couché mate",      calibre:"150 g",   tintas:"4x4", laminacion:true,  hs:false, ar:false, textura:false, uv:true,  asa:true,  otro:"",               tipoLaminado:"Mate",       tipoAsa:"Listón satinado",   precio500:"$6.00",  precio1000:"$4.80",  precio3000:"$3.80",  imagen:"https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=200&q=80" },
//   { id:3,  nombre:"Bolsa Biodegradable",   categoria:"plastico", medida:"30x40 cm",    material:"PBAT biodeg.",     calibre:"45",  tintas:"2x0", laminacion:false, hs:false, ar:true,  textura:true,  uv:false, asa:true,  otro:"",               tipoTextura:"Piel cocodrilo", tipoAsa:"Cordel",         precio500:"$2.10",  precio1000:"$1.70",  precio3000:"$1.30",  imagen:"https://images.unsplash.com/photo-1585677980999-d6b2b7b1d8c0?w=200&q=80" },
//   { id:5,  nombre:"Bolsa Non-Woven",       categoria:"plastico", medida:"40x35x10 cm", material:"Non-woven",        calibre:"80 g/m²", tintas:"2x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:true,  otro:"",               tipoAsa:"Cordel",                                        precio500:"$3.50",  precio1000:"$2.80",  precio3000:"$2.20",  imagen:"https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=200&q=80" },
//   { id:11, nombre:"Bolsa Transparente PP", categoria:"plastico", medida:"25x35 cm",    material:"Polipropileno",    calibre:"60",  tintas:"1x0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",                                                              precio500:"$1.80",  precio1000:"$1.40",  precio3000:"$1.05",  imagen:"https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=200&q=80" },
//   { id:2,  nombre:"Caja Rígida Premium",   categoria:"carton",   medida:"25x20x10 cm", material:"Cartón rígido",    calibre:"350 g",   tintas:"4x4", laminacion:true,  hs:true,  ar:false, textura:false, uv:true,  asa:false, otro:"",               tipoLaminado:"Soft touch",                               precio500:"$18.50", precio1000:"$15.00", precio3000:"$12.00", imagen:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" },
//   { id:4,  nombre:"Estuche Hexagonal",     categoria:"carton",   medida:"Ø12x15 cm",   material:"Microcanal",       calibre:"275 g",   tintas:"4x0", laminacion:true,  hs:true,  ar:false, textura:false, uv:false, asa:false, otro:"",               tipoLaminado:"Brillante",                                precio500:"$22.00", precio1000:"$17.50", precio3000:"$14.00", imagen:"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
//   { id:6,  nombre:"Caja Corrugado Export", categoria:"carton",   medida:"40x30x25 cm", material:"Corrugado triple", calibre:"ECT-51",  tintas:"1x0", laminacion:false, hs:false, ar:true,  textura:false, uv:false, asa:false, otro:"",                                                              precio500:"$8.20",  precio1000:"$6.50",  precio3000:"$5.10",  imagen:"https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&q=80" },
//   { id:10, nombre:"Display PDV",           categoria:"carton",   medida:"30x20x60 cm", material:"Corrugado doble",  calibre:"ECT-32",  tintas:"4x4", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Troquelado",     tipoLaminado:"Mate",                                     precio500:"$35.00", precio1000:"$28.00", precio3000:"$22.00", imagen:"https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=200&q=80" },
// ];

// export default function Expo() {
//   // ─── Estado principal ─────────────────────────────────────────────────────
//   const [filas,    setFilas]    = useState<FilaProducto[]>([]);
//   const [vista,    setVista]    = useState<"registro" | "cotizacion">("registro");
//   const [catalogo, setCatalogo] = useState<Producto[]>(CATALOGO_INICIAL);

//   const [cotizaciones, setCotizaciones] = useState<CotizacionGuardada[]>([]);
//   const [listaAbierta, setListaAbierta] = useState(false);
//   const [folioActual, setFolioActual] = useState(generarFolio());

//   // Cliente
//   const [clienteData,     setClienteData]     = useState<ClienteExpo>(CLIENTE_VACIO);
//   const [clienteGuardado, setClienteGuardado] = useState<ClienteExpo | null>(null);
//   const [clientes,        setClientes]        = useState<ClienteExpo[]>([]);

//   // Campos de la cotización
//   const [cliente, setCliente] = useState("");
//   const [coment,  setComent]  = useState("");
//   const [cant1,   setCant1]   = useState("500");
//   const [cant2,   setCant2]   = useState("1,000");
//   const [cant3,   setCant3]   = useState("3,000");

//   // UI
//   const [over,        setOver]        = useState(false);
//   const [catOpen,     setCatOpen]     = useState(true);
//   const [drawerOpen,  setDrawerOpen]  = useState(false);
//   const [expanded,    setExpanded]    = useState<Record<string, boolean>>({ papel:true, plastico:true, carton:true });
//   const [sistemaOpen, setSistemaOpen] = useState<Record<string, boolean>>({ papel:false, plastico:false, carton:false });
//   const [busquedaTick, setBusquedaTick] = useState(0);
//   const [addedId,     setAddedId]     = useState<number | null>(null);
//   const [w,           setW]           = useState(1200);

//   // Modal CRUD
//   const [modalOpen, setModalOpen] = useState(false);
//   const [editando,  setEditando]  = useState<Producto | null>(null);

//   // ─── Responsive ───────────────────────────────────────────────────────────
//   useEffect(() => {
//     const upd = () => setW(window.innerWidth);
//     upd();
//     window.addEventListener("resize", upd);
//     return () => window.removeEventListener("resize", upd);
//   }, []);
//   const mob  = w < 640;
//   const tab  = w >= 640 && w < 1024;
//   const desk = w >= 1024;

//   // ─── Catálogo ─────────────────────────────────────────────────────────────
//   const toggleExp = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

//   const abrirNuevo  = (cat: "papel" | "plastico" | "carton") => {
//     setEditando(null);
//     setModalOpen(true);
//     _modalCatInicial.current = cat;
//   };
//   const _modalCatInicial = useRef<"papel" | "plastico" | "carton">("papel");

//   const abrirEditar = (p: Producto) => {
//     setEditando(p);
//     setModalOpen(true);
//   };

//   const eliminarProd = (id: number) => {
//     setCatalogo(prev => prev.filter(p => p.id !== id));
//     setFilas(prev => prev.filter(f => f.producto.id !== id));
//   };

//   const guardarProd = (p: Producto) => {
//     if (editando) {
//       setCatalogo(prev => prev.map(x => x.id === p.id ? p : x));
//     } else {
//       setCatalogo(prev => [...prev, p]);
//     }
//     setModalOpen(false);
//     setEditando(null);
//   };

//   // ─── Drag & Drop ──────────────────────────────────────────────────────────
//   const onDragStart = (e: React.DragEvent, id: number) =>
//     e.dataTransfer.setData("pid", String(id));
//   const onDragEnd = () => {};
//   const onDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setOver(false);
//     const id = Number(e.dataTransfer.getData("pid"));
//     const p = catalogo.find(x => x.id === id);
//     if (p) addProd(p);
//   };

//   // ─── Agregar a cotización ─────────────────────────────────────────────────
//   const LIMITE_PRODUCTOS = 5;
//   const addProd = useCallback((p: Producto) => {
//     setFilas(prev => {
//       if (prev.length >= LIMITE_PRODUCTOS) {
//         alert(`Esta cotización ya tiene el máximo de ${LIMITE_PRODUCTOS} productos. Elimina uno para agregar otro.`);
//         return prev;
//       }
//       return [...prev, filaDesdeProducto(p)];
//     });
//     setAddedId(p.id);
//     setTimeout(() => setAddedId(null), 1000);
//   }, []);

//   // ─── Editar fila ──────────────────────────────────────────────────────────
//   const editFila = useCallback(
//     (uid: string, k: keyof FilaProducto, v: string | boolean) =>
//       setFilas(prev => prev.map(f => f.uid === uid ? { ...f, [k]: v } : f)),
//     [],
//   );
//   const editNombreProducto = useCallback(
//     (uid: string, nuevoNombre: string) =>
//       setFilas(prev => prev.map(f =>
//         f.uid === uid ? { ...f, producto: { ...f.producto, nombre: nuevoNombre } } : f
//       )),
//     [],
//   );
//   const delFila = useCallback(
//     (uid: string) => setFilas(p => p.filter(f => f.uid !== uid)),
//     [],
//   );
//   const limpiar = () => {
//     setFilas([]); setCliente(""); setComent("");
//     setFolioActual(generarFolio());
//   };

//   // ─── Guardar cotización ────────────────────────────────────────────────────
//   // NOTA: se usa `sumarTotales(filas)` al momento de guardar.
//   // `ListaCotizaciones` recalcula desde `cot.filas` para mayor robustez.
//   const guardarCotizacion = () => {
//     if (filas.length === 0) {
//       alert("Agrega al menos un producto antes de guardar la cotización.");
//       return;
//     }
//     if (!cliente.trim()) {
//       alert("Falta el nombre del cliente.");
//       return;
//     }
//     const nueva: CotizacionGuardada = {
//       id: `${Date.now()}`,
//       folio: folioActual,
//       origen: "expo",
//       cliente: cliente.trim(),
//       clienteData: clienteGuardado,
//       fecha: TODAY_NOW(),
//       estado: "cotizacion",
//       filas,
//       comentarios: coment,
//       total: sumarTotales(filas),
//     };
//     setCotizaciones(prev => [...prev, nueva]);
//     setFolioActual(generarFolio());
//     alert(`✅ Cotización ${nueva.folio} guardada. Puedes verla en "Cotizaciones".`);
//   };

//   const aprobarCotizacion = (id: string, items: ItemPedidoAprobado[]) => {
//     setCotizaciones(prev => prev.map(c =>
//       c.id === id ? { ...c, estado: "pedido", itemsAprobados: items } : c
//     ));
//   };

//   const TODAY_NOW = () => new Date().toLocaleDateString("es-MX", { day:"2-digit", month:"short", year:"numeric" });

//   // ─── Cliente ──────────────────────────────────────────────────────────────
//   const irACotizar = () => {
//     setClienteGuardado(clienteData);
//     setCliente(clienteData.nombre);
//     setVista("cotizacion");
//   };

//   // ─── Props compartidos ────────────────────────────────────────────────────
//   const propsCatalogo = {
//     mob, tab, desk, catalogo, expanded, sistemaOpen, addedId,
//     busquedaTick, setBusquedaTick, toggleExp, setSistemaOpen,
//     onDragStart, onDragEnd, addProd, abrirEditar, eliminarProd,
//   };

//   const propsHoja = {
//     filas, cliente, coment, folio: folioActual, cant1, cant2, cant3, mob, tab, desk, over,
//     catalogoPropio: catalogo,
//     setCliente, setComent, setCant1, setCant2, setCant3, setOver,
//     onDrop, onEdit: editFila, onDel: delFila,
//     onEditNombre: editNombreProducto,
//     onAbrirDrawer: () => setDrawerOpen(true),
//     onAgregarProducto: addProd,
//   };

//   // ─── Botones acción (desktop) ─────────────────────────────────────────────
//   // Botón "Guardar cotización": borde/texto dorado para mantener paleta EB.
//   const BotonesAccion = () => (
//     <div className="no-print" style={{ display:"flex", gap:10, width:"100%", maxWidth: desk ? 1100 : undefined, justifyContent:"flex-end" }}>
//       <button onClick={() => setVista("registro")}
//         style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:12, fontWeight:600, padding:"8px 14px", borderRadius:6, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
//         ← Cliente
//       </button>
//       <button onClick={limpiar}
//         style={{ background:"transparent", border:"1px solid #555", color:"#AAA", fontSize:12, fontWeight:600, padding:"8px 18px", borderRadius:6, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
//         Limpiar
//       </button>
//       {/* Guardar: dorado en vez de verde */}
//       <button onClick={guardarCotizacion}
//         style={{ background:"transparent", border:"1px solid #C9922A", color:"#C9922A", fontSize:12, fontWeight:700, padding:"8px 18px", borderRadius:6, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
//         💾 Guardar cotización
//       </button>
//       <button onClick={() => window.print()}
//         style={{ background:"#C9922A", border:"none", color:"#1A1A1A", fontSize:12, fontWeight:700, padding:"8px 20px", borderRadius:6, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
//         🖨 Imprimir / PDF
//       </button>
//     </div>
//   );

//   const DrawerHeader = ({ label }: { label: string }) => (
//     <div style={{ padding:"14px 16px 8px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid #222", position:"sticky", top:0, background:"#111", zIndex:1 }}>
//       <div style={{ color:"#C9922A", fontSize:13, fontWeight:700, letterSpacing:1 }}>
//         {label}
//         {filas.length > 0 && (
//           <span style={{ marginLeft:8, background:"#C9922A", color:"#1A1A1A", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:10 }}>
//             {filas.length} en cotización
//           </span>
//         )}
//       </div>
//       <button onClick={() => setDrawerOpen(false)} style={{ background:"#2A2A2A", border:"none", color:"#AAA", width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:16 }}>✕</button>
//     </div>
//   );

//   // Badge contador de cotizaciones — dorado en vez de verde
//   const BadgeContador = ({ size }: { size: number }) =>
//     cotizaciones.length > 0 ? (
//       <span style={{
//         position:"absolute", top: size === 44 ? -4 : size === 48 ? -4 : -5,
//         right: size === 44 ? -4 : size === 48 ? -4 : -5,
//         background:"#C9922A", color:"#0D0D0D",
//         fontSize: size === 44 ? 9 : size === 48 ? 10 : 10.5,
//         fontWeight:700, borderRadius:"50%",
//         width: size === 44 ? 17 : size === 48 ? 18 : 20,
//         height: size === 44 ? 17 : size === 48 ? 18 : 20,
//         display:"flex", alignItems:"center", justifyContent:"center",
//       }}>
//         {cotizaciones.length}
//       </span>
//     ) : null;

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
//         *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
//         body{background:#1A1A1A;font-family:'Inter',sans-serif;}
//         input::placeholder,textarea::placeholder{color:#444;}
//         input:focus,select:focus,textarea:focus{border-color:#C9922A!important;outline:none;}
//         .pcard{transition:border-color .15s,background .15s;-webkit-user-drag:element;}
//         .pcard:hover{border-color:#C9922A!important;background:#252525!important;}
//         .pcard:active{cursor:grabbing!important;}
//         .pcard[draggable="true"]:active{opacity:.5;}
//         .pcard-actions{opacity:0;transition:opacity .15s;}
//         .pcard:hover .pcard-actions{opacity:1;}
//         .pcard-actions button:hover{background:#C9922A!important;color:#1A1A1A!important;border-color:#C9922A!important;}
//         .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;}
//         .drawer{position:fixed;bottom:0;left:0;right:0;background:#111;z-index:51;border-radius:16px 16px 0 0;max-height:75vh;overflow-y:auto;transition:transform .3s ease;}
//         .drawer.open{transform:translateY(0);}
//         .drawer.closed{transform:translateY(100%);}
//         .cat-desk{transition:width .25s ease;overflow:hidden;flex-shrink:0;}
//         .cat-desk.open{width:290px;}
//         .cat-desk.closed{width:40px;}
//         .print-only{display:none;}
//         select option{background:#1A1A1A;color:#EEE;}
//         .hoja select{background:#F0E8D8;color:#1A1A1A;}
//         @media print{
//           @page{size:landscape;margin:0;}
//           body{background:white!important;}
//           .no-print{display:none!important;}
//           .right-col{height:auto!important;overflow:visible!important;padding:0!important;background:white!important;display:block!important;}
//           .hoja{max-width:100%!important;border-radius:0!important;box-shadow:none!important;}
//           .drop-zone-el{display:none!important;}
//           .drawer,.drawer-overlay,.cat-desk,.mob-bar{display:none!important;}
//           .no-print-show{display:none!important;}
//           .print-only{display:inline-block!important;font-size:9px!important;color:#1A1A1A!important;font-weight:600!important;font-family:'Inter',sans-serif!important;}
//           input,select{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
//         }
//       `}</style>

//       {/* ── REGISTRO ──────────────────────────────────────────────────────── */}
//       {vista === "registro" && (
//         <RegistroCliente
//           clienteData={clienteData}
//           setClienteData={setClienteData}
//           clienteGuardado={clienteGuardado}
//           clientes={clientes}
//           setClientes={setClientes}
//           mob={mob}
//           onCotizar={irACotizar}
//           onCerrar={() => setVista("cotizacion")}
//         />
//       )}

//       {/* ── COTIZADOR ─────────────────────────────────────────────────────── */}
//       {vista === "cotizacion" && (<>

//         {/* MÓVIL */}
//         {mob && (
//           <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#1A1A1A" }}>
//             <div className="mob-bar no-print" style={{ background:"#111", borderBottom:"2px solid #C9922A", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
//               <div style={{ display:"flex", alignItems:"center", gap:10 }}>
//                 <div style={{ color:"#C9922A", fontSize:22, fontWeight:700, fontFamily:"Georgia,serif" }}>EB</div>
//                 <div>
//                   <div style={{ color:"#FFF", fontSize:11, fontWeight:700 }}>EUROBOLSA</div>
//                   <div style={{ color:"#666", fontSize:9 }}>Cotizador Expo</div>
//                 </div>
//               </div>
//               <div style={{ display:"flex", gap:6 }}>
//                 <button onClick={() => setVista("registro")}
//                   style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:11, fontWeight:600, padding:"7px 9px", borderRadius:6, cursor:"pointer" }}>
//                   ← Cliente
//                 </button>
//                 <button onClick={limpiar}
//                   style={{ background:"transparent", border:"1px solid #444", color:"#AAA", fontSize:11, fontWeight:600, padding:"7px 9px", borderRadius:6, cursor:"pointer" }}>
//                   Limpiar
//                 </button>
//                 {/* Guardar: dorado */}
//                 <button onClick={guardarCotizacion}
//                   style={{ background:"transparent", border:"1px solid #C9922A", color:"#C9922A", fontSize:11, fontWeight:700, padding:"7px 9px", borderRadius:6, cursor:"pointer" }}>
//                   💾
//                 </button>
//                 <button onClick={() => window.print()}
//                   style={{ background:"#C9922A", border:"none", color:"#1A1A1A", fontSize:11, fontWeight:700, padding:"7px 12px", borderRadius:6, cursor:"pointer" }}>
//                   🖨 PDF
//                 </button>
//               </div>
//             </div>
//             <div style={{ flex:1, overflowY:"auto", padding:"12px 0" }}>
//               <HojaCotizacion {...propsHoja}/>
//             </div>
//             {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>}
//             <div className={`drawer ${drawerOpen ? "open" : "closed"}`}>
//               <DrawerHeader label="SELECCIONA UN PRODUCTO"/>
//               <Catalogo grid {...propsCatalogo}/>
//             </div>
//             <div className="no-print" style={{ position:"fixed", bottom:20, right:20, zIndex:40, display:"flex", flexDirection:"column", gap:10 }}>
//               <button onClick={() => setListaAbierta(true)} title="Ver cotizaciones"
//                 style={{ background:"#1A1A1A", border:"2px solid #C9922A", color:"#C9922A", width:44, height:44, borderRadius:"50%", cursor:"pointer", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,.5)", position:"relative" }}>
//                 📋
//                 <BadgeContador size={44}/>
//               </button>
//               <button onClick={() => setDrawerOpen(true)}
//                 style={{ background:"#C9922A", border:"none", color:"#1A1A1A", width:52, height:52, borderRadius:"50%", cursor:"pointer", fontSize:22, fontWeight:700, boxShadow:"0 4px 20px rgba(201,146,42,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                 +
//               </button>
//             </div>
//           </div>
//         )}

//         {/* TABLET */}
//         {tab && (
//           <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#2A2A2A" }}>
//             <div className="no-print" style={{ background:"#111", borderBottom:"2px solid #C9922A", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
//               <div style={{ display:"flex", alignItems:"center", gap:12 }}>
//                 <div style={{ color:"#C9922A", fontSize:24, fontWeight:700, fontFamily:"Georgia,serif" }}>EB</div>
//                 <div>
//                   <div style={{ color:"#FFF", fontSize:12, fontWeight:700, letterSpacing:1 }}>EUROBOLSA</div>
//                   <div style={{ color:"#666", fontSize:9, letterSpacing:.5 }}>Cotizador Expo</div>
//                 </div>
//               </div>
//               <div style={{ display:"flex", gap:10 }}>
//                 <button onClick={() => setVista("registro")}
//                   style={{ background:"transparent", border:"1px solid #333", color:"#888", fontSize:12, fontWeight:600, padding:"8px 14px", borderRadius:6, cursor:"pointer" }}>
//                   ← Cliente
//                 </button>
//                 <button onClick={limpiar}
//                   style={{ background:"transparent", border:"1px solid #555", color:"#AAA", fontSize:12, fontWeight:600, padding:"8px 16px", borderRadius:6, cursor:"pointer" }}>
//                   Limpiar
//                 </button>
//                 {/* Guardar: dorado */}
//                 <button onClick={guardarCotizacion}
//                   style={{ background:"transparent", border:"1px solid #C9922A", color:"#C9922A", fontSize:12, fontWeight:700, padding:"8px 16px", borderRadius:6, cursor:"pointer" }}>
//                   💾 Guardar
//                 </button>
//                 <button onClick={() => window.print()}
//                   style={{ background:"#C9922A", border:"none", color:"#1A1A1A", fontSize:12, fontWeight:700, padding:"8px 18px", borderRadius:6, cursor:"pointer" }}>
//                   🖨 Imprimir / PDF
//                 </button>
//               </div>
//             </div>
//             <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
//               <HojaCotizacion {...propsHoja}/>
//             </div>
//             {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>}
//             <div className={`drawer ${drawerOpen ? "open" : "closed"}`} style={{ maxHeight:"65vh" }}>
//               <DrawerHeader label="CATÁLOGO — TAP PARA AGREGAR"/>
//               <Catalogo grid {...propsCatalogo}/>
//             </div>
//             <div className="no-print" style={{ position:"fixed", bottom:24, right:24, zIndex:40, display:"flex", flexDirection:"column", gap:12 }}>
//               <button onClick={() => setListaAbierta(true)} title="Ver cotizaciones"
//                 style={{ background:"#1A1A1A", border:"2px solid #C9922A", color:"#C9922A", width:48, height:48, borderRadius:"50%", cursor:"pointer", fontSize:19, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,.5)", position:"relative" }}>
//                 📋
//                 <BadgeContador size={48}/>
//               </button>
//               <button onClick={() => setDrawerOpen(true)}
//                 style={{ background:"#C9922A", border:"none", color:"#1A1A1A", width:56, height:56, borderRadius:"50%", cursor:"pointer", fontSize:24, fontWeight:700, boxShadow:"0 4px 20px rgba(201,146,42,.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
//                 +
//               </button>
//             </div>
//           </div>
//         )}

//         {/* DESKTOP */}
//         {desk && (
//           <div style={{ display:"flex", minHeight:"100vh" }}>
//             {/* Sidebar catálogo */}
//             <aside className={`cat-desk no-print ${catOpen ? "open" : "closed"}`} style={{ background:"#111", borderRight:"2px solid #222", height:"100vh", position:"sticky", top:0, display:"flex", flexDirection:"column" }}>
//               <button
//                 onClick={() => setCatOpen(v => !v)}
//                 style={{ width:"100%", background:"#1A1A1A", border:"none", borderBottom:"2px solid #C9922A", color:"#C9922A", cursor:"pointer", padding:"13px 0", display:"flex", alignItems:"center", justifyContent: catOpen ? "space-between" : "center", paddingLeft: catOpen ? 16 : 0, paddingRight: catOpen ? 12 : 0, flexShrink:0 }}
//               >
//                 {catOpen && <span style={{ fontSize:11, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Catálogo</span>}
//                 <span style={{ fontSize:15 }}>{catOpen ? "◀" : "▶"}</span>
//               </button>
//               {catOpen && (
//                 <div style={{ padding:"8px 8px 4px", borderBottom:"1px solid #222", display:"flex", gap:6, flexShrink:0 }}>
//                   {CATS.map(c => (
//                     <button
//                       key={c.key}
//                       onClick={() => { setEditando(null); setModalOpen(true); _modalCatInicial.current = c.key as "papel" | "plastico" | "carton"; }}
//                       style={{ flex:1, background:`${c.color}18`, border:`1px solid ${c.color}44`, color:c.color, fontSize:9, fontWeight:700, padding:"5px 4px", borderRadius:5, cursor:"pointer", letterSpacing:.5 }}
//                     >
//                       {c.emoji} +{c.label}
//                     </button>
//                   ))}
//                 </div>
//               )}
//               <div style={{ overflowY:"auto", flex:1, opacity: catOpen ? 1 : 0, transition:"opacity .2s", pointerEvents: catOpen ? "auto" : "none", width:290 }}>
//                 <Catalogo {...propsCatalogo}/>
//               </div>
//             </aside>

//             {/* Área principal */}
//             <div className="right-col" style={{ flex:1, overflowY:"auto", height:"100vh", padding:20, background:"#2A2A2A", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
//               <BotonesAccion/>
//               <HojaCotizacion {...propsHoja}/>
//             </div>

//             {/* FAB cotizaciones — dorado */}
//             <div className="no-print" style={{ position:"fixed", bottom:24, right:24, zIndex:40 }}>
//               <button onClick={() => setListaAbierta(true)} title="Ver cotizaciones"
//                 style={{ background:"#1A1A1A", border:"2px solid #C9922A", color:"#C9922A", width:54, height:54, borderRadius:"50%", cursor:"pointer", fontSize:21, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 20px rgba(0,0,0,.5)", position:"relative" }}>
//                 📋
//                 <BadgeContador size={54}/>
//               </button>
//             </div>
//           </div>
//         )}
//       </>)}

//       {/* ── MODAL CRUD ────────────────────────────────────────────────────── */}
//       {modalOpen && (
//         <ModalProducto
//           editando={editando}
//           catInicial={_modalCatInicial.current}
//           onClose={() => { setModalOpen(false); setEditando(null); }}
//           onGuardar={guardarProd}
//         />
//       )}

//       {/* ── LISTA DE COTIZACIONES ─────────────────────────────────────────── */}
//       {listaAbierta && (
//         <ListaCotizaciones
//           cotizaciones={cotizaciones}
//           onAprobar={aprobarCotizacion}
//           onClose={() => setListaAbierta(false)}
//         />
//       )}
//     </>
//   );
// }