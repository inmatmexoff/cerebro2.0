import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        let finalObservacion = body.observaciones || '';
        if (body.factura && body.num_factura) {
            finalObservacion = `Factura: ${body.num_factura}. ${finalObservacion}`.trim();
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
            nombre_despacho: body.empaquetador || null,
            nombre_revision: body.supervisado_por || null,
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
