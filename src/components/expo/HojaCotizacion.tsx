// src/components/expo/HojaCotizacion.tsx
import {
  FilaTabla, FilaVacia,
  TH, TH2, THD, TD,
} from "./Tablacontroles";
import type { FilaProducto, Producto } from "../../types/expo/expo.types";
import { TODAY } from "../../types/expo/expo.types";
import type { Catalogs } from "../../types/papel/papel.types";
import type { FoilOpcion, TexturaOpcion } from "../../types/papel/cotizacion-papel.types";
import type { CatalogosPlastico } from "./Tablacontroles";
import type { PigmentoDB } from "./Tablacontroles";

interface Props {
  filas: FilaProducto[]; cliente: string; coment: string; folio: string;
  empresa: string;
  mob: boolean; tab: boolean; desk: boolean; over: boolean;
  catalogoPropio: Producto[];
  sistemaProductos: Producto[];
  catalogs:       Catalogs;
  foils:          FoilOpcion[];
  texturas:       TexturaOpcion[];
  catalogosPlast: CatalogosPlastico;
  pigmentosDB:    PigmentoDB[];
  coloresAsa:     { id: number; nombre: string }[];
  suajesPlast:    { id: number; tipo: string }[];
  asesor:         string;
  columnasPrecio: 1 | 2 | 3;
  setColumnasPrecio: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  setCliente:(v:string)=>void; setComent:(v:string)=>void;
  setOver:(v:boolean)=>void; onDrop:(e:React.DragEvent)=>void;
  onEdit:(uid:string, k:keyof FilaProducto, v:string|boolean|number|null)=>void;
  onEditNombre:(uid:string,nuevoNombre:string)=>void;
  onDel:(uid:string)=>void; onAbrirDrawer:()=>void;
  onAgregarProducto:(p:Producto)=>void;
}

