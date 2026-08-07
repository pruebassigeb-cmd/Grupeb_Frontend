import { useEffect, useMemo, useRef, useState } from "react";
import { showAlert } from "../CustomAlert";
import type { UseImagenesCatalogo } from "../../hooks/papel/useImagenesCatalogo";

interface Props {
  api: UseImagenesCatalogo;
  catalogoKey: string;
  /** null = imagen GLOBAL del catálogo (ej. HS y AR, UV) */
  catalogoId: number | null;
  size?: number;
  title?: string;
}

// ✅ NUEVO — miniatura clicable: sin imagen muestra un ícono de cámara: al
// hacer clic abre el selector de archivo. Con imagen, aparece una × al
// pasar el mouse para quitarla. Usado en CatPanel, InsumoCatalogoPanel,
// FoilPanel y en los banners globales de HS/AR y UV.
export default function ImagenCatalogo({ api, catalogoKey, catalogoId, size = 40, title }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  const imagen = api.buscar(catalogoKey, catalogoId);
  const subiendo = api.subiendoKey === api.claveDe(catalogoKey, catalogoId);

  const handleFile = async (file: File) => {
    try {
      await api.subir(catalogoKey, catalogoId, file);
    } catch {
      showAlert("Error al subir la imagen", "error");
    }
  };

  const handleRemove = async () => {
    if (!imagen) return;
    try {
      await api.eliminar(imagen.id_archivo);
    } catch {
      showAlert("Error al quitar la imagen", "error");
    }
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => !subiendo && inputRef.current?.click()}
      title={title ?? (imagen ? "Cambiar imagen" : "Subir imagen")}
      style={{
        position: "relative", width: size, height: size, borderRadius: 6, overflow: "hidden",
        border: "1px solid #E5E7EB", background: "#F9FAFB", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}
    >
      {subiendo ? (
        <span style={{ fontSize: 10, color: "#9CA3AF" }}>...</span>
      ) : imagen ? (
        <img src={imagen.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: size >= 60 ? 20 : 14, color: "#D1D5DB" }}>📷</span>
      )}

      {imagen && hover && !subiendo && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleRemove(); }}
          title="Quitar imagen"
          style={{
            position: "absolute", top: 1, right: 1, width: 16, height: 16, borderRadius: "50%",
            background: "rgba(220,38,38,0.9)", color: "#fff", border: "none", fontSize: 10,
            lineHeight: "16px", cursor: "pointer", padding: 0,
          }}
        >
          ×
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ✅ NUEVO — mismo look que ImagenCatalogo, pero para cuando el renglón
// TODAVÍA no existe (se está creando): solo guarda el File en memoria hasta
// que el padre confirme el alta y suba la imagen con el id ya asignado.
interface SelectorImagenPendienteProps {
  file: File | null;
  onChange: (file: File | null) => void;
  size?: number;
  title?: string;
}

export function SelectorImagenPendiente({ file, onChange, size = 38, title }: SelectorImagenPendienteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => inputRef.current?.click()}
      title={title ?? "Imagen (opcional)"}
      style={{
        position: "relative", width: size, height: size, borderRadius: 6, overflow: "hidden",
        border: "1px dashed #93C5FD", background: "#EFF6FF", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}
    >
      {previewUrl ? (
        <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: size >= 60 ? 20 : 14, color: "#93C5FD" }}>📷</span>
      )}

      {file && hover && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          title="Quitar imagen"
          style={{
            position: "absolute", top: 1, right: 1, width: 16, height: 16, borderRadius: "50%",
            background: "rgba(220,38,38,0.9)", color: "#fff", border: "none", fontSize: 10,
            lineHeight: "16px", cursor: "pointer", padding: 0,
          }}
        >
          ×
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
