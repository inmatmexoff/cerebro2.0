import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        let finalObservacion = body.observaciones || '';

        if (body.factura && body.num_factura) {
            finalObservacion = `Factura: ${body.num_factura}. ${finalObservacion}`.trim();
        }

        if (body.reporte && body.reporte_detalle) {
            finalObservacion = `Reporte: ${body.reporte_detalle}. ${finalObservacion}`.trim();
        }

        if (body.error_nosotros) {
            let errorParts = [];
            if (body.responsable_barra) errorParts.push(`Resp. Barra: ${body.responsable_barra}`);
            if (body.responsable_picking) errorParts.push(`Resp. Picking: ${body.responsable_picking}`);
            if (body.responsable_calificar) errorParts.push(`Resp. Calificar: ${body.responsable_calificar}`);
            if (body.saldo_negativo) errorParts.push(`Saldo Negativo: $${body.saldo_negativo}`);
            if (body.descuento_personas) errorParts.push(`Dividir costo entre: ${body.descuento_personas} personas`);
            if (body.enterado_personal) errorParts.push(`Enterados: ${body.enterado_personal}`);
            if (body.fecha_registro_saldo_negativo) errorParts.push(`Fecha Saldo Negativo: ${new Date(body.fecha_registro_saldo_negativo).toLocaleDateString()}`);
            if (body.saldo_cobrado) errorParts.push(`Saldo Cobrado: Sí`);
            
            if (errorParts.length > 0) {
                 finalObservacion = `Error Propio: ${errorParts.join('; ')}. ${finalObservacion}`.trim();
            }
        }


        const recordToInsert = {
            tienda: body.tienda || null,
            num_venta: body.num_venta || null,
            fecha_venta: body.fecha_venta || null,
            fecha_llegada: body.fecha_llegada || null,
            producto: body.producto || null,
            sku: body.sku || null,
            motivo_devo: body.motivo_devolucion || null,
            estado_llegada: body.estado_llegada || null,
            reporte: body.reporte,
            nombre_despacho: body.responsable_picking || null,
            nombre_revision: body.responsable_calificar || null,
            error_prop: body.error_nosotros,
            observacion: finalObservacion || null,
            factura: body.factura,
            s_revision: body.revision || null,
        };

        const { data, error } = await supabasePROD
            .from('devoluciones')
            .insert([recordToInsert])
            .select()
            .single();

        if (error) {
            console.error('Error inserting devolution:', error);
            throw new Error(`Error en la base de datos: ${error.message}`);
        }

        return NextResponse.json({ message: `Devolución para la venta ${body.num_venta || 'desconocida'} ha sido registrada.`, data });

    } catch (e: any) {
        console.error('API Error creating devolution:', e.message);
        return NextResponse.json({ message: e.message || 'Ocurrió un error inesperado.' }, { status: 500 });
    }
}