function BotonColPrecio({ label, title, onClick, variante }: { label: string; title: string; onClick: () => void; variante: "add" | "remove" }) {
  const esAdd = variante === "add";
  return (
    <button
      className="no-print"
      onClick={onClick}
      title={title}
      style={{
        background: esAdd ? "#C9922A22" : "#88888822",
        border: `1px solid ${esAdd ? "#C9922A66" : "#88888866"}`,
        color: esAdd ? "#C9922A" : "#999",
        width: 14, height: 14, borderRadius: "50%",
        fontSize: 9, lineHeight: 1, cursor: "pointer", padding: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

export default function HojaCotizacion({
  filas,cliente,coment,folio,empresa,mob,tab,desk,over,catalogoPropio,sistemaProductos,
  catalogs, foils, texturas, catalogosPlast, pigmentosDB, coloresAsa, suajesPlast, asesor,
  columnasPrecio, setColumnasPrecio,
  setCliente,setComent,setOver,
  onDrop,onEdit,onEditNombre,onDel,onAbrirDrawer,onAgregarProducto,
}:Props){
  const LIMITE_PRODUCTOS = 5;
  const alcanzoLimite = filas.length >= LIMITE_PRODUCTOS;
  const filasVaciasBlanco = Math.max(0, LIMITE_PRODUCTOS - filas.length - (alcanzoLimite ? 0 : 1));

  const agregarColumnaPrecio = () => setColumnasPrecio(c => (c < 3 ? (c + 1) as 1 | 2 | 3 : c));
  const quitarColumnaPrecio = (columna: 2 | 3) => {
  if (columna === 3) {
    filas.forEach(f => {
      onEdit(f.uid, "precio3", "");
      onEdit(f.uid, "cant3", "");
      onEdit(f.uid, "precioCalculado3", "");
      onEdit(f.uid, "precioManual3", false);
    });
    setColumnasPrecio(2);
    return;
  }
  if (columnasPrecio === 3) {
    filas.forEach(f => {
      onEdit(f.uid, "precio2", f.precio3);
      onEdit(f.uid, "cant2", f.cant3);
      onEdit(f.uid, "precioCalculado2", f.precioCalculado3);
      onEdit(f.uid, "precioManual2", f.precioManual3);
      onEdit(f.uid, "precio3", "");
      onEdit(f.uid, "cant3", "");
      onEdit(f.uid, "precioCalculado3", "");
      onEdit(f.uid, "precioManual3", false);
    });
    setColumnasPrecio(2);
  } else {
    filas.forEach(f => {
      onEdit(f.uid, "precio2", "");
      onEdit(f.uid, "cant2", "");
      onEdit(f.uid, "precioCalculado2", "");
      onEdit(f.uid, "precioManual2", false);
    });
    setColumnasPrecio(1);
  }
};

  const totalCols = 12 + columnasPrecio;

  const dropProps = desk && !alcanzoLimite ? {
    onDrop,
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
  } : {};

  return(
    <div
      className="hoja"
      style={{
        width:"100%", background:"#F5EFE3", position:"relative",
        ...(desk ? { maxWidth:1100, borderRadius:8, boxShadow:"0 8px 40px rgba(0,0,0,.5)" } : { borderRadius:0 }),
        outline: over && desk ? "2px dashed #C9922A" : "2px dashed transparent",
        transition: "outline .15s",
      }}
      {...dropProps}
    >
      {over && desk && !alcanzoLimite && (
        <div style={{
          position:"absolute", inset:0, zIndex:10, borderRadius:8,
          background:"rgba(201,146,42,.06)",
          display:"flex", alignItems:"center", justifyContent:"center",
          pointerEvents:"none",
        }}>
          <div style={{
            background:"rgba(26,26,26,.9)", border:"2px dashed #C9922A",
            borderRadius:10, padding:"14px 32px",
            color:"#C9922A", fontSize:14, fontWeight:700, letterSpacing:.5,
          }}>
            📋 Suelta aquí para agregar
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":tab?"150px 1fr 140px":"200px 1fr 175px",background:"#F5EFE3"}}>

        {!mob&&(
          <div style={{background:"#1A1A1A",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"14px 12px 10px",borderBottom:"2px solid #C9922A"}}>
              <div style={{color:"#C9922A",fontSize:tab?28:36,fontWeight:700,lineHeight:1,fontFamily:"Georgia,serif"}}>EB</div>
              <div style={{color:"#FFF",fontSize:9,fontWeight:700,letterSpacing:1.5,marginTop:2}}>EUROBOLSA</div>
              <div style={{color:"#C9922A",fontSize:8,letterSpacing:1,marginTop:1}}>EMPACAMOS EXPERIENCIAS</div>
            </div>
            <div style={{flex:1,background:"linear-gradient(170deg,#2A2A2A,#111)",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"10px 12px"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:tab?10:12,lineHeight:1.6,color:"#CCC",fontStyle:"italic"}}>
                Empaques que <span style={{color:"#C9922A"}}>destacan.</span><br/>Marcas que <span style={{color:"#C9922A"}}>inspiran.</span>
              </div>
              <div style={{width:20,height:2,background:"#C9922A",marginTop:6}}/>
            </div>
          </div>
        )}

        <div style={{padding:mob?"12px 14px":"14px 18px 12px",borderRight:mob?"none":"1px solid #D4C9B8",display:"flex",flexDirection:"column",background:mob?"#1A1A1A":"transparent"}}>
          {mob?(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{color:"#C9922A",fontSize:18,fontWeight:700,fontFamily:"Georgia,serif",lineHeight:1}}>EB · PROPUESTA</div>
                <div style={{color:"#888",fontSize:9,letterSpacing:1,marginTop:2}}>EUROBOLSA — EMPACAMOS EXPERIENCIAS</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:"#C9922A",fontSize:7,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>FOLIO</div>
                <div style={{color:"#FFF",fontSize:12,fontWeight:700}}>{folio}</div>
              </div>
            </div>
          ):(
            <div>
              <div style={{fontFamily:"Georgia,serif",fontSize:tab?20:26,fontWeight:700,color:"#1A1A1A",lineHeight:1}}>PROPUESTA</div>
              <div style={{fontFamily:"Georgia,serif",fontSize:tab?24:30,fontWeight:700,color:"#C9922A",lineHeight:1,marginTop:2}}>PERSONALIZADA</div>
              <div style={{width:36,height:3,background:"#C9922A",marginTop:6,marginBottom:14}}/>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)",gap:mob?12:8,marginTop:mob?12:"auto"}}>
            {[
              {label:"Cliente", editable:true,  value:cliente, onChange:setCliente, placeholder:"—"},
              {label:"Empresa", editable:false, value: empresa || "—"},
              {label:"Asesor",  editable:false, value:asesor},
              {label:"Fecha",   editable:false, value:TODAY},
            ].map(({label,editable,value,onChange,placeholder})=>(
              <div key={label} style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:mob?9:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:mob?"#C9922A":"#1A1A1A"}}>{label}</label>
                {editable
                  ?<input style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${mob?"#444":"#1A1A1A"}`,fontSize:mob?14:11,color:mob?"#FFF":"#1A1A1A",padding:"4px 0",outline:"none",fontFamily:"'Inter',sans-serif"}} value={value} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder}/>
                  :<div style={{borderBottom:`1px solid ${mob?"#444":"#1A1A1A"}`,fontSize:mob?14:11,color:mob?"#EEE":"#1A1A1A",padding:"4px 0",fontFamily:"'Inter',sans-serif"}}>{value}</div>
                }
              </div>
            ))}
          </div>
        </div>

        {!mob&&(
          <div style={{padding:"12px 10px 12px 0",display:"flex"}}>
            <div style={{width:1,background:"#D4C9B8",margin:"0 8px 0 0",flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{color:"#C9922A",fontSize:8,fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>FOLIO</div>
              <div style={{border:"1px solid #1A1A1A",borderRadius:3,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#1A1A1A",marginBottom:10}}>{folio}</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {([["🛍","DESARROLLO\nDE RENDER"],["🏭","FABRICACIÓN\nNACIONAL"],["🛡","CONTROL\nDE CALIDAD"],["🚚","ENTREGA\nPROGRAMADA"]] as const).map(([ic,txt],i,arr)=>(
                  <div key={txt} style={{display:"flex",alignItems:"flex-start",gap:5,paddingBottom:7,borderBottom:i===arr.length-1?"none":"1px solid #D4C9B8"}}>
                    <span style={{fontSize:tab?11:13,flexShrink:0}}>{ic}</span>
                    <div style={{fontSize:tab?7:8,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",color:"#1A1A1A",lineHeight:1.3,whiteSpace:"pre-line"}}>{txt}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TABLA DE COTIZACIÓN ── */}
      <div style={{borderTop:"1px solid #D4C9B8",padding:mob?"0 10px 6px":"0 14px 6px"}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:"#C9922A",padding:"8px 0 6px"}}>COTIZACIÓN</div>
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
          <table style={{width:mob?"900px":"100%",borderCollapse:"collapse",fontSize:9.5,tableLayout:"fixed"}}>
            <colgroup>
              <col style={{width:"14%"}}/><col style={{width:"8%"}}/><col style={{width:"8%"}}/>
              <col style={{width:"6%"}}/><col style={{width:"7%"}}/><col style={{width:"7%"}}/>
              <col style={{width:"4%"}}/><col style={{width:"7%"}}/><col style={{width:"4%"}}/>
              <col style={{width:"6%"}}/><col style={{width:"5%"}}/>
              {Array.from({ length: columnasPrecio }).map((_, i) => (
                <col key={`col-precio-${i}`} style={{ width: "7%" }} />
              ))}
              <col style={{width:"3%"}}/>
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} style={{...TH,textAlign:"left",paddingLeft:8}}>Producto</th>
                <th rowSpan={2} style={TH}>Medida</th>
                <th style={{...TH,lineHeight:1.2,paddingBottom:4}}>Material<br/><span style={{color:"#888",fontSize:7.5,fontWeight:400}}>Calibre</span></th>
                <th style={TH}>Tintas</th>
                <th colSpan={7} style={{...TH,color:"#C9922A",borderBottom:"1px solid #C9922A"}}>Acabados</th>
                <th colSpan={columnasPrecio} style={{...TH,color:"#C9922A",borderBottom:"1px solid #C9922A"}}>Precio unitario</th>
                <th rowSpan={2} style={TH} className="no-print"/>
              </tr>
              <tr>
                <th style={{...TH2,padding:0}}/><th style={{...TH2,padding:0}}/>
                <th style={TH2}>Lam./Tipo</th><th style={TH2}>Foil</th><th style={TH2}>AR</th>
                <th style={TH2}>Textura</th><th style={TH2}>UV</th><th style={TH2}>Asa</th>
                <th style={TH2}>$/pig</th>
                <th style={THD}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <span>Cantidad</span>
                    {columnasPrecio === 1 && (
                      <BotonColPrecio label="+" title="Agregar otra columna" variante="add" onClick={agregarColumnaPrecio} />
                    )}
                  </div>
                </th>
                {columnasPrecio >= 2 && (
                  <th style={THD}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <span>Cantidad</span>
                      {columnasPrecio === 2 && (
                        <BotonColPrecio label="+" title="Agregar otra columna" variante="add" onClick={agregarColumnaPrecio} />
                      )}
                      <BotonColPrecio label="×" title="Quitar esta columna" variante="remove" onClick={() => quitarColumnaPrecio(2)} />
                    </div>
                  </th>
                )}
                {columnasPrecio >= 3 && (
                  <th style={THD}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <span>Cantidad</span>
                      <BotonColPrecio label="×" title="Quitar esta columna" variante="remove" onClick={() => quitarColumnaPrecio(3)} />
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filas.map((f,i)=>(
                <FilaTabla
                  key={f.uid}
                  fila={f}
                  rowIdx={i}
                  onEdit={onEdit}
                  onEditNombre={onEditNombre}
                  onDel={onDel}
                  catalogs={catalogs}
                  foils={foils}
                  texturas={texturas}
                  catalogosPlast={catalogosPlast}
                  pigmentosDB={pigmentosDB}
                  coloresAsa={coloresAsa}
                  suajesPlast={suajesPlast}
                  asasPermitidas={f.asasPermitidas}
                  laminadosPermitidos={f.laminadosPermitidos}
                  columnasPrecio={columnasPrecio}
                />
              ))}
              {!alcanzoLimite && (
                <FilaVacia
                  onElegir={onAgregarProducto}
                  catalogoPropio={catalogoPropio}
                  sistemaProductos={sistemaProductos}
                  catalogs={catalogs}
                  columnasPrecio={columnasPrecio}
                />
              )}
              {Array.from({length:filasVaciasBlanco}).map((_,i)=>(
                <tr key={`blank${i}`}>{Array.from({length:totalCols}).map((_,j)=><td key={j} style={{...TD,height:22}}/>)}</tr>
              ))}
            </tbody>
          </table>
        </div>

        {desk && (
          <div className="drop-zone-el" style={{
            border:`1.5px dashed ${alcanzoLimite?"#B8A880":over?"#C9922A":"#D4C9B8"}`,
            borderRadius:6, padding:"8px 12px", textAlign:"center",
            transition:"all .2s", margin:"4px 0",
            background: over&&!alcanzoLimite ? "rgba(201,146,42,.05)" : "transparent",
            opacity: over ? 1 : 0.6,
          }}>
            <p style={{color:over?"#C9922A":"#9A8E7F",fontSize:11,margin:0}}>
              {alcanzoLimite
                ? "✓ Límite de 5 productos — elimina uno para agregar otro"
                : over ? "📋 Suelta aquí" : "⬇ Arrastra productos del catálogo sobre la hoja"}
            </p>
          </div>
        )}

        {mob&&(
          <button onClick={alcanzoLimite?undefined:onAbrirDrawer} className="no-print" disabled={alcanzoLimite}
            style={{width:"100%",margin:"8px 0 4px",background:alcanzoLimite?"#1A1A1A88":"#1A1A1A",border:`1.5px dashed ${alcanzoLimite?"#666":"#C9922A"}`,borderRadius:8,padding:"13px",color:alcanzoLimite?"#666":"#C9922A",fontSize:14,fontWeight:700,cursor:alcanzoLimite?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif"}}>
            {alcanzoLimite ? "Límite de 5 productos alcanzado" : "+ Agregar producto"}
          </button>
        )}
      </div>

      {/* ── COMENTARIOS ── */}
      <div style={{padding:mob?"4px 10px 12px":"4px 14px 12px",borderTop:"1px solid #D4C9B8"}}>
        <span style={{fontSize:9,fontWeight:700,color:"#C9922A",letterSpacing:1,textTransform:"uppercase",marginBottom:5,display:"block"}}>Comentarios:</span>
        <div style={{border:"1px solid #D4C9B8",borderRadius:5,padding:"6px 8px"}}>
          <textarea style={{width:"100%",background:"transparent",border:"none",outline:"none",fontFamily:"'Inter',sans-serif",fontSize:mob?13:10,color:"#1A1A1A",resize:"none",minHeight:mob?56:34}}
            value={coment} onChange={e=>setComent(e.target.value)} rows={2} placeholder="Notas, condiciones de entrega..."/>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{background:"#1A1A1A",borderTop:"2px solid #C9922A"}}>
        {!mob&&(
          <div style={{padding:"7px 14px",borderBottom:"1px solid #2A2A2A",display:"flex",alignItems:"center"}}>
            <div style={{color:"#CCC",fontSize:7,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginRight:12,flexShrink:0}}>TODOS LOS PROCESOS DENTRO DE NUESTRA PLANTA</div>
            <div style={{display:"flex",gap:12,flex:1}}>
              {([["✏️","DISEÑO"],["🖨","IMPRESIÓN"],["✂️","SUAJE"],["🔧","PEGADO"],["📦","ENSAMBLE"],["⭐","ACABADOS\nESPECIALES"]] as const).map(([ic,txt])=>(
                <div key={txt} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
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
          {!mob&&([["DESCARGA NUESTRO CATÁLOGO DIGITAL","QR"],["CONTÁCTANOS POR WHATSAPP","QR"]] as const).map(([lbl,qr])=>(
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
            {([["🌐","grupeeb.com",true],["📸","/grupoeuropobolsa",false],["📘","/grupoeuropobolsa",false],["💼","/grupoeuropobolsa",false]] as const).map(([ic,txt,gold])=>(
              <div key={ic} style={{display:"flex",alignItems:"center",gap:4,color:"#AAA",fontSize:mob?10:8}}>
                <span>{ic}</span><span style={gold?{color:"#C9922A",fontWeight:700}:{}}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}