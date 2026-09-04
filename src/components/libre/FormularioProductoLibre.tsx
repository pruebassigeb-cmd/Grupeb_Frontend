// src/components/libre/FormularioProductoLibre.tsx
//
// Renglón de "Cotización Libre" dentro del modal de Nueva Cotización.
// v2: Producto ahora también es catálogo-o-texto; Tintas (frente/dentro)
// pasaron a ser un desplegable de cantidad (0-4 plástico, 0-6 papel/especial)
// que despliega tantos inputs de pantón/color como tintas se elijan — igual
// que el cotizador normal; Caras es desplegable 1/2; Pigmentos y Pantones
// quedan separados; Alto relieve/UV ya no llevan nota, son solo sí/no.

import { useState, useEffect } from "react";
import CampoLibre, { type OpcionCampoLibre } from "./CampoLibre";
import type {
  TipoCotizacionLibre,
  ItemCotizacionLibre,
  CampoLibre as CampoLibreValor,
} from "../../types/cotizacion-libre.types";
import { getFoils } from "../../services/papel/papelCotizacionService";
import api from "../../services/api";

interface CatalogosLibrePlastico {
  tiposProducto: OpcionCampoLibre[];
  materiales: OpcionCampoLibre[];
  calibres: OpcionCampoLibre[];
  coloresAsa: OpcionCampoLibre[];
  medidasTroquel: OpcionCampoLibre[];
  cintasSeguridad: OpcionCampoLibre[];
}

interface FormularioProductoLibreProps {
  catalogosPlastico: CatalogosLibrePlastico;
  onAgregar: (item: ItemCotizacionLibre) => void;
  tipoInicial?: TipoCotizacionLibre;
  // Si viene un renglón, el formulario se precarga con sus datos para
  // editarlo en el mismo lugar (en vez de solo poder quitar y volver a
  // capturar desde cero). onAgregar sigue siendo el que "confirma" —
  // quien llama decide si eso reemplaza el renglón o agrega uno nuevo.
  valorInicial?: ItemCotizacionLibre | null;
  onCancelarEdicion?: () => void;
}

const vacio: CampoLibreValor = { id: null, texto: null };

const redimensionar = (arr: string[], n: number): string[] =>
  Array.from({ length: n }, (_, i) => arr[i] ?? "");

const separarPantones = (texto: string | null | undefined, n: number): string[] =>
  redimensionar((texto ?? "").split(",").map((s) => s.trim()).filter(Boolean), n);

