// src/utils/buildPayloadDesdePedido.ts
import type { Pedido } from "../types/cotizaciones.types";

export function buildPayloadDesdePedido(ped: Pedido) {
    return {
        clienteId: ped.cliente_id,
        tipo: "pedido" as const,
        prioridad: false,
        sin_iva: false,

        productos: ped.productos.map((p: any) => {
            const detalle = p.detalles?.[0];

            // buildPayloadDesdePedido.ts — solo cambia el bloque del precioUnitario

            const cantidad = detalle?.cantidad ?? 0;
            const kilogramos = detalle?.kilogramos ?? 0;
            const modoCantidad: "unidad" | "kilo" =
                detalle?.modo_cantidad === "kilo" ? "kilo" : "unidad";
            const porKiloNum = Number(p.por_kilo ?? 0);

            let precioUnitario: number;

            if (modoCantidad === "kilo" && kilogramos > 0 && porKiloNum > 0) {
                // El service calcula: precioKg = precios[i] * porKilo
                //                     precio_total = kilogramos * precioKg
                // Entonces: precios[i] = precio_total / kilogramos / porKilo
                precioUnitario = detalle.precio_total / kilogramos / porKiloNum;
            } else {
                // Modo unidad: precio_total = cantidad * precios[i]
                // Entonces: precios[i] = precio_total / cantidad
                precioUnitario = cantidad > 0
                    ? detalle.precio_total / cantidad
                    : (detalle?.precio_unitario ?? 0);
            }

            // Suficientes decimales para que la multiplicación inversa sea exacta
            precioUnitario = Number(precioUnitario.toFixed(8));

            return {
                productoId: p.producto_id,
                tintasId: p.tintas_idtintas,
                carasId: p.caras_idcaras ?? 2,

                // El service itera cantidades[0..2], solo usamos índice 0 (pedidos = 1 cantidad)
                cantidades: [cantidad, 0, 0] as [number, number, number],
                kilogramos: [kilogramos, 0, 0] as [number, number, number],
                precios: [precioUnitario, 0, 0] as [number, number, number],

                modoCantidad,
                porKilo: p.por_kilo ?? null,

                idsuaje: p.idsuaje ?? null,
                colorAsaId: p.id_color ?? null,
                idMedidaTroquel: p.id_medidatro ?? null,

                pigmentos: p.pigmentos ?? null,
                pantones: Array.isArray(p.pantones)
                    ? p.pantones.join(", ")
                    : (p.pantones ?? null),

                observacion: p.observacion ?? null,
                descripcion: p.descripcion ?? null,
                perforacion: p.perforacion ?? false,

                herramental_descripcion: p.herramental_descripcion ?? null,
                herramental_precio: p.herramental_precio ?? null,

                // Para que el service no falle con `prod.nombre` en el throw
                nombre: p.nombre ?? "",
            };
        }),
    };
}