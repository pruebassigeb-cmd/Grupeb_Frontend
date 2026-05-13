import api from "./api";

export interface BackupSchedule {
  id:            number;
  activo:        boolean;
  frecuencia:    FrecuenciaBackup;
  hora:          string;      // "HH:MM"
  dia_semana:    number;      // 0=Dom … 6=Sáb
  ultimo_backup: string | null;
  updated_at:    string;
}

export type FrecuenciaBackup =
  | "diario"
  | "cada_2_dias"
  | "cada_3_dias"
  | "semanal"
  | "cada_2_semanas"
  | "mensual";

export interface ArchivoBackup {
  id_archivo: string;
  nombre:     string;
  tamano_kb:  number;
  created_at: string;
  url:        string;
}

export const FRECUENCIA_LABELS: Record<FrecuenciaBackup, string> = {
  diario:          "Diario",
  cada_2_dias:     "Cada 2 días",
  cada_3_dias:     "Cada 3 días",
  semanal:         "Semanal",
  cada_2_semanas:  "Cada 2 semanas",
  mensual:         "Mensual",
};

export const DIA_SEMANA_LABELS = [
  "Domingo", "Lunes", "Martes", "Miércoles",
  "Jueves", "Viernes", "Sábado",
];

/** Verifica el código del admin y devuelve { ok: true } si es correcto */
export const verificarCodigo = async (codigo: string): Promise<void> => {
  await api.post("/backup/verificar-codigo", { codigo });
};

/** Ejecuta un backup manual inmediato */
export const ejecutarBackupManual = async (
  codigo: string
): Promise<{ filename: string; mensaje: string }> => {
  const { data } = await api.post("/backup/manual", { codigo });
  return data;
};

/** Obtiene la configuración del schedule */
export const getSchedule = async (): Promise<BackupSchedule | null> => {
  const { data } = await api.get("/backup/schedule");
  return data;
};

/** Guarda la configuración del schedule */
export const updateSchedule = async (
  codigo: string,
  config: Omit<BackupSchedule, "id" | "ultimo_backup" | "updated_at">
): Promise<void> => {
  await api.put("/backup/schedule", { codigo, ...config });
};

/** Lista los backups guardados */
export const getHistorialBackups = async (): Promise<ArchivoBackup[]> => {
  const { data } = await api.get("/backup/historial");
  return data;
};