export default function FormularioProductoLibre({
  catalogosPlastico,
  onAgregar,
  tipoInicial = "plastico",
  valorInicial = null,
  onCancelarEdicion,
}: FormularioProductoLibreProps) {
  const [tipo, setTipo] = useState<TipoCotizacionLibre>(tipoInicial);
  const esPapelOEspecial = tipo === "papel" || tipo === "especial";
  const maxTintas = esPapelOEspecial ? 6 : 4;

  const [tiposProductoPapel, setTiposProductoPapel] = useState<OpcionCampoLibre[]>([]);
  const [tiposPapel, setTiposPapel] = useState<OpcionCampoLibre[]>([]);
  const [calibresPapel, setCalibresPapel] = useState<OpcionCampoLibre[]>([]);
  const [laminados, setLaminados] = useState<OpcionCampoLibre[]>([]);
  const [foils, setFoils] = useState<OpcionCampoLibre[]>([]);
  const [texturas, setTexturas] = useState<OpcionCampoLibre[]>([]);
  const [tiposAsa, setTiposAsa] = useState<OpcionCampoLibre[]>([]);

  useEffect(() => {
    api.get("/catalogos-papel")
      .then(({ data }) => {
        setTiposProductoPapel((data.tipo_producto ?? []).map((t: any) => ({ id: t.id ?? t.idcat_tipo_producto_papel, nombre: t.nombre })));
        setTiposPapel((data.tipo_papel ?? []).map((t: any) => ({ id: t.id ?? t.idcat_tipo_papel, nombre: t.nombre })));
        setCalibresPapel((data.calibre ?? []).map((c: any) => ({ id: c.id ?? c.idcat_calibre, nombre: c.nombre })));
        setLaminados((data.laminado ?? []).map((l: any) => ({ id: l.id ?? l.idcat_laminado, nombre: l.nombre })));
        setTiposAsa((data.tipo_asa ?? []).map((a: any) => ({ id: a.id ?? a.idcat_tipo_asa, nombre: a.nombre })));
        setTexturas((data.textura ?? []).map((t: any) => ({ id: t.id ?? t.idcat_textura, nombre: t.nombre })));
      })
      .catch((err) => console.error("❌ /catalogos-papel:", err?.response?.status, err.message));

    getFoils()
      .then((data) => setFoils(data.map((f: any) => ({ id: f.idfoil ?? f.id, nombre: f.colorfoil ?? f.nombre ?? `Foil ${f.id}` }))))
      .catch((err) => console.error("❌ /foil:", err?.response?.status, err.message));
  }, []);

  const { materiales: materialesPlastico, calibres: calibresPlastico, tiposProducto: tiposProductoPlastico,
    coloresAsa, medidasTroquel, cintasSeguridad } = catalogosPlastico;

  const [producto, setProducto] = useState<CampoLibreValor>(vacio);
  const [medidaTexto, setMedidaTexto] = useState("");
  const [material, setMaterial] = useState<CampoLibreValor>(vacio);
  const [calibre, setCalibre] = useState<CampoLibreValor>(vacio);

  const [tintasFrenteCount, setTintasFrenteCount] = useState(0);
  const [pantonesFrente, setPantonesFrente] = useState<string[]>([]);
  const [tintasDentroCount, setTintasDentroCount] = useState(0);
  const [pantonesDentro, setPantonesDentro] = useState<string[]>([]);

  const [carasCount, setCarasCount] = useState<1 | 2>(1);

  const [laminado, setLaminado] = useState<CampoLibreValor>(vacio);
  const [hs, setHs] = useState<CampoLibreValor>(vacio);
  const [altoRelieve, setAltoRelieve] = useState(false);
  const [textura, setTextura] = useState<CampoLibreValor>(vacio);
  const [uv, setUv] = useState(false);
  const [asa, setAsa] = useState<CampoLibreValor>(vacio);

  const [colorAsa, setColorAsa] = useState<CampoLibreValor>(vacio);
  const [medidaTroquel, setMedidaTroquel] = useState<CampoLibreValor>(vacio);
  const [cintaSeguridad, setCintaSeguridad] = useState<CampoLibreValor>(vacio);
  const [perforacion, setPerforacion] = useState(false);
  const [pigmentosTexto, setPigmentosTexto] = useState("");

  const [cantidades, setCantidades] = useState<[string, string, string]>(["", "", ""]);
  const [precios, setPrecios] = useState<[string, string, string]>(["", "", ""]);
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (tintasFrenteCount > maxTintas) {
      setTintasFrenteCount(maxTintas);
      setPantonesFrente((prev) => redimensionar(prev, maxTintas));
    }
    if (tintasDentroCount > maxTintas) {
      setTintasDentroCount(maxTintas);
      setPantonesDentro((prev) => redimensionar(prev, maxTintas));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const resetear = () => {
    setProducto(vacio); setMedidaTexto("");
    setMaterial(vacio); setCalibre(vacio);
    setTintasFrenteCount(0); setPantonesFrente([]);
    setTintasDentroCount(0); setPantonesDentro([]);
    setCarasCount(1);
    setLaminado(vacio); setHs(vacio);
    setAltoRelieve(false);
    setTextura(vacio); setUv(false);
    setAsa(vacio);
    setColorAsa(vacio); setMedidaTroquel(vacio); setCintaSeguridad(vacio);
    setPerforacion(false); setPigmentosTexto("");
    setCantidades(["", "", ""]); setPrecios(["", "", ""]);
    setNotas("");
  };

  // Precarga el formulario con un renglón ya existente para editarlo en el
  // mismo lugar. Se dispara cada vez que "valorInicial" cambia (incluido
  // pasar a null, que limpia el formulario de vuelta a modo "agregar").
  useEffect(() => {
    if (!valorInicial) { resetear(); return; }
    const it = valorInicial;
    setTipo(it.tipo);
    setProducto({ id: it.producto_id ?? null, texto: it.producto_texto ?? null });
    setMedidaTexto(it.medida_texto ?? "");
    setMaterial(it.material ?? vacio);
    setCalibre(it.calibre ?? vacio);

    const nFrente = it.tintas_frente?.texto ? Number(it.tintas_frente.texto) || 0 : 0;
    setTintasFrenteCount(nFrente);
    setPantonesFrente(separarPantones(it.pantones_texto, nFrente));

    if (it.tipo === "plastico") {
      setCarasCount((it.caras?.texto ? Number(it.caras.texto) : 1) === 2 ? 2 : 1);
      setColorAsa(it.color_asa ?? vacio);
      setMedidaTroquel(it.medida_troquel ?? vacio);
      setCintaSeguridad(it.cinta_seguridad ?? vacio);
      setPerforacion(!!it.perforacion);
      setPigmentosTexto(it.pigmentos_texto ?? "");
    } else {
      const nDentro = it.tintas_dentro?.texto ? Number(it.tintas_dentro.texto) || 0 : 0;
      setTintasDentroCount(nDentro);
      setPantonesDentro(separarPantones(it.pantones_dentro_texto, nDentro));
      setLaminado(it.laminado ?? vacio);
      setHs(it.hs ?? vacio);
      setAltoRelieve(!!it.alto_relieve?.bool);
      setTextura(it.textura ?? vacio);
      setUv(!!it.uv?.bool);
      setAsa(it.asa ?? vacio);
    }

    setCantidades([
      it.cantidades?.[0] != null ? String(it.cantidades[0]) : "",
      it.cantidades?.[1] != null ? String(it.cantidades[1]) : "",
      it.cantidades?.[2] != null ? String(it.cantidades[2]) : "",
    ]);
    setPrecios([
      it.precios?.[0] != null ? String(it.precios[0]) : "",
      it.precios?.[1] != null ? String(it.precios[1]) : "",
      it.precios?.[2] != null ? String(it.precios[2]) : "",
    ]);
    setNotas(it.notas ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorInicial]);

  const handleGuardar = () => {
    if (!producto.id && !producto.texto?.trim()) {
      alert("Selecciona o escribe el producto");
      return;
    }
    const cantidadesNum = cantidades.map((c) => (c ? Number(c) : null)) as [
      number | null, number | null, number | null,
    ];
    const preciosNum = precios.map((p) => (p ? Number(p) : null)) as [
      number | null, number | null, number | null,
    ];
    const hayAlMenosUno = [0, 1, 2].some((i) => cantidadesNum[i] && preciosNum[i]);
    if (!hayAlMenosUno) {
      alert("Captura al menos una cantidad y su precio");
      return;
    }

    const item: ItemCotizacionLibre = {
      tipo,
      producto_id: producto.id ?? null,
      producto_texto: producto.texto ?? null,
      medida_texto: medidaTexto.trim() || null,
      material,
      calibre,
      tintas_frente: { id: null, texto: tintasFrenteCount > 0 ? String(tintasFrenteCount) : null },
      pantones_texto: pantonesFrente.filter(Boolean).join(", ") || null,
      cantidades: cantidadesNum,
      precios: preciosNum,
      notas: notas.trim() || null,
      ...(tipo === "plastico"
        ? {
            caras: { id: null, texto: String(carasCount) },
            color_asa: colorAsa,
            medida_troquel: medidaTroquel,
            cinta_seguridad: cintaSeguridad,
            perforacion,
            pigmentos_texto: pigmentosTexto.trim() || null,
          }
        : {
            tintas_dentro: { id: null, texto: tintasDentroCount > 0 ? String(tintasDentroCount) : null },
            pantones_dentro_texto: pantonesDentro.filter(Boolean).join(", ") || null,
            laminado,
            hs,
            alto_relieve: { bool: altoRelieve, texto: null },
            textura,
            uv: { bool: uv, texto: null },
            asa,
          }),
    };

    onAgregar(item);
    resetear();
  };

  return (
    <div className="bg-gradient-to-b from-purple-50 to-white border border-purple-200 rounded-2xl p-6 mb-4 space-y-5 shadow-sm">
      <div className="flex gap-1 bg-purple-100/60 p-1 rounded-full w-fit">
        {(["plastico", "papel", "especial"] as TipoCotizacionLibre[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tipo === t ? "bg-purple-600 text-white shadow" : "text-purple-700 hover:bg-white/60"
            }`}
          >
            {t === "plastico" ? "🧴 Plástico" : t === "papel" ? "📄 Papel" : "🎁 Especial"}
          </button>
        ))}
      </div>

      <p className="text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
        🆓 Este renglón es un borrador para el cliente — no se guarda en catálogo ni afecta producción.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <CampoLibre
          label="Producto"
          opciones={esPapelOEspecial ? tiposProductoPapel : tiposProductoPlastico}
          valorId={producto.id ?? null}
          valorTexto={producto.texto ?? null}
          onChange={setProducto}
          placeholder="Ej. Bolsa camiseta biodegradable"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Medida</label>
          <input
            type="text"
            value={medidaTexto}
            onChange={(e) => setMedidaTexto(e.target.value)}
            placeholder='Ej. 30 x 40 x 10 cm'
            className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CampoLibre
          label="Material"
          opciones={esPapelOEspecial ? tiposPapel : materialesPlastico}
          valorId={material.id ?? null}
          valorTexto={material.texto ?? null}
          onChange={setMaterial}
        />
        <CampoLibre
          label="Calibre"
          opciones={esPapelOEspecial ? calibresPapel : calibresPlastico}
          valorId={calibre.id ?? null}
          valorTexto={calibre.texto ?? null}
          onChange={setCalibre}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Tintas {esPapelOEspecial ? "frente" : ""}
          </label>
          <select
            value={tintasFrenteCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              setTintasFrenteCount(n);
              setPantonesFrente((prev) => redimensionar(prev, n));
            }}
            className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
          >
            {Array.from({ length: maxTintas + 1 }, (_, n) => n).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        {tipo === "plastico" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Caras</label>
            <select
              value={carasCount}
              onChange={(e) => setCarasCount(Number(e.target.value) as 1 | 2)}
              className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
            >
              <option value={1}>1 cara</option>
              <option value={2}>2 caras</option>
            </select>
          </div>
        )}
        {esPapelOEspecial && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tintas dentro</label>
            <select
              value={tintasDentroCount}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTintasDentroCount(n);
                setPantonesDentro((prev) => redimensionar(prev, n));
              }}
              className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
            >
              {Array.from({ length: maxTintas + 1 }, (_, n) => n).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tintasFrenteCount > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-500">Pantones / colores (tintas {esPapelOEspecial ? "frente" : ""})</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {pantonesFrente.map((valor, i) => (
              <input
                key={i}
                type="text"
                value={valor}
                onChange={(e) => setPantonesFrente((prev) => {
                  const next = [...prev]; next[i] = e.target.value; return next;
                })}
                placeholder={`Pantone ${i + 1}`}
                className="border border-gray-200 bg-white rounded-md px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
              />
            ))}
          </div>
        </div>
      )}

      {esPapelOEspecial && tintasDentroCount > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-500">Pantones / colores (tintas dentro)</label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {pantonesDentro.map((valor, i) => (
              <input
                key={i}
                type="text"
                value={valor}
                onChange={(e) => setPantonesDentro((prev) => {
                  const next = [...prev]; next[i] = e.target.value; return next;
                })}
                placeholder={`Pantone ${i + 1}`}
                className="border border-gray-200 bg-white rounded-md px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
              />
            ))}
          </div>
        </div>
      )}

      {tipo === "plastico" ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <CampoLibre
              label="Color de asa"
              opciones={coloresAsa}
              valorId={colorAsa.id ?? null}
              valorTexto={colorAsa.texto ?? null}
              onChange={setColorAsa}
            />
            <CampoLibre
              label="Medida de troquel"
              opciones={medidasTroquel}
              valorId={medidaTroquel.id ?? null}
              valorTexto={medidaTroquel.texto ?? null}
              onChange={setMedidaTroquel}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 items-end">
            <CampoLibre
              label="Cinta de seguridad"
              opciones={cintasSeguridad}
              valorId={cintaSeguridad.id ?? null}
              valorTexto={cintaSeguridad.texto ?? null}
              onChange={setCintaSeguridad}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm cursor-pointer">
              <input type="checkbox" checked={perforacion} onChange={(e) => setPerforacion(e.target.checked)} />
              Perforación
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Pigmentos</label>
              <input
                type="text"
                value={pigmentosTexto}
                onChange={(e) => setPigmentosTexto(e.target.value)}
                placeholder="Ej. Pigmento verde olivo"
                className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <CampoLibre
              label="Laminado"
              opciones={laminados}
              valorId={laminado.id ?? null}
              valorTexto={laminado.texto ?? null}
              onChange={setLaminado}
            />
            <CampoLibre
              label="HS (Hot Stamping)"
              opciones={foils}
              valorId={hs.id ?? null}
              valorTexto={hs.texto ?? null}
              onChange={setHs}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CampoLibre
              label="Textura"
              opciones={texturas}
              valorId={textura.id ?? null}
              valorTexto={textura.texto ?? null}
              onChange={setTextura}
            />
            <CampoLibre
              label="Asa"
              opciones={tiposAsa}
              valorId={asa.id ?? null}
              valorTexto={asa.texto ?? null}
              onChange={setAsa}
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm cursor-pointer">
              <input type="checkbox" checked={altoRelieve} onChange={(e) => setAltoRelieve(e.target.checked)} />
              Alto relieve
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm cursor-pointer">
              <input type="checkbox" checked={uv} onChange={(e) => setUv(e.target.checked)} />
              UV
            </label>
          </div>
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Cantidades y precios</label>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
              <span className="shrink-0 w-[68px] text-center text-[11px] font-semibold text-purple-700 bg-purple-50 rounded-full py-1">
                Opción {i + 1}
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Cantidad"
                value={cantidades[i]}
                onChange={(e) => {
                  const limpio = e.target.value.replace(/[^0-9]/g, "");
                  const next = [...cantidades] as [string, string, string];
                  next[i] = limpio;
                  setCantidades(next);
                }}
                className="flex-1 min-w-0 border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
              />
              <span className="text-gray-300 shrink-0">×</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Precio/pz"
                value={precios[i]}
                onChange={(e) => {
                  // Dígitos y un solo punto decimal — nada de letras ni signos.
                  const limpio = e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
                  const next = [...precios] as [string, string, string];
                  next[i] = limpio;
                  setPrecios(next);
                }}
                className="flex-1 min-w-0 border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
              />
            </div>
          ))}
        </div>
      </div>


      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Notas</label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={handleGuardar}
          className="bg-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-md hover:bg-purple-700 hover:shadow-lg transition-all"
        >
          {valorInicial ? "Guardar cambios" : "+ Agregar producto libre"}
        </button>
        {valorInicial && onCancelarEdicion && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition"
          >
            Cancelar edición
          </button>
        )}
      </div>
    </div>
  );
}
