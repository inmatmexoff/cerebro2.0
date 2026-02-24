import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { devoluciones } = body;

        if (!devoluciones || !Array.isArray(devoluciones) || devoluciones.length === 0) {
            return NextResponse.json({ message: 'No se proporcionaron datos de devoluciones para importar.' }, { status: 400 });
        }
        
        // 1. Get all `num_venta` from the uploaded file
        const allNumVentasFromFile = devoluciones
            .map(dev => String(dev.num_venta || ''))
            .filter(Boolean);
            
        if (allNumVentasFromFile.length === 0) {
             return NextResponse.json({ message: 'No se encontraron números de venta válidos en los datos proporcionados.' }, { status: 400 });
        }
        
        // 2. Check which ones already exist in the database
        const { data: existingDevos, error: fetchError } = await supabasePROD
            .from('devoluciones_ml')
            .select('num_venta')
            .in('num_venta', allNumVentasFromFile);

        if (fetchError) {
            throw new Error(`Error al verificar devoluciones existentes: ${fetchError.message}`);
        }
        
        const existingNumVentasSet = new Set(existingDevos.map(d => String(d.num_venta)));

        // 3. Filter out duplicates
        const devolucionesToInsert = devoluciones.filter(dev => {
            const numVenta = String(dev.num_venta || '');
            return numVenta && !existingNumVentasSet.has(numVenta);
        });
        
        const skippedCount = devoluciones.length - devolucionesToInsert.length;
        
        if (devolucionesToInsert.length === 0) {
            return NextResponse.json({ message: `No hay devoluciones nuevas para importar. Se omitieron ${skippedCount} registros duplicados.` });
        }

        // 4. Insert only the new records
        const { data: insertedData, error: insertError } = await supabasePROD
            .from('devoluciones_ml')
            .insert(devolucionesToInsert)
            .select();

        if (insertError) {
            console.error('Error importing ML devolutions:', insertError);
            if (insertError.code === '23505') { 
                 return NextResponse.json({ message: `Error: Se encontraron registros duplicados. Detalles: ${insertError.details}` }, { status: 409 });
            }
             if (insertError.code === '22P02') { 
                 return NextResponse.json({ message: `Error de formato en los datos. Revisa que los números y fechas sean correctos. Detalles: ${insertError.details}` }, { status: 400 });
            }
             if (insertError.message.includes('column "fecha_status" of relation "devoluciones_ml" does not exist')) {
                return NextResponse.json({ message: 'La columna "fecha_status" no existe en la base de datos. Por favor, añádela antes de importar.' }, { status: 400 });
            }
            throw new Error(`Error en la base de datos: ${insertError.message}`);
        }
        
        let message = `${insertedData.length} devoluciones de ML han sido importadas exitosamente.`;
        if (skippedCount > 0) {
            message += ` Se omitieron ${skippedCount} registros duplicados.`;
        }

        return NextResponse.json({ message, data: insertedData });

    } catch (e: any) {
        console.error('API Error importing ML devolutions:', e.message);
        return NextResponse.json({ message: e.message || 'Ocurrió un error inesperado al importar las devoluciones.' }, { status: 500 });
    }
}
