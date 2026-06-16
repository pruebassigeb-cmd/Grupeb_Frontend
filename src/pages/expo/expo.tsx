import { useState, useEffect } from "react";

interface Producto {
  id: number; nombre: string; categoria: "papel" | "plastico" | "carton";
  medida: string; material: string; calibre: string; tintas: string;
  laminacion: boolean; hs: boolean; ar: boolean; textura: boolean; uv: boolean; asa: boolean; otro: string;
  precio500: string; precio1000: string; precio3000: string; imagen: string;
}
interface FilaProducto { uid: string; producto: Producto; precio1: string; precio2: string; precio3: string; }

const PRODS: Producto[] = [
  { id:1,  nombre:"Bolsa Kraft Boutique",  categoria:"papel",    medida:"20x10x30 cm", material:"Kraft natural",    calibre:"90 g",    tintas:"1/0", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:true,  otro:"",              precio500:"$4.80",  precio1000:"$3.90",  precio3000:"$3.20",  imagen:"https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&q=80" },
  { id:7,  nombre:"Sobre Joya",            categoria:"papel",    medida:"10x7 cm",     material:"Couché",           calibre:"350 g",   tintas:"4/4", laminacion:true,  hs:true,  ar:false, textura:false, uv:false, asa:false, otro:"Hotst. dorado", precio500:"$1.20",  precio1000:"$0.90",  precio3000:"$0.70",  imagen:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&q=80" },
  { id:8,  nombre:"Caja Alimentos",        categoria:"papel",    medida:"22x15x5 cm",  material:"Kraft food-grade", calibre:"300 g",   tintas:"2/0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Barniz acuoso", precio500:"$5.60",  precio1000:"$4.40",  precio3000:"$3.50",  imagen:"https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=200&q=80" },
  { id:9,  nombre:"Bolsa Papel Asa Plana", categoria:"papel",    medida:"15x8x20 cm",  material:"Couché mate",      calibre:"150 g",   tintas:"4/4", laminacion:true,  hs:false, ar:false, textura:false, uv:true,  asa:true,  otro:"",              precio500:"$6.00",  precio1000:"$4.80",  precio3000:"$3.80",  imagen:"https://images.unsplash.com/photo-1589365278144-c9e705f843ba?w=200&q=80" },
  { id:3,  nombre:"Bolsa Biodegradable",   categoria:"plastico", medida:"30x40 cm",    material:"PBAT biodeg.",     calibre:"45 mic",  tintas:"2/0", laminacion:false, hs:false, ar:true,  textura:true,  uv:false, asa:true,  otro:"",              precio500:"$2.10",  precio1000:"$1.70",  precio3000:"$1.30",  imagen:"https://images.unsplash.com/photo-1585677980999-d6b2b7b1d8c0?w=200&q=80" },
  { id:5,  nombre:"Bolsa Non-Woven",       categoria:"plastico", medida:"40x35x10 cm", material:"Non-woven",        calibre:"80 g/m²", tintas:"2/0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:true,  otro:"",              precio500:"$3.50",  precio1000:"$2.80",  precio3000:"$2.20",  imagen:"https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=200&q=80" },
  { id:11, nombre:"Bolsa Transparente PP", categoria:"plastico", medida:"25x35 cm",    material:"Polipropileno",    calibre:"60 mic",  tintas:"1/0", laminacion:false, hs:false, ar:false, textura:false, uv:false, asa:false, otro:"",              precio500:"$1.80",  precio1000:"$1.40",  precio3000:"$1.05",  imagen:"https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=200&q=80" },
  { id:2,  nombre:"Caja Rígida Premium",   categoria:"carton",   medida:"25x20x10 cm", material:"Cartón rígido",    calibre:"350 g",   tintas:"4/4", laminacion:true,  hs:true,  ar:false, textura:false, uv:true,  asa:false, otro:"",              precio500:"$18.50", precio1000:"$15.00", precio3000:"$12.00", imagen:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80" },
  { id:4,  nombre:"Estuche Hexagonal",     categoria:"carton",   medida:"Ø12x15 cm",   material:"Microcanal",       calibre:"275 g",   tintas:"4/0", laminacion:true,  hs:true,  ar:false, textura:false, uv:false, asa:false, otro:"",              precio500:"$22.00", precio1000:"$17.50", precio3000:"$14.00", imagen:"https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&q=80" },
  { id:6,  nombre:"Caja Corrugado Export", categoria:"carton",   medida:"40x30x25 cm", material:"Corrugado triple", calibre:"ECT-51",  tintas:"1/0", laminacion:false, hs:false, ar:true,  textura:false, uv:false, asa:false, otro:"",              precio500:"$8.20",  precio1000:"$6.50",  precio3000:"$5.10",  imagen:"https://images.unsplash.com/photo-1553413077-190dd305871c?w=200&q=80" },
  { id:10, nombre:"Display PDV",           categoria:"carton",   medida:"30x20x60 cm", material:"Corrugado doble",  calibre:"ECT-32",  tintas:"4/4", laminacion:true,  hs:false, ar:false, textura:false, uv:false, asa:false, otro:"Troquelado",    precio500:"$35.00", precio1000:"$28.00", precio3000:"$22.00", imagen:"https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=200&q=80" },
];
const CATS = [
  { key:"papel",    label:"Papel",    color:"#A0845C", emoji:"📄" },
  { key:"plastico", label:"Plástico", color:"#5C8FA0", emoji:"🧴" },
  { key:"carton",   label:"Cartón",   color:"#8A7A5C", emoji:"📦" },
] as const;

const uid = () => Math.random().toString(36).slice(2,9);
const FOLIO = `EP-${Math.floor(Math.random()*9000)+1000}`;
const TODAY = new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"});

export default function Expo() {
  const [filas,   setFilas]   = useState<FilaProducto[]>([]);
  const [cliente, setCliente] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [asesor,  setAsesor]  = useState("");
  const [coment,  setComent]  = useState("");
  const [dragId,  setDragId]  = useState<number|null>(null);
  const [over,    setOver]    = useState(false);
  const [cant1,   setCant1]   = useState("500");
  const [cant2,   setCant2]   = useState("1,000");
  const [cant3,   setCant3]   = useState("3,000");
  const [catOpen,    setCatOpen]    = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({papel:true,plastico:true,carton:true});
  const [w, setW] = useState(1200);

  useEffect(() => {
    const upd = () => setW(window.innerWidth);
    upd(); window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const mob = w < 640;
  const tab = w >= 640 && w < 1024;
  const desk = w >= 1024;

  const toggleExp = (k:string) => setExpanded(p => ({...p,[k]:!p[k]}));

  const onDragStart = (e:React.DragEvent, id:number) => { e.dataTransfer.setData("pid",String(id)); setDragId(id); };
  const onDragEnd   = () => setDragId(null);
  const onDrop = (e:React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const p = PRODS.find(x => x.id===Number(e.dataTransfer.getData("pid")));
    if(p) addProd(p);
  };
  const addProd = (p:Producto) => {
    setFilas(prev => [...prev, {uid:uid(), producto:p, precio1:p.precio500, precio2:p.precio1000, precio3:p.precio3000}]);
    if(mob || tab) setDrawerOpen(false);
  };
  const del  = (u:string) => setFilas(p => p.filter(f => f.uid!==u));
  const edit = (u:string, k:keyof FilaProducto, v:string) => setFilas(p => p.map(f => f.uid===u ? {...f,[k]:v} : f));
  const limpiar = () => { setFilas([]); setCliente(""); setEmpresa(""); setAsesor(""); setComent(""); };

  const empty = Math.max(0, 5-filas.length);

  // ─── estilos tabla ───────────────────────────────────────────────────────────
  const TH:  React.CSSProperties = {background:"#1A1A1A",color:"#EEE",  padding:"6px 4px 2px",textAlign:"center",fontSize:9, fontWeight:600,letterSpacing:.3};
  const TH2: React.CSSProperties = {background:"#1A1A1A",color:"#AAA",  padding:"2px 4px 6px",textAlign:"center",fontSize:8, fontWeight:500};
  const THD: React.CSSProperties = {...TH2,color:"#C9922A",fontWeight:700,fontSize:9.5};
  const TD:  React.CSSProperties = {padding:"6px 4px",textAlign:"center",verticalAlign:"middle",color:"#1A1A1A",borderBottom:"1px solid #EDE5D5",fontSize:9};
  const TDP: React.CSSProperties = {...TD,color:"#C9922A",fontWeight:700,fontSize:11};
  const TDL: React.CSSProperties = {...TD,textAlign:"left",paddingLeft:8,fontWeight:600,fontSize:9.5};
  const iC:  React.CSSProperties = {background:"transparent",border:"none",borderBottom:"1px solid #C9922A",color:"#C9922A",fontSize:10,fontWeight:700,width:"100%",textAlign:"center",outline:"none",fontFamily:"'Inter',sans-serif"};
  const iP:  React.CSSProperties = {background:"transparent",border:"none",borderBottom:"1px solid #C9922A",color:"#C9922A",fontSize:11,fontWeight:700,width:"100%",textAlign:"center",outline:"none",fontFamily:"'Inter',sans-serif",padding:"1px 0"};

  // ─── componente lista catálogo ────────────────────────────────────────────────
  const Catalogo = ({grid}:{grid?:boolean}) => (
    <div style={{paddingBottom:mob?80:16}}>
      {CATS.map(cat => {
        const ps = PRODS.filter(p => p.categoria===cat.key);
        const open = expanded[cat.key];
        return (
          <div key={cat.key} style={{marginBottom:2}}>
            <button onClick={()=>toggleExp(cat.key)}
              style={{width:"100%",background:"#171717",border:"none",borderBottom:`1px solid ${cat.color}33`,cursor:"pointer",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:14}}>{cat.emoji}</span>
                <span style={{color:cat.color,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>{cat.label}</span>
                <span style={{background:`${cat.color}22`,color:cat.color,fontSize:9,fontWeight:700,padding:"1px 7px",borderRadius:10,border:`1px solid ${cat.color}44`}}>{ps.length}</span>
              </div>
              <span style={{color:cat.color,fontSize:11}}>{open?"▲":"▼"}</span>
            </button>
            {open && (
              <div style={{padding:"6px 8px",display:"grid",gridTemplateColumns:grid?"1fr 1fr":"1fr",gap:6}}>
                {ps.map(p => (
                  <div key={p.id}
                    className={`pcard${dragId===p.id?" dragging":""}`}
                    style={{background:"#1E1E1E",border:"1px solid #333",borderRadius:8,padding:8,display:"flex",flexDirection:grid?"column":"row",gap:8,cursor:mob?"pointer":"grab",userSelect:"none",position:"relative"}}
                    draggable={!mob} 
                    onDragStart={e=>!mob&&onDragStart(e,p.id)} 
                    onDragEnd={onDragEnd}
                    onClick={()=>mob&&addProd(p)}
                  >
                    <img src={p.imagen} alt={p.nombre} style={{width:grid?"100%":46,height:grid?72:46,objectFit:"cover",borderRadius:5,flexShrink:0,border:"1px solid #333"}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:"#EEE",fontSize:11,fontWeight:600,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:grid?"normal":"nowrap"}}>{p.nombre}</div>
                      <div style={{color:cat.color,fontSize:9,margin:"2px 0 4px"}}>{p.medida}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {[["500",p.precio500],["1k",p.precio1000],["3k",p.precio3000]].map(([l,v])=>(
                          <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                            <span style={{color:"#555",fontSize:7.5,textTransform:"uppercase"}}>{l}</span>
                            <span style={{color:"#C9922A",fontSize:10.5,fontWeight:700}}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {mob && <div style={{position:"absolute",top:6,right:6,background:"#C9922A",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",color:"#1A1A1A",fontSize:14,fontWeight:700}}>+</div>}
                    {!mob && <span style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",color:"#444",fontSize:13}}>⠿</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── hoja de propuesta ────────────────────────────────────────────────────────
  const Hoja = () => (
    <div className="hoja" style={{width:"100%",background:"#F5EFE3",...(desk?{maxWidth:1050,borderRadius:8,boxShadow:"0 8px 40px rgba(0,0,0,.5)"}:{borderRadius:0})}}>

      {/* ── TOP ── */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":tab?"150px 1fr 140px":"200px 1fr 175px",background:"#F5EFE3"}}>

        {/* Columna negra — oculta en móvil */}
        {!mob && (
          <div style={{background:"#1A1A1A",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 12px 10px",borderBottom:"2px solid #C9922A"}}>
              <div style={{color:"#C9922A",fontSize:tab?28:36,fontWeight:700,lineHeight:1,fontFamily:"Georgia,serif"}}>EB</div>
              <div style={{color:"#FFF",fontSize:9,fontWeight:700,letterSpacing:1.5,marginTop:2}}>EUROBOLSA</div>
              <div style={{color:"#C9922A",fontSize:8,letterSpacing:1,marginTop:1}}>EMPACAMOS EXPERIENCIAS</div>
            </div>
            <div style={{flex:1,background:"linear-gradient(170deg,#2A2A2A,#111)",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"10px 12px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:tab?10:12,lineHeight:1.6,color:"#CCC",fontStyle:"italic"}}>
                Empaques que <span style={{color:"#C9922A"}}>destacan.</span><br/>
                Marcas que <span style={{color:"#C9922A"}}>inspiran.</span>
              </div>
              <div style={{width:20,height:2,background:"#C9922A",marginTop:6}}></div>
            </div>
          </div>
        )}

        {/* Centro */}
        <div style={{padding:mob?"12px 14px":"14px 18px 12px",borderRight:mob?"none":"1px solid #D4C9B8",display:"flex",flexDirection:"column",background:mob?"#1A1A1A":"transparent"}}>
          {mob ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{color:"#C9922A",fontSize:18,fontWeight:700,fontFamily:"Georgia,serif",lineHeight:1}}>EB · PROPUESTA</div>
                <div style={{color:"#888",fontSize:9,letterSpacing:1,marginTop:2}}>EUROBOLSA — EMPACAMOS EXPERIENCIAS</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#C9922A",fontSize:7,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>FOLIO</div>
                <div style={{color:"#FFF",fontSize:12,fontWeight:700}}>{FOLIO}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{fontFamily:"Georgia,serif",fontSize:tab?20:26,fontWeight:700,color:"#1A1A1A",lineHeight:1}}>PROPUESTA</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:tab?24:30,fontWeight:700,color:"#C9922A",lineHeight:1,marginTop:2}}>PERSONALIZADA</div>
              <div style={{width:36,height:3,background:"#C9922A",marginTop:6,marginBottom:14}}></div>
            </div>
          )}
          {/* Campos */}
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?12:8,marginTop:mob?12:"auto"}}>
            {[{lbl:"Cliente",val:cliente,set:setCliente},{lbl:"Empresa",val:empresa,set:setEmpresa},{lbl:"Asesor",val:asesor,set:setAsesor}].map(({lbl,val,set})=>(
              <div key={lbl} style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:mob?9:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:mob?"#C9922A":"#1A1A1A"}}>{lbl}</label>
                <input style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${mob?"#444":"#1A1A1A"}`,fontSize:mob?14:11,color:mob?"#FFF":"#1A1A1A",padding:"4px 0",outline:"none",fontFamily:"'Inter',sans-serif"}} value={val} onChange={e=>set(e.target.value)} placeholder="—"/>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <label style={{fontSize:mob?9:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:mob?"#C9922A":"#1A1A1A"}}>Fecha</label>
              <div style={{borderBottom:`1px solid ${mob?"#444":"#1A1A1A"}`,fontSize:mob?14:11,color:mob?"#EEE":"#1A1A1A",padding:"4px 0"}}>{TODAY}</div>
            </div>
          </div>
        </div>

        {/* Folio + servicios — solo desktop/tablet */}
        {!mob && (
          <div style={{padding:"12px 10px 12px 0",display:"flex"}}>
            <div style={{width:1,background:"#D4C9B8",margin:"0 8px 0 0",flexShrink:0}}></div>
            <div style={{flex:1}}>
              <div style={{color:"#C9922A",fontSize:8,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>FOLIO</div>
              <div style={{border:"1px solid #1A1A1A",borderRadius:3,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#1A1A1A",marginBottom:10}}>{FOLIO}</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {[["🛍","DESARROLLO\nDE RENDER"],["🏭","FABRICACIÓN\nNACIONAL"],["🛡","CONTROL\nDE CALIDAD"],["🚚","ENTREGA\nPROGRAMADA"]].map(([ic,txt],i,arr)=>(
                  <div key={txt as string} style={{display:"flex",alignItems:"flex-start",gap:5,paddingBottom:7,borderBottom:i===arr.length-1?"none":"1px solid #D4C9B8"}}>
                    <span style={{fontSize:tab?11:13,flexShrink:0}}>{ic}</span>
                    <div style={{fontSize:tab?7:8,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"#1A1A1A",lineHeight:1.3,whiteSpace:"pre-line"}}>{txt}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── COTIZACIÓN ── */}
      <div style={{borderTop:"1px solid #D4C9B8",padding:mob?"0 10px 6px":"0 14px 6px"}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#C9922A",padding:"8px 0 6px"}}>COTIZACIÓN</div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{width:mob?"680px":"100%",borderCollapse:"collapse",fontSize:9.5,tableLayout:"fixed"}}>
            <colgroup>
              <col style={{width:"14%"}}/><col style={{width:"8%"}}/><col style={{width:"7%"}}/><col style={{width:"5%"}}/>
              <col style={{width:"5%"}}/><col style={{width:"5.5%"}}/><col style={{width:"3.5%"}}/><col style={{width:"3.5%"}}/>
              <col style={{width:"4%"}}/><col style={{width:"3.5%"}}/><col style={{width:"3.5%"}}/><col style={{width:"5%"}}/>
              <col style={{width:"7%"}}/><col style={{width:"7%"}}/><col style={{width:"7%"}}/><col style={{width:"3%"}}/>
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} style={{...TH,textAlign:"left",paddingLeft:8}}>Producto</th>
                <th rowSpan={2} style={TH}>Medida</th>
                <th style={TH}>Material</th><th style={TH}>Tintas</th>
                <th colSpan={8} style={{...TH,color:"#C9922A",borderBottom:"1px solid #C9922A"}}>Acabados</th>
                <th colSpan={3} style={{...TH,color:"#C9922A",borderBottom:"1px solid #C9922A"}}>Precio unitario</th>
                <th rowSpan={2} style={TH} className="no-print"></th>
              </tr>
              <tr>
                <th style={TH2}></th><th style={TH2}></th>
                <th style={TH2}>Calibre</th><th style={TH2}>Laminación</th>
                <th style={TH2}>HS</th><th style={TH2}>AR</th><th style={TH2}>Textura</th>
                <th style={TH2}>Uv</th><th style={TH2}>Asa</th><th style={TH2}>Otro</th>
                <th key="c1" style={THD}><input value={cant1} onChange={e=>setCant1(e.target.value)} className="no-print-show" style={iC}/><span className="print-only" style={{color:"#C9922A",fontWeight:700,fontSize:10}}>{cant1}</span></th>
                <th key="c2" style={THD}><input value={cant2} onChange={e=>setCant2(e.target.value)} className="no-print-show" style={iC}/><span className="print-only" style={{color:"#C9922A",fontWeight:700,fontSize:10}}>{cant2}</span></th>
                <th key="c3" style={THD}><input value={cant3} onChange={e=>setCant3(e.target.value)} className="no-print-show" style={iC}/><span className="print-only" style={{color:"#C9922A",fontWeight:700,fontSize:10}}>{cant3}</span></th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const p=f.producto;
                const chk=(v:boolean)=><span style={{color:"#C9922A",fontWeight:700}}>{v?"✓":""}</span>;
                return (
                  <tr key={f.uid}>
                    <td style={TDL}>{p.nombre}</td><td style={TD}>{p.medida}</td><td style={TD}>{p.material}</td><td style={TD}>{p.tintas}</td>
                    <td style={TD}>{p.calibre}</td><td style={TD}>{chk(p.laminacion)}</td><td style={TD}>{chk(p.hs)}</td><td style={TD}>{chk(p.ar)}</td>
                    <td style={TD}>{chk(p.textura)}</td><td style={TD}>{chk(p.uv)}</td><td style={TD}>{chk(p.asa)}</td><td style={{...TD,fontSize:8}}>{p.otro}</td>
                    <td style={TDP}><input style={iP} value={f.precio1} onChange={e=>edit(f.uid,"precio1",e.target.value)}/></td>
                    <td style={TDP}><input style={iP} value={f.precio2} onChange={e=>edit(f.uid,"precio2",e.target.value)}/></td>
                    <td style={TDP}><input style={iP} value={f.precio3} onChange={e=>edit(f.uid,"precio3",e.target.value)}/></td>
                    <td style={TD} className="no-print">
                      <button onClick={()=>del(f.uid)} style={{background:"transparent",border:"1px solid #CCC",color:"#CCC",width:18,height:18,borderRadius:"50%",cursor:"pointer",fontSize:11,lineHeight:1,padding:0}}>×</button>
                    </td>
                  </tr>
                );
              })}
              {Array.from({length:empty}).map((_,i)=>(
                <tr key={`e${i}`}>{Array.from({length:16}).map((_,j)=><td key={j} style={{...TD,height:20}}></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Drop zone desktop + tablet */}
        {!mob && (
          <div className="drop-zone-el" style={{border:`1.5px dashed ${over?"#C9922A":"#D4C9B8"}`,borderRadius:6,padding:12,textAlign:"center",transition:"all .2s",margin:"4px 0",background:over?"rgba(201,146,42,.05)":"transparent"}}
            onDrop={onDrop} onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)}>
            <p style={{color:"#9A8E7F",fontSize:11}}>{over?"📋 Suelta aquí":"⬇ Arrastra productos del catálogo aquí"}</p>
          </div>
        )}
        {/* Botón solo móvil */}
        {mob && (
          <button onClick={()=>setDrawerOpen(true)} className="no-print"
            style={{width:"100%",margin:"8px 0 4px",background:"#1A1A1A",border:"1.5px dashed #C9922A",borderRadius:8,padding:"13px",color:"#C9922A",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
            + Agregar producto
          </button>
        )}
      </div>

      {/* COMENTARIOS */}
      <div style={{padding:mob?"4px 10px 12px":"4px 14px 12px",borderTop:"1px solid #D4C9B8"}}>
        <span style={{fontSize:9,fontWeight:700,color:"#C9922A",letterSpacing:1,textTransform:"uppercase",marginBottom:5,display:"block"}}>Comentarios:</span>
        <div style={{border:"1px solid #D4C9B8",borderRadius:5,padding:"6px 8px"}}>
          <textarea style={{width:"100%",background:"transparent",border:"none",outline:"none",fontFamily:"'Inter',sans-serif",fontSize:mob?13:10,color:"#1A1A1A",resize:"none",minHeight:mob?56:34}} value={coment} onChange={e=>setComent(e.target.value)} rows={2} placeholder="Notas, condiciones de entrega..."/>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{background:"#1A1A1A",borderTop:"2px solid #C9922A"}}>
        {!mob && (
          <div style={{padding:"7px 14px",borderBottom:"1px solid #2A2A2A",display:"flex",alignItems:"center"}}>
            <div style={{color:"#CCC",fontSize:7,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginRight:12,flexShrink:0}}>TODOS LOS PROCESOS DENTRO DE NUESTRA PLANTA</div>
            <div style={{display:"flex",gap:12,flex:1}}>
              {[["✏️","DISEÑO"],["🖨","IMPRESIÓN"],["✂️","SUAJE"],["🔧","PEGADO"],["📦","ENSAMBLE"],["⭐","ACABADOS\nESPECIALES"]].map(([ic,txt])=>(
                <div key={txt as string} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:13}}>{ic}</span>
                  <p style={{color:"#888",fontSize:6,textTransform:"uppercase",textAlign:"center",lineHeight:1.3,whiteSpace:"pre-line"}}>{txt}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"110px 1fr 1fr 1.4fr 1fr",padding:mob?"10px":"8px 14px",gap:mob?8:0,alignItems:"center"}}>
          <div style={{background:"#111",borderRadius:5,padding:"7px 6px",textAlign:"center",borderTop:"2px solid #C9922A",borderBottom:"2px solid #C9922A"}}>
            <div style={{color:"#C9922A",fontSize:mob?26:22,fontWeight:700,fontFamily:"Georgia,serif",lineHeight:1}}>+35</div>
            <div style={{color:"#888",fontSize:7,textTransform:"uppercase",letterSpacing:1,marginTop:1}}>AÑOS</div>
            <div style={{color:"#EEE",fontSize:7,fontWeight:700,textTransform:"uppercase",lineHeight:1.3,marginTop:3}}>CREANDO EMPAQUES QUE DESTACAN</div>
          </div>
          {!mob && [["DESCARGA NUESTRO CATÁLOGO DIGITAL","QR"],["CONTÁCTANOS POR WHATSAPP","QR"]].map(([lbl,qr])=>(
            <div key={lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"0 8px"}}>
              <div style={{color:"#CCC",fontSize:6.5,fontWeight:700,textTransform:"uppercase",textAlign:"center",lineHeight:1.3}}>{lbl}</div>
              <div style={{width:40,height:40,background:"#FFF",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,color:"#333",fontWeight:700}}>{qr}</div>
            </div>
          ))}
          <div style={{padding:mob?"4px 0":"0 10px",borderLeft:mob?"none":"1px solid #333"}}>
            <div style={{color:"#C9922A",fontSize:mob?13:11,fontWeight:700,fontFamily:"Georgia,serif",marginBottom:2}}>GRUPO EB</div>
            <div style={{color:"#888",fontSize:mob?10:7,lineHeight:1.5}}>Especialistas en el desarrollo y fabricación de soluciones de empaque para marcas que buscan destacar.</div>
          </div>
          <div style={{padding:mob?"0":"0 8px",borderLeft:mob?"none":"1px solid #333",display:"flex",flexDirection:mob?"row":"column",gap:mob?10:4,flexWrap:"wrap"}}>
            {[["🌐","grupeeb.com",true],["📸","/grupoeuropobolsa",false],["📘","/grupoeuropobolsa",false],["💼","/grupoeuropobolsa",false]].map(([ic,txt,gold])=>(
              <div key={txt as string} style={{display:"flex",alignItems:"center",gap:4,color:"#AAA",fontSize:mob?10:8}}>
                <span>{ic}</span><span style={gold?{color:"#C9922A",fontWeight:700}:{}}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#2A2A2A;font-family:'Inter',sans-serif;}
        input::placeholder{color:#BBB;}
        .pcard:hover{border-color:#C9922A!important;background:#252525!important;}
        .pcard.dragging{opacity:.25;}
        /* Drawer móvil */
        .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;transition:opacity .25s;}
        .drawer{position:fixed;bottom:0;left:0;right:0;background:#111;z-index:51;border-radius:16px 16px 0 0;max-height:75vh;overflow-y:auto;transition:transform .3s ease;}
        .drawer.open{transform:translateY(0);}
        .drawer.closed{transform:translateY(100%);}
        /* Cat colapsable desktop */
        .cat-desk{transition:width .25s ease;overflow:hidden;flex-shrink:0;}
        .cat-desk.open{width:290px;}
        .cat-desk.closed{width:40px;}
        .print-only{display:none;}
        @media print{
          @page{size:landscape;margin:0;}
          body{background:white!important;}
          .no-print{display:none!important;}
          .right-col{height:auto!important;overflow:visible!important;padding:0!important;background:white!important;display:block!important;}
          .hoja{max-width:100%!important;border-radius:0!important;box-shadow:none!important;}
          .drop-zone-el{display:none!important;}
          .drawer,.drawer-overlay,.cat-desk,.mob-bar{display:none!important;}
          .no-print-show{display:none!important;}
          .print-only{display:inline!important;}
          input{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        }
      `}</style>

      {/* ══ MÓVIL ════════════════════════════════════════════════════════════ */}
      {mob && (
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:"#1A1A1A"}}>
          {/* Barra superior */}
          <div className="mob-bar no-print" style={{background:"#111",borderBottom:"2px solid #C9922A",padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{color:"#C9922A",fontSize:22,fontWeight:700,fontFamily:"Georgia,serif"}}>EB</div>
              <div>
                <div style={{color:"#FFF",fontSize:11,fontWeight:700}}>EUROBOLSA</div>
                <div style={{color:"#666",fontSize:9}}>Cotizador Expo</div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={limpiar} style={{background:"transparent",border:"1px solid #444",color:"#AAA",fontSize:11,fontWeight:600,padding:"7px 12px",borderRadius:6,cursor:"pointer"}}>Limpiar</button>
              <button onClick={()=>window.print()} style={{background:"#C9922A",border:"none",color:"#1A1A1A",fontSize:11,fontWeight:700,padding:"7px 14px",borderRadius:6,cursor:"pointer"}}>🖨 PDF</button>
            </div>
          </div>
          {/* Contenido */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 0"}}>
            <Hoja/>
          </div>
          {/* Drawer catálogo */}
          {drawerOpen && <div className="drawer-overlay" onClick={()=>setDrawerOpen(false)}/>}
          <div className={`drawer ${drawerOpen?"open":"closed"}`}>
            <div style={{padding:"14px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #222",position:"sticky",top:0,background:"#111",zIndex:1}}>
              <div style={{color:"#C9922A",fontSize:13,fontWeight:700,letterSpacing:1}}>SELECCIONA UN PRODUCTO</div>
              <button onClick={()=>setDrawerOpen(false)} style={{background:"#2A2A2A",border:"none",color:"#AAA",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
            <Catalogo grid={true}/>
          </div>
          {/* FAB catálogo */}
          <div className="no-print" style={{position:"fixed",bottom:20,right:20,zIndex:40}}>
            <button onClick={()=>setDrawerOpen(true)} style={{background:"#C9922A",border:"none",color:"#1A1A1A",width:52,height:52,borderRadius:"50%",cursor:"pointer",fontSize:22,fontWeight:700,boxShadow:"0 4px 20px rgba(201,146,42,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
        </div>
      )}

      {/* ══ TABLET ═══════════════════════════════════════════════════════════ */}
      {tab && (
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:"#2A2A2A"}}>
          {/* Topbar */}
          <div className="no-print" style={{background:"#111",borderBottom:"2px solid #C9922A",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{color:"#C9922A",fontSize:24,fontWeight:700,fontFamily:"Georgia,serif"}}>EB</div>
              <div>
                <div style={{color:"#FFF",fontSize:12,fontWeight:700,letterSpacing:1}}>EUROBOLSA</div>
                <div style={{color:"#666",fontSize:9,letterSpacing:.5}}>Cotizador Expo</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={limpiar} style={{background:"transparent",border:"1px solid #555",color:"#AAA",fontSize:12,fontWeight:600,padding:"8px 16px",borderRadius:6,cursor:"pointer"}}>Limpiar</button>
              <button onClick={()=>window.print()} style={{background:"#C9922A",border:"none",color:"#1A1A1A",fontSize:12,fontWeight:700,padding:"8px 18px",borderRadius:6,cursor:"pointer"}}>🖨 Imprimir / PDF</button>
            </div>
          </div>
          {/* Hoja con padding */}
          <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
            <Hoja/>
          </div>
          {/* Drawer desde abajo */}
          {drawerOpen && <div className="drawer-overlay" onClick={()=>setDrawerOpen(false)}/>}
          <div className={`drawer ${drawerOpen?"open":"closed"}`} style={{maxHeight:"65vh"}}>
            <div style={{padding:"14px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #222",position:"sticky",top:0,background:"#111",zIndex:1}}>
              <div style={{color:"#C9922A",fontSize:13,fontWeight:700,letterSpacing:1}}>CATÁLOGO — TAP PARA AGREGAR</div>
              <button onClick={()=>setDrawerOpen(false)} style={{background:"#2A2A2A",border:"none",color:"#AAA",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:16}}>✕</button>
            </div>
            <Catalogo grid={true}/>
          </div>
          <div className="no-print" style={{position:"fixed",bottom:24,right:24,zIndex:40}}>
            <button onClick={()=>setDrawerOpen(true)} style={{background:"#C9922A",border:"none",color:"#1A1A1A",width:56,height:56,borderRadius:"50%",cursor:"pointer",fontSize:24,fontWeight:700,boxShadow:"0 4px 20px rgba(201,146,42,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
          </div>
        </div>
      )}

      {/* ══ DESKTOP ═══════════════════════════════════════════════════════════ */}
      {desk && (
        <div style={{display:"flex",minHeight:"100vh"}}>
          {/* Sidebar colapsable */}
          <aside className={`cat-desk no-print ${catOpen?"open":"closed"}`} style={{background:"#111",borderRight:"2px solid #222",height:"100vh",position:"sticky",top:0,display:"flex",flexDirection:"column"}}>
            <button onClick={()=>setCatOpen(v=>!v)} style={{width:"100%",background:"#1A1A1A",border:"none",borderBottom:"2px solid #C9922A",color:"#C9922A",cursor:"pointer",padding:"13px 0",display:"flex",alignItems:"center",justifyContent:catOpen?"space-between":"center",paddingLeft:catOpen?16:0,paddingRight:catOpen?12:0,flexShrink:0}}>
              {catOpen && <span style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase"}}>Catálogo</span>}
              <span style={{fontSize:15}}>{catOpen?"◀":"▶"}</span>
            </button>
            <div style={{overflowY:"auto",flex:1,opacity:catOpen?1:0,transition:"opacity .2s",pointerEvents:catOpen?"auto":"none",width:290}}>
              <Catalogo/>
            </div>
          </aside>
          {/* Right */}
          <div className="right-col" style={{flex:1,overflowY:"auto",height:"100vh",padding:20,background:"#2A2A2A",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div className="no-print" style={{display:"flex",gap:10,width:"100%",maxWidth:1050,justifyContent:"flex-end"}}>
              <button onClick={limpiar} style={{background:"transparent",border:"1px solid #555",color:"#AAA",fontSize:12,fontWeight:600,padding:"8px 18px",borderRadius:6,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Limpiar</button>
              <button onClick={()=>window.print()} style={{background:"#C9922A",border:"none",color:"#1A1A1A",fontSize:12,fontWeight:700,padding:"8px 20px",borderRadius:6,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>🖨 Imprimir / PDF</button>
            </div>
            <Hoja/>
          </div>
        </div>
      )}
    </>
  );
}