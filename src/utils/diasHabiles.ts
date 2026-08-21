// src/utils/diasHabiles.ts (frontend)
//
// Mismo algoritmo que tu utils/diasHabiles.ts del backend (el que ya usas
// para que el reporte semanal por correo coincida con lo que se ve en
// pantalla) — ahora también extraído del lado del frontend. Reemplaza la
// declaración local `contarDiasHabiles` que vivía dentro de Seguimiento.tsx
// (línea ~511): ese componente pasa a importarla de aquí en vez de
// declararla inline, para que el badge de "Cuentas por cobrar" y el
// contador de días de habilitación de orden (que YA existía) usen
// exactamente la misma función — y para que ese número también coincida
// con el del correo semanal y con el filtro del backend.
//
// Solo excluye sábado/domingo — no maneja festivos (igual que el original).

export function contarDiasHabiles(desde: Date, hasta: Date): number {
  const inicio = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  if (fin <= inicio) return 0;

  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1);
    const diaSemana = cursor.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) dias++;
  }
  return dias;
}
