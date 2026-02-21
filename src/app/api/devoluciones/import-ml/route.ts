import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { devoluciones } = body;

        if (!devoluciones || !Array.isArray(devoluciones) || devoluciones.length === 0) {
            return NextResponse.json({ message: 'No se proporcionaron datos de devoluciones para importar.' }, { status: 400 });
        }

        // Supabase client will handle the mapping from the client
        const { data, error } = await supabasePROD
            .from('devoluciones_ml')
            .insert(devoluciones)
            .select();

        if (error) {
            console.error('Error importing ML devolutions:', error);
            // Check for specific common errors if needed
            if (error.code === '23505') { // unique constraint violation
                 return NextResponse.json({ message: `Error: Se encontraron registros duplicados. Detalles: ${error.details}` }, { status: 409 });
            }
             if (error.code === '22P02') { // invalid text representation for a data type
                 return NextResponse.json({ message: `Error de formato en los datos. Revisa que los números y fechas sean correctos. Detalles: ${error.details}` }, { status: 400 });
            }
            throw new Error(`Error en la base de datos: ${error.message}`);
        }

        return NextResponse.json({ message: `${data.length} devoluciones de ML han sido importadas exitosamente.`, data });

    } catch (e: any) {
        console.error('API Error importing ML devolutions:', e.message);
        return NextResponse.json({ message: e.message || 'Ocurrió un error inesperado al importar las devoluciones.' }, { status: 500 });
    }
}
