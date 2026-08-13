// src/components/cotizadorLibre/LandingCotizadorLibre.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getLandingCotizadorLibre,
  crearSlotLandingCotizadorLibre,
  actualizarSlotLandingCotizadorLibre,
  eliminarSlotLandingCotizadorLibre,
  subirImagenSlotLandingCotizadorLibre,
  eliminarImagenSlotLandingCotizadorLibre,
} from "../../services/cotizadorLibre/cotizadorLibreLanding.service";
import {
  SECCIONES_LANDING_COTIZADOR_LIBRE,
  SECCIONES_LANDING_META,
} from "../../types/cotizadorLibre/cotizadorLibreLanding.types";
import type {
  LandingSlotItem,
  SeccionLandingCotizadorLibre,
} from "../../types/cotizadorLibre/cotizadorLibreLanding.types";

interface LandingCotizadorLibreProps {
  esClienteExterno: boolean;
  onComenzar: () => void;
  onSalir: () => void;
}

type SlotVariant = "linea" | "producto" | "etiqueta";

const BENEFICIOS = [
  ["◴", "Rápido", "Cotiza en segundos"],
  ["✎", "Personaliza", "Diseña tu empaque a tu medida"],
  ["♢", "Confiable", "Precios claros y sin compromiso"],
  ["♧", "Sustentable", "Materiales amigables con el planeta"],
  ["✺", "Experiencia", "Más de 35 años contigo"],
] as const;

