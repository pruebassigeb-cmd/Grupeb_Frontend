export const OBSERVACIONES = [
  { value: "E",  label: "E — Entrega realizada" },
  { value: "RA", label: "RA — Retraso por ausencia de cliente" },
  { value: "RD", label: "RD — Retraso por dirección incorrecta" },
  { value: "PD", label: "PD — Producto dañado en el traslado" },
];
  
export const ESTADO_ENVIO_BADGE: Record<string, string> = {
  sin_iniciar: "bg-gray-100 text-gray-600",
  parcial:     "bg-yellow-100 text-yellow-800",
  completo:    "bg-green-100 text-green-800",
};

export const ESTADO_ENVIO_LABEL: Record<string, string> = {
  sin_iniciar: "Sin iniciar",
  parcial:     "Parcial",
  completo:    "Completo",
};

export const ESTADO_BULTO_BADGE: Record<string, string> = {
  sin_enviar: "bg-gray-100 text-gray-500",
  preparando: "bg-blue-100 text-blue-700",
  en_camino:  "bg-yellow-100 text-yellow-800",
  entregado:  "bg-green-100 text-green-800",
};

export const ESTADO_BULTO_LABEL: Record<string, string> = {
  sin_enviar: "Sin enviar",
  preparando: "Preparando",
  en_camino:  "En camino",
  entregado:  "Entregado",
};

export const ESTADO_BADGE: Record<string, string> = {
  preparando: "bg-blue-100 text-blue-700",
  en_camino:  "bg-yellow-100 text-yellow-800",
  entregado:  "bg-green-100 text-green-800",
};

export const ESTADO_LABEL: Record<string, string> = {
  preparando: "Preparando",
  en_camino:  "En camino",
  entregado:  "Entregado",
};

export const PARCIALIDAD_BADGE = "bg-orange-100 text-orange-700";
export const COMPLETO_BADGE    = "bg-green-100 text-green-700";

export const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400";
export const labelClass = "block text-sm font-medium text-gray-700 mb-1";

export const formatFechaHora = (valor: string | null): string => {
  if (!valor) return "-";
  const d = new Date(valor);
  return d.toLocaleString("es-MX", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

export const buildMapsUrl = (calle: string, numero: string, colonia: string, poblacion: string, estado: string, cp: string): string => {
  const dir = [calle, numero, colonia, poblacion, estado, cp].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`;
};

export const copiarLink = (url: string) => {
  navigator.clipboard.writeText(url).then(() => alert("Link copiado al portapapeles"));
};