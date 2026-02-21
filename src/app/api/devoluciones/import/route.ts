import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { devoluciones } = body;

        if (!devoluciones || !Array.isArray(devoluciones) || devoluciones.length === 0) {
            return NextResponse.json({ message: 'No se proporcionaron datos de devoluciones.' }, { status: 400 });
        }

        // The body already contains parsed and mapped records from the client
        const recordsToInsert = devoluciones.map((dev: any) => ({
            tienda: dev.tienda || null,
            num_venta: dev.num_venta || null,
            fecha_venta: dev.fecha_venta || null,
            fecha_llegada: dev.fecha_llegada || null,
            producto: dev.producto || null,
            motivo_devo: dev.motivo_devo || null,
            estado_llegada: dev.estado_llegada || null,
            reporte: dev.reporte,
            nombre_despacho: dev.nombre_despacho || null,
            nombre_revision: dev.nombre_revision || null,
            error_prop: dev.error_prop,
            observacion: dev.observacion || null,
            factura: dev.factura,
            s_revision: dev.s_revision || null,
        }));
        
        const { data, error } = await supabasePROD
            .from('devoluciones')
            .insert(recordsToInsert)
            .select();

        if (error) {
            console.error('Error importing devolutions:', error);
            throw new Error(`Error en la base de datos: ${error.message}`);
        }

        return NextResponse.json({ message: `${data.length} devoluciones han sido importadas exitosamente.`, data });

    } catch (e: any) {
        console.error('API Error importing devolutions:', e.message);
        return NextResponse.json({ message: e.message || 'Ocurrió un error inesperado.' }, { status: 500 });
    }
}
