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
        
        const recordsToInsert: any[] = [];
        const recordsToUpdate: any[] = [];
        const changedRecordsInfo: any[] = [];

        devoluciones.forEach(dev => {
            if (!dev.num_venta) return;

            const numVenta = String(dev.num_venta);
            const existing = existingDevosMap.get(numVenta);
            
            if (existing) {
                const changes: any = {};
                let hasChanged = false;

                const oldDate = existing.fecha_status ? new Date(existing.fecha_status).toISOString().split('T')[0] : null;
                const newDate = dev.fecha_status ? new Date(dev.fecha_status).toISOString().split('T')[0] : null;
                if (oldDate !== newDate) {
                    changes.fecha_status = { from: existing.fecha_status, to: dev.fecha_status };
                    hasChanged = true;
                }

                const oldResultado = existing.resultado || null;
                const newResultado = dev.resultado || null;
                if (oldResultado !== newResultado) {
                    changes.resultado = { from: oldResultado, to: newResultado };
                    hasChanged = true;
                }
                
                if (hasChanged) {
                    const updatePayload: { [key: string]: any } = {};
                    for (const key in dev) {
                        if (dev[key] !== undefined) {
                            updatePayload[key] = dev[key];
                        }
                    }
                    recordsToUpdate.push(updatePayload);
                    changedRecordsInfo.push({
                        num_venta: dev.num_venta,
                        ...changes,
                    });
                }
            } else {
                recordsToInsert.push(dev);
            }
        });

        const insertedData: any[] = [];
        const updatedData: any[] = [];
        const errors: string[] = [];

        if (recordsToInsert.length > 0) {
            const { data, error } = await supabasePROD
                .from('devoluciones_ml')
                .insert(recordsToInsert)
                .select();
            if (error) {
                errors.push(`Error al insertar nuevos registros: ${error.message}`);
            }
            if(data) insertedData.push(...data);
        }
        
        if (recordsToUpdate.length > 0) {
            for (const record of recordsToUpdate) {
                 const { data, error } = await supabasePROD
                    .from('devoluciones_ml')
                    .update(record)
                    .eq('num_venta', record.num_venta)
                    .select();
                if (error) {
                    errors.push(`Error al actualizar el registro ${record.num_venta}: ${error.message}`);
                }
                if (data) updatedData.push(...data);
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
        
        const insertedCount = insertedData.length;
        const updatedCount = updatedData.length;
        
        let message = `Proceso completado. ${insertedCount} nuevos registros insertados. ${updatedCount} registros actualizados.`;

        return NextResponse.json({ 
            message, 
            data: [...insertedData, ...updatedData],
            changes: changedRecordsInfo.map(c => ({
                num_venta: c.num_venta,
                fecha_status: c.fecha_status ? {
                    from: c.fecha_status.from ? new Date(c.fecha_status.from).toLocaleDateString('es-MX') : 'ninguna',
                    to: c.fecha_status.to ? new Date(c.fecha_status.to).toLocaleDateString('es-MX') : 'ninguna',
                } : undefined,
                resultado: c.resultado ? {
                    from: c.resultado.from || 'ninguno',
                    to: c.resultado.to || 'ninguno',
                } : undefined
            })),
            inserted: insertedCount,
            updated: updatedCount,
        });

    } catch (e: any) {
        console.error('API Error importing ML devolutions:', e.message);
        return NextResponse.json({ message: e.message || 'Ocurrió un error inesperado al importar las devoluciones.' }, { status: 500 });
    }
}
