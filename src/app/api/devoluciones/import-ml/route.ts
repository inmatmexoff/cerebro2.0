import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { devoluciones } = body;

        if (!devoluciones || !Array.isArray(devoluciones) || devoluciones.length === 0) {
            return NextResponse.json({ message: 'No se proporcionaron datos de devoluciones para importar.' }, { status: 400 });
        }
        
        const allNumVentasFromFile = devoluciones
            .map(dev => String(dev.num_venta || ''))
            .filter(Boolean);
            
        if (allNumVentasFromFile.length === 0) {
             return NextResponse.json({ message: 'No se encontraron números de venta válidos en los datos proporcionados.' }, { status: 400 });
        }
        
        const { data: existingDevos, error: fetchError } = await supabasePROD
            .from('devoluciones_ml')
            .select('*')
            .in('num_venta', allNumVentasFromFile);

        if (fetchError) {
            throw new Error(`Error al verificar devoluciones existentes: ${fetchError.message}`);
        }
        
        const existingDevosMap = new Map(existingDevos.map(d => [String(d.num_venta), d]));
        const changedRecordsInfo: any[] = [];

        devoluciones.forEach(dev => {
            const existing = existingDevosMap.get(String(dev.num_venta));
            if (existing) {
                const changes: any = {};

                const oldDateStr = existing.fecha_status ? new Date(existing.fecha_status).toLocaleDateString('es-MX') : 'ninguna';
                const newDateStr = dev.fecha_status ? new Date(dev.fecha_status).toLocaleDateString('es-MX') : 'ninguna';

                if (oldDateStr !== newDateStr) {
                    changes.fecha_status = { from: oldDateStr, to: newDateStr };
                }

                const oldResultado = existing.resultado || 'ninguno';
                const newResultado = dev.resultado || 'ninguno';
                if(oldResultado !== newResultado) {
                    changes.resultado = { from: oldResultado, to: newResultado };
                }

                if (Object.keys(changes).length > 0) {
                    changedRecordsInfo.push({
                        num_venta: dev.num_venta,
                        ...changes,
                    });
                }
            }
        });

        const { data: upsertedData, error: upsertError } = await supabasePROD
            .from('devoluciones_ml')
            .upsert(devoluciones, { onConflict: 'num_venta' })
            .select();

        if (upsertError) {
            console.error('Error importing ML devolutions:', upsertError);
            if (upsertError.code === '23505') { 
                 return NextResponse.json({ message: `Error: Se encontraron registros duplicados. Detalles: ${upsertError.details}` }, { status: 409 });
            }
             if (upsertError.code === '22P02') { 
                 return NextResponse.json({ message: `Error de formato en los datos. Revisa que los números y fechas sean correctos. Detalles: ${upsertError.details}` }, { status: 400 });
            }
             if (upsertError.message.includes('column "fecha_status" of relation "devoluciones_ml" does not exist')) {
                return NextResponse.json({ message: 'La columna "fecha_status" no existe en la base de datos. Por favor, añádela antes de importar.' }, { status: 400 });
            }
            throw new Error(`Error en la base de datos: ${upsertError.message}`);
        }
        
        const insertedCount = (upsertedData?.length || 0) - existingDevos.length;
        const updatedCount = existingDevos.length;
        
        let message = `Proceso completado. ${insertedCount > 0 ? insertedCount : 0} nuevos registros. ${updatedCount} registros existentes verificados/actualizados.`;

        return NextResponse.json({ 
            message, 
            data: upsertedData,
            changes: changedRecordsInfo,
            inserted: insertedCount > 0 ? insertedCount : 0,
            updated: updatedCount,
        });

    } catch (e: any) {
        console.error('API Error importing ML devolutions:', e.message);
        return NextResponse.json({ message: e.message || 'Ocurrió un error inesperado al importar las devoluciones.' }, { status: 500 });
    }
}