export default function LandingCotizadorLibre({
  esClienteExterno,
  onComenzar,
  onSalir,
}: LandingCotizadorLibreProps) {
  const { user } = useAuth();
  const esAdmin = user?.acceso_total === true;

  const [slots, setSlots] = useState<LandingSlotItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    try {
      setError(null);
      const data = await getLandingCotizadorLibre();
      setSlots(data);
    } catch {
      setError("No se pudo cargar la landing.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porSeccion = useMemo(() => {
    const mapa = new Map<SeccionLandingCotizadorLibre, LandingSlotItem[]>();
    for (const seccion of SECCIONES_LANDING_COTIZADOR_LIBRE) mapa.set(seccion, []);
    for (const slot of slots) mapa.get(slot.seccion)?.push(slot);
    return mapa;
  }, [slots]);

  const irASeccion = (seccion: SeccionLandingCotizadorLibre) => {
    document.getElementById(`landing-seccion-${seccion}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const lineas = porSeccion.get("lineas") ?? [];
  const etiquetas = porSeccion.get("etiquetas") ?? [];
  const seccionesProducto = SECCIONES_LANDING_COTIZADOR_LIBRE.filter(
    (seccion) => seccion !== "lineas" && seccion !== "etiquetas"
  );

  return (
    <div className="min-h-dvh lg:h-dvh bg-[#f5f1e9] text-[#122b1e] overflow-x-hidden lg:overflow-hidden">
      {/* Marco general. El max-width evita que todo se vuelva gigantesco en TV/4K. */}
      <div className="w-full max-w-[1920px] mx-auto bg-[#f5f1e9] lg:h-full lg:grid lg:grid-rows-[auto_minmax(0,1fr)_auto_auto]">
        {/* ================================================================
            CABECERA / MARCA
           ================================================================ */}
        <header className="px-[clamp(14px,2vw,34px)] pt-[clamp(10px,1.2vh,18px)] pb-[clamp(4px,0.5vh,8px)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center min-w-0">
              <div className="flex items-center border-r border-[#bdb7aa] pr-[clamp(12px,1.4vw,24px)] mr-[clamp(12px,1.4vw,24px)]">
                <span
                  className="hidden sm:block mr-2 text-[clamp(12px,1vw,18px)] tracking-[0.18em] text-[#27392f]"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  GRUPO
                </span>
                <span className="text-[clamp(48px,5.2vw,88px)] lg:text-[clamp(48px,8vh,76px)] leading-[0.72] font-black tracking-[-0.09em] text-[#0e3323]">
                  EB
                </span>
              </div>

              <div className="min-w-0">
                <p className="font-black uppercase leading-none tracking-[-0.035em] text-[clamp(20px,2.4vw,42px)] lg:text-[clamp(20px,4vh,34px)] text-[#102d20] whitespace-nowrap">
                  EB Cotizador
                </p>
                <p className="font-semibold uppercase leading-none tracking-[0.19em] text-[clamp(14px,1.8vw,30px)] lg:text-[clamp(14px,3vh,25px)] text-[#b78336] mt-1">
                  Inteligente
                </p>
                <p className="hidden sm:block mt-1.5 uppercase tracking-[0.12em] font-medium text-[clamp(8px,0.72vw,13px)] lg:text-[clamp(8px,1.45vh,11px)] text-[#242a26]">
                  Diseña&nbsp; · &nbsp;Personaliza&nbsp; · &nbsp;Cotiza
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <a
                href="tel:+523339999999"
                className="hidden lg:flex items-center gap-2 rounded-full bg-[#102d20] px-[clamp(12px,1.1vw,20px)] py-[clamp(7px,0.7vw,11px)] text-[clamp(9px,0.72vw,12px)] font-extrabold uppercase tracking-wide text-[#e5bd70] shadow-sm hover:bg-[#19432f] transition-colors"
              >
                <span className="text-[1.2em]">◉</span>
                ¿Necesitas ayuda? Llamar a un asesor
              </a>
              <button
                onClick={onSalir}
                className="rounded-full border border-[#d8d1c5] bg-white/70 px-3 py-2 text-[11px] sm:text-xs font-bold text-[#5e655f] hover:border-[#b78336] hover:text-[#9a6c2d] transition-colors"
              >
                {esClienteExterno ? "Salir" : "Inicio"}
              </button>
            </div>
          </div>
        </header>

        {/* ================================================================
            POSTER PRINCIPAL
           ================================================================ */}
        <main className="px-[clamp(14px,2vw,34px)] pb-[clamp(8px,0.8vh,14px)] lg:min-h-0 lg:overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,0.35fr)_minmax(0,0.65fr)] gap-[clamp(10px,1vw,18px)] items-start lg:h-full lg:min-h-0">
            {/* Columna izquierda */}
            <aside className="pt-[clamp(4px,0.7vh,10px)] self-start lg:h-full lg:min-h-0">
              <section className="max-w-[670px]">
                <h1 className="font-black uppercase leading-[1.02] tracking-[-0.035em] text-[clamp(26px,2.8vw,46px)] lg:text-[clamp(24px,4.8vh,40px)] text-[#123424]">
                  Diseña el empaque ideal
                  <span className="block text-[#b78336] mt-1">para tu marca</span>
                </h1>

                <div className="mt-[clamp(7px,1vh,12px)] flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#9f9a8f]" />
                  <span className="text-[clamp(10px,0.85vw,14px)] lg:text-[clamp(9px,1.6vh,12px)] font-black uppercase tracking-[0.06em] text-[#173f2c] whitespace-nowrap">
                    ♧ En menos de 2 minutos
                  </span>
                  <span className="h-px flex-1 bg-[#9f9a8f]" />
                </div>

                <p className="mt-[clamp(7px,1vh,12px)] text-[clamp(12px,0.95vw,16px)] lg:text-[clamp(11px,1.8vh,14px)] leading-[1.35] text-[#323833] max-w-[564px]">
                  Crea, personaliza y cotiza al instante el empaque perfecto para tu negocio.
                </p>

                <button
                  onClick={onComenzar}
                  className="mt-[clamp(12px,1.5vh,20px)] w-full max-w-[564px] rounded-[clamp(14px,1.2vw,22px)] bg-[#173b28] px-[clamp(18px,1.7vw,28px)] py-[clamp(10px,1.35vh,16px)] text-white shadow-[0_7px_15px_rgba(31,47,37,0.22)] transition-all hover:bg-[#214f37] hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="grid grid-cols-[auto_1px_1fr_auto] items-center gap-[clamp(10px,1vw,18px)]">
                    <span className="text-[clamp(20px,2vw,32px)] lg:text-[clamp(18px,3vh,26px)] leading-none">☝</span>
                    <span className="h-[42px] bg-white/35" />
                    <span className="text-left leading-none">
                      <span className="block uppercase font-black text-[clamp(20px,2.1vw,34px)] lg:text-[clamp(18px,3.3vh,28px)] tracking-[-0.025em]">
                        Comenzar
                      </span>
                      <span className="block mt-1.5 uppercase text-[clamp(9px,0.8vw,13px)] font-medium tracking-[0.04em] text-white/80">
                        Diseña tu empaque ahora
                      </span>
                    </span>
                    <span className="text-[clamp(20px,2vw,34px)] lg:text-[clamp(18px,3.4vh,28px)] font-light">›</span>
                  </span>
                </button>

                <p className="mt-2 text-center max-w-[564px] uppercase text-[clamp(9px,0.72vw,12px)] font-black tracking-[0.04em] text-[#202923]">
                  ☝ Toca la pantalla para comenzar
                </p>
              </section>

              {/* Etiquetas en la misma zona izquierda del poster */}
              {(etiquetas.length > 0 || esAdmin) && (
                <section id="landing-seccion-etiquetas" className="scroll-mt-6 mt-[clamp(10px,1.3vh,16px)]">
                  <div className="relative mb-1.5 flex items-center justify-between gap-2 max-w-[564px]">
                    <h2 className="uppercase text-[clamp(9px,0.72vw,12px)] font-black tracking-[0.04em] text-[#1c3025]">
                      {SECCIONES_LANDING_META.etiquetas.label}
                    </h2>
                    {esAdmin && <NuevoSlotCompacto seccion="etiquetas" onCreado={cargar} />}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-[clamp(3px,0.35vw,6px)] max-w-[564px]">
                    {etiquetas.map((slot, index) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        esAdmin={esAdmin}
                        onCambio={cargar}
                        variant="etiqueta"
                        destacado={index === 0 && etiquetas.length >= 3}
                      />
                    ))}
                  </div>
                </section>
              )}
            </aside>

            {/* Columna derecha */}
            <div className="min-w-0 lg:h-full lg:min-h-0 lg:flex lg:flex-col">
              {error && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}
              {cargando && (
                <div className="py-16 text-center text-sm font-semibold text-[#6b716b]">Cargando...</div>
              )}

              {!cargando && (
                <>
                  {/* Las cuatro líneas superiores conservan presencia, pero con altura limitada. */}
                  {(lineas.length > 0 || esAdmin) && (
                    <section id="landing-seccion-lineas" className="scroll-mt-6 relative">
                      {esAdmin && (
                        <div className="absolute right-0 -top-1 z-10">
                          <NuevoSlotCompacto seccion="lineas" onCreado={cargar} label="Línea" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-[clamp(4px,0.45vw,8px)] gap-y-[clamp(6px,0.7vh,10px)] items-end">
                        {lineas.map((slot, index) => (
                          <SlotCard
                            key={slot.id}
                            slot={slot}
                            esAdmin={esAdmin}
                            onCambio={cargar}
                            variant="linea"
                            destacado={index === 0 || index === 3}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Productos secundarios, dispuestos como escaparate de catálogo. */}
                  <section className="mt-[clamp(4px,0.6vh,8px)] lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-x-[clamp(4px,0.5vw,8px)] gap-y-[clamp(6px,0.7vh,10px)] lg:h-full">
                      {seccionesProducto.map((seccion) => {
                        const items = porSeccion.get(seccion) ?? [];
                        if (!esAdmin && items.length === 0) return null;

                        return (
                          <div
                            key={seccion}
                            id={`landing-seccion-${seccion}`}
                            className="scroll-mt-6 min-w-0"
                          >
                            <div className="relative min-h-[1.6em] mb-0.5 flex items-end justify-center gap-1">
                              <h2 className="text-center uppercase leading-[1.08] text-[clamp(8px,0.66vw,11px)] font-black tracking-[0.02em] text-[#1d2a23]">
                                {SECCIONES_LANDING_META[seccion].label}
                              </h2>
                              {esAdmin && <NuevoSlotCompacto seccion={seccion} onCreado={cargar} compact />}
                            </div>

                            <div
                              className={`grid gap-x-[clamp(2px,0.28vw,5px)] gap-y-[clamp(1px,0.18vh,3px)] ${
                                items.length >= 2 ? "grid-cols-2" : "grid-cols-1"
                              }`}
                            >
                              {items.map((slot, index) => (
                                <SlotCard
                                  key={slot.id}
                                  slot={slot}
                                  esAdmin={esAdmin}
                                  onCambio={cargar}
                                  variant="producto"
                                  destacado={items.length >= 3 ? index === 0 : index === 0 && items.length === 2}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </main>

        {/* ================================================================
            NAVEGACIÓN POR CATEGORÍAS
           ================================================================ */}
        <nav className="border-y border-[#e4ddd1] bg-white/65 px-[clamp(10px,1.6vw,30px)] py-[clamp(4px,0.5vh,7px)]">
          <div className="flex gap-2 overflow-x-auto lg:grid lg:grid-cols-9 lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECCIONES_LANDING_COTIZADOR_LIBRE.map((seccion) => (
              <button
                key={seccion}
                onClick={() => irASeccion(seccion)}
                className="group min-w-[150px] lg:min-w-0 flex items-center gap-2 rounded-xl border border-[#ebe4da] bg-white/80 px-[clamp(10px,0.8vw,14px)] py-[clamp(5px,0.7vh,8px)] text-left hover:border-[#c99b55] hover:bg-[#fffaf2] transition-colors"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#183c29] text-[15px] text-white">
                  {SECCIONES_LANDING_META[seccion].icono}
                </span>
                <span className="text-[clamp(9px,0.62vw,11px)] leading-[1.12] font-black uppercase text-[#243029]">
                  {SECCIONES_LANDING_META[seccion].label}
                </span>
              </button>
            ))}
          </div>
        </nav>

        {/* ================================================================
            BENEFICIOS
           ================================================================ */}
        <footer className="bg-[#102d20] px-[clamp(14px,2vw,38px)] py-[clamp(6px,0.7vh,10px)] text-white">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-2">
            {BENEFICIOS.map(([icono, titulo, texto], index) => (
              <div
                key={titulo}
                className={`flex items-center gap-3 px-[clamp(6px,1.2vw,20px)] ${
                  index > 0 ? "md:border-l md:border-[#c7923c]/30" : ""
                }`}
              >
                <span className="text-[clamp(20px,1.6vw,28px)] lg:text-[clamp(18px,2.6vh,24px)] leading-none text-[#c7923c]">{icono}</span>
                <span className="min-w-0">
                  <span className="block uppercase text-[clamp(10px,0.76vw,13px)] font-black tracking-[0.04em] text-[#f5e1bd]">
                    {titulo}
                  </span>
                  <span className="block mt-0.5 text-[clamp(9px,0.72vw,12px)] leading-snug text-white/75">
                    {texto}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// Tarjeta de imagen. La clave responsive está aquí:
// - object-contain: nunca recorta el producto.
// - alturas con clamp(): crece hasta un máximo y no explota en TV/4K.
// - sin card blanca pesada: se integra al fondo como en el poster de referencia.
// ============================================================================
function SlotCard({
  slot,
  esAdmin,
  onCambio,
  variant = "producto",
  destacado = false,
}: {
  slot: LandingSlotItem;
  esAdmin: boolean;
  onCambio: () => void;
  variant?: SlotVariant;
  destacado?: boolean;
}) {
  const [editandoTitulo, setEditandoTitulo] = useState(false);
  const [tituloBorrador, setTituloBorrador] = useState(slot.titulo);
  const [subiendo, setSubiendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTituloBorrador(slot.titulo);
  }, [slot.titulo]);

  const guardarTitulo = async () => {
    setEditandoTitulo(false);
    if (tituloBorrador.trim() === slot.titulo.trim()) return;
    try {
      setOcupado(true);
      await actualizarSlotLandingCotizadorLibre(slot.id, { titulo: tituloBorrador.trim() });
      onCambio();
    } finally {
      setOcupado(false);
    }
  };

  const cambiarImagen = async (file: File) => {
    try {
      setSubiendo(true);
      await subirImagenSlotLandingCotizadorLibre(slot.id, file);
      onCambio();
    } finally {
      setSubiendo(false);
    }
  };

  const quitarImagen = async () => {
    try {
      setOcupado(true);
      await eliminarImagenSlotLandingCotizadorLibre(slot.id);
      onCambio();
    } finally {
      setOcupado(false);
    }
  };

  const eliminarEspacio = async () => {
    if (!window.confirm("¿Quitar este espacio por completo? Esto también borra su imagen.")) return;
    try {
      setOcupado(true);
      await eliminarSlotLandingCotizadorLibre(slot.id);
      onCambio();
    } finally {
      setOcupado(false);
    }
  };

  const altoImagen =
    variant === "linea"
      ? destacado
        ? "h-[clamp(182px,22vw,345px)] lg:h-[clamp(174px,31.5vh,282px)]"
        : "h-[clamp(170px,20.6vw,325px)] lg:h-[clamp(164px,29.8vh,265px)]"
      : variant === "etiqueta"
      ? destacado
        ? "h-[clamp(98px,9.4vw,146px)] lg:h-[clamp(89px,12.7vh,115px)]"
        : "h-[clamp(91px,8.8vw,137px)] lg:h-[clamp(82px,11.8vh,108px)]"
      : destacado
      ? "h-[clamp(146px,13.4vw,209px)] lg:h-[clamp(110px,15.4vh,158px)]"
      : "h-[clamp(132px,12.2vw,190px)] lg:h-[clamp(98px,13.9vh,139px)]";

  const anchoWrapper =
    variant === "producto" && destacado
      ? "w-full col-span-2"
      : "w-full";

  const paddingImagen =
    variant === "linea"
      ? "p-[clamp(3px,0.4vw,7px)]"
      : variant === "etiqueta"
      ? "p-[clamp(3px,0.28vw,5px)]"
      : destacado
      ? "p-[clamp(1px,0.22vw,4px)]"
      : "p-[clamp(1px,0.18vw,3px)]";

  const titleClass =
    variant === "linea"
      ? "text-[clamp(10px,0.9vw,15px)] lg:text-[clamp(9px,1.6vh,13px)] min-h-[1.9em]"
      : variant === "etiqueta"
      ? (destacado
          ? "text-[clamp(7px,0.66vw,10px)] lg:text-[clamp(7px,1.1vh,9px)]"
          : "text-[clamp(7px,0.6vw,9px)] lg:text-[clamp(7px,1.02vh,8px)]")
      : destacado
      ? "text-[clamp(9px,0.74vw,12px)] lg:text-[clamp(8px,1.3vh,10px)]"
      : "text-[clamp(8px,0.66vw,10px)] lg:text-[clamp(7px,1.2vh,9px)]";

  return (
    <article className={`group relative min-w-0 ${anchoWrapper}`}>
      {variant === "linea" && (
        <div className="mb-1 text-center">
          {esAdmin && editandoTitulo ? (
            <TitleInput
              value={tituloBorrador}
              onChange={setTituloBorrador}
              onBlur={guardarTitulo}
              onCancel={() => {
                setTituloBorrador(slot.titulo);
                setEditandoTitulo(false);
              }}
              className="text-[clamp(11px,0.92vw,15px)]"
            />
          ) : (
            <p
              onClick={() => esAdmin && setEditandoTitulo(true)}
              className={`uppercase font-black tracking-[0.02em] leading-[1.08] text-[#162a1f] ${titleClass} ${
                esAdmin ? "cursor-text hover:text-[#a97732]" : ""
              }`}
              title={esAdmin ? "Clic para editar el título" : slot.titulo}
            >
              {slot.titulo || (esAdmin ? "Sin título — clic para editar" : "")}
            </p>
          )}
        </div>
      )}

      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-[clamp(8px,0.7vw,13px)] bg-[#f6f2ea] ${altoImagen} ${paddingImagen}`}
      >
        {slot.imagenUrl ? (
          <img
  src={slot.imagenUrl}
  alt={slot.titulo}
  loading="lazy"
  className="block h-full w-full object-contain object-center select-none drop-shadow-[12px_5px_6px_rgba(18,43,30,0.30)]"
/>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-[#cfc6b8] bg-white/35 text-[clamp(22px,2vw,34px)] text-[#a39a8d]">
            ◫
          </div>
        )}

        {esAdmin && (
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/30 opacity-100 md:bg-black/0 md:opacity-0 md:group-hover:bg-black/35 md:group-hover:opacity-100 transition-all">
            <input
              ref={inputArchivoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) cambiarImagen(file);
                e.target.value = "";
              }}
            />
            <AdminButton
              label="Cambiar imagen"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={subiendo || ocupado}
            >
              {subiendo ? "…" : "📷"}
            </AdminButton>
            {slot.imagenUrl && (
              <AdminButton label="Quitar imagen" onClick={quitarImagen} disabled={ocupado} danger>
                🗑
              </AdminButton>
            )}
            <AdminButton label="Eliminar espacio" onClick={eliminarEspacio} disabled={ocupado} danger>
              ×
            </AdminButton>
          </div>
        )}
      </div>

      {variant !== "linea" && (
        <div className="pt-0.5 text-center">
          {esAdmin && editandoTitulo ? (
            <TitleInput
              value={tituloBorrador}
              onChange={setTituloBorrador}
              onBlur={guardarTitulo}
              onCancel={() => {
                setTituloBorrador(slot.titulo);
                setEditandoTitulo(false);
              }}
              className={titleClass}
            />
          ) : (
            <p
              onClick={() => esAdmin && setEditandoTitulo(true)}
              className={`uppercase font-black leading-[1.15] text-[#1c2922] line-clamp-2 ${titleClass} ${
                esAdmin ? "cursor-text hover:text-[#a97732]" : ""
              }`}
              title={esAdmin ? "Clic para editar el título" : slot.titulo}
            >
              {slot.titulo || (esAdmin ? "Sin título — clic para editar" : "")}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function TitleInput({
  value,
  onChange,
  onBlur,
  onCancel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onCancel: () => void;
  className?: string;
}) {
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") onCancel();
      }}
      className={`w-full rounded-md border border-[#b78336] bg-white px-2 py-1 text-center font-bold text-[#173725] outline-none ${className}`}
    />
  );
}

function AdminButton({
  label,
  onClick,
  disabled,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black shadow-md transition-transform hover:scale-105 disabled:opacity-50 ${
        danger ? "text-red-600" : "text-[#173725]"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Alta compacta: no ocupa un "slot" completo. Así el modo administrador no
// altera la composición del poster ni provoca una fila extra / scroll.
// ============================================================================
function NuevoSlotCompacto({
  seccion,
  onCreado,
  label = "Agregar",
  compact = false,
}: {
  seccion: SeccionLandingCotizadorLibre;
  onCreado: () => void;
  label?: string;
  compact?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [guardando, setGuardando] = useState(false);

  const crear = async () => {
    if (!titulo.trim()) return;
    try {
      setGuardando(true);
      await crearSlotLandingCotizadorLibre(seccion, titulo.trim());
      setTitulo("");
      setAbierto(false);
      onCreado();
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title={`Agregar ${label.toLowerCase()}`}
        className={`flex flex-shrink-0 items-center justify-center rounded-full border border-[#c8954e]/55 bg-[#fffaf2]/90 font-black text-[#a36f2b] hover:border-[#b78336] hover:bg-white transition-colors ${
          compact ? "h-5 w-5 text-[12px]" : "h-6 px-2 text-[9px] uppercase gap-1"
        }`}
      >
        <span className={compact ? "leading-none" : "text-[12px] leading-none"}>＋</span>
        {!compact && <span>{label}</span>}
      </button>
    );
  }

  return (
    <div className={`z-30 flex items-center gap-1 rounded-lg border border-[#d6b783] bg-[#fffaf2] p-1 shadow-lg ${compact ? "absolute right-0 top-full mt-1 w-[190px]" : "absolute right-0 top-full mt-1 w-[220px]"}`}>
      <input
        autoFocus
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") crear();
          if (e.key === "Escape") {
            setAbierto(false);
            setTitulo("");
          }
        }}
        placeholder="Título"
        className="min-w-0 flex-1 rounded-md border border-[#ddd4c7] bg-white px-2 py-1 text-[9px] font-semibold outline-none focus:border-[#b78336]"
      />
      <button
        type="button"
        onClick={crear}
        disabled={guardando || !titulo.trim()}
        className="rounded-md bg-[#173725] px-2 py-1 text-[9px] font-black text-white disabled:opacity-50"
      >
        {guardando ? "…" : "OK"}
      </button>
      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          setTitulo("");
        }}
        className="h-6 w-6 rounded-md border border-[#ddd4c7] bg-white text-[11px] font-black text-[#656b65]"
      >
        ×
      </button>
    </div>
  );
}