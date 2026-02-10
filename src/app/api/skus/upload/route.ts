
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Using public credentials. This might be blocked by Row-Level Security.
// The secure way is to use a service role key from environment variables.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PROD_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PROD_ANON_KEY;

const parseNumeric = (value: any, isInt: boolean = false): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const valueStr = String(value).trim();
    if (!valueStr) return null;

    const cleanedValue = valueStr.replace(/[^0-9.-]+/g, "");
    if (!cleanedValue) return null;

    const num = isInt ? parseInt(cleanedValue, 10) : parseFloat(cleanedValue);
    return isNaN(num) ? null : num;
};


export async function POST(request: Request) {
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ message: 'Server is not configured for database access. Supabase URL or Anon Key is missing.' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const body = await request.json();
        const data: any[] = body.data;
        const uploadType = body.type || 'alterno'; // 'oficial' or 'alterno'

        if (!data || !Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ message: 'No data provided.' }, { status: 400 });
        }
        
        // 1. De-duplicate for sku_m
        const skuMdrMap = new Map<string, { sku: string, cat_mdr: string, esti_time: any, piezas_por_sku: any }>();
        data.forEach(row => {
            const sku_mdr = String(row.sku_mdr || '').trim();
            if (sku_mdr && !skuMdrMap.has(sku_mdr)) {
                skuMdrMap.set(sku_mdr, {
                    sku: String(row.sku || '').trim(), // Always get first SKU as potential official SKU
                    cat_mdr: String(row.cat_mdr || '').trim(),
                    esti_time: row.esti_time,
                    piezas_por_sku: row.piezas_por_sku,
                });
            }
        });
        const skuMRecords = Array.from(skuMdrMap.entries()).map(([sku_mdr, values]) => {
            const record: any = {
                sku_mdr,
                cat_mdr: values.cat_mdr || null,
                esti_time: parseNumeric(values.esti_time, true),
                piezas_por_sku: parseNumeric(values.piezas_por_sku, true),
            };

            if (uploadType === 'oficial') {
                record.sku = values.sku;
            }

            return record;
        });


        // 2. De-duplicate for sku_alterno: take one sku_mdr per sku
        const skuMap = new Map<string, string>();
        data.forEach(row => {
            const sku = String(row.sku || '').trim();
            const sku_mdr = String(row.sku_mdr || '').trim();
            if (sku && sku_mdr) { // ensure both exist
                skuMap.set(sku, sku_mdr);
            }
        });
        const skuAlternoRecords = Array.from(skuMap.entries()).map(([sku, sku_mdr]) => ({
            sku,
            sku_mdr,
        }));

        // 3. Prepare for sku_costos (no de-duplication needed, it's a log)
        const skuCostosRecords = data.map(row => {
            const sku_mdr = String(row.sku_mdr || '').trim();
            const landed_cost = parseNumeric(row.landed_cost);
            
            if (sku_mdr && landed_cost !== null) {
                return {
                    sku_mdr,
                    landed_cost,
                    proveedor: row.proveedor || null,
                    piezas_xcontenedor: parseNumeric(row.piezas_xcontenedor, true),
                };
            }
            return null;
        }).filter((r): r is NonNullable<typeof r> => r !== null);


        // --- DB Operations ---
        const errors = [];

        // Step 1: Insert into sku_m first to satisfy foreign keys
        if (skuMRecords.length > 0) {
            const { error: skuMError } = await supabase.from('sku_m').upsert(skuMRecords, { onConflict: 'sku_mdr' });
            if (skuMError) {
                errors.push(`Error en sku_m: ${skuMError.message}`);
                // If sku_m fails, we cannot proceed with child tables
                throw new Error(errors.join('; '));
            }
        }

        // Step 2: Insert into child tables
        if (skuAlternoRecords.length > 0) {
            const { error: skuAlternoError } = await supabase.from('sku_alterno').upsert(skuAlternoRecords, { onConflict: 'sku' });
            if (skuAlternoError) errors.push(`Error en sku_alterno: ${skuAlternoError.message}`);
        }

        if (skuCostosRecords.length > 0) {
            const { error: skuCostosError } = await supabase.from('sku_costos').insert(skuCostosRecords);
            if (skuCostosError) errors.push(`Error en sku_costos: ${skuCostosError.message}`);
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }

        return NextResponse.json({
            message: `Procesamiento completado. ${skuMRecords.length} para sku_m, ${skuAlternoRecords.length} para sku_alterno, y ${skuCostosRecords.length} para sku_costos.`
        }, { status: 200 });

    } catch (e: any) {
        console.error('API Error:', e.message);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
