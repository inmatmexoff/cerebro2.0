'use client';

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

        if (!data || !Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ message: 'No data provided.' }, { status: 400 });
        }
        
        // De-duplicate records from the file based on unique sku_mdr for sku_m
        const skuMdrMap = new Map<string, any>();
        data.forEach(row => {
            const sku_mdr = String(row.sku_mdr || '').trim();
            if (sku_mdr) {
                 if (String(row.sku || '').trim()) {
                    skuMdrMap.set(sku_mdr, row);
                }
            }
        });
        const finalRecordsForM = Array.from(skuMdrMap.values());
        
        // De-duplicate records based on unique sku for sku_alterno
        const skuMap = new Map<string, any>();
        data.forEach(row => {
            const sku = String(row.sku || '').trim();
            if (sku) {
                skuMap.set(sku, row);
            }
        });
        const finalRecordsForAlterno = Array.from(skuMap.values());


        const skuMRecords = finalRecordsForM.map(row => ({
            sku: String(row.sku || '').trim(),
            sku_mdr: String(row.sku_mdr || '').trim(),
            cat_mdr: String(row.cat_mdr || '').trim(),
        })).filter(rec => rec.sku && rec.sku_mdr);

        const skuAlternoRecords = finalRecordsForAlterno.map(row => ({
            sku: String(row.sku || '').trim(),
            sku_mdr: String(row.sku_mdr || '').trim(),
        })).filter(rec => rec.sku && rec.sku_mdr);
        
        const skuCostosRecords = data.map(row => {
            const sku_mdr = String(row.sku_mdr || '').trim();
            const landed_cost = parseNumeric(row.landed_cost);
            
            if (sku_mdr && landed_cost !== null && landed_cost !== 1) {
                return {
                    sku_mdr,
                    landed_cost,
                    proveedor: row.proveedor || null,
                    piezas_xcontenedor: parseNumeric(row.piezas_xcontenedor, true),
                };
            }
            return null;
        }).filter((r): r is NonNullable<typeof r> => r !== null);

        const errors = [];

        if (skuMRecords.length > 0) {
            const { error } = await supabase.from('sku_m').upsert(skuMRecords, { onConflict: 'sku_mdr' });
            if (error) errors.push(`Error en sku_m: ${error.message}`);
        }

        if (skuAlternoRecords.length > 0) {
            const { error } = await supabase.from('sku_alterno').upsert(skuAlternoRecords, { onConflict: 'sku' });
            if (error) errors.push(`Error en sku_alterno: ${error.message}`);
        }

        if (skuCostosRecords.length > 0) {
            const { error } = await supabase.from('sku_costos').insert(skuCostosRecords);
            if (error) errors.push(`Error en sku_costos: ${error.message}`);
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }

        return NextResponse.json({
            message: `Procesamiento completado. ${skuMRecords.length} para sku_m, ${skuAlternoRecords.length} para sku_alterno, y ${skuCostosRecords.length} para sku_costos.`
        }, { status: 200 });

    } catch (e: any) {
        console.error('API Error:', e);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
