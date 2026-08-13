// Guarda el token de proceso (fase 5 de roles y privilegios) mientras dura
// la verificación de un operador en curso. Vive en memoria, no en
// localStorage: es de un solo uso, vence en 10 minutos del lado del
// backend, y no debe sobrevivir a un refresh de página.
//
// api.ts lo adjunta automáticamente como header X-Proceso-Token en las
// peticiones a /procesos y /procesos-papel mientras esté activo — así los
// componentes ModalProcesoIndividual/ModalProcesoIndividualPapel (que ya
// hacen esas llamadas) no necesitan tocarse para mandarlo.
let tokenActual: string | null = null;

export const setTokenProceso = (token: string | null): void => {
  tokenActual = token;
};

export const getTokenProceso = (): string | null => tokenActual;
