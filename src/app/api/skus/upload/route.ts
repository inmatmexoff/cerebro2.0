




import { NextResponse } from 'next/server';
import { supabasePROD } from '@/lib/supabase';

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
    const supabase = supabasePROD;

    try {
        const body = await request.json();
        const data: any[] = body.data;
        const uploadType = body.type || 'alterno'; // 'oficial' or 'alterno'

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ message: 'No data provided.' }, { status: 400 });
        }
        
        // Validation for 'oficial' upload type
        if (uploadType === 'oficial') {
            const skuMdrCounts = new Map<string, number>();
            data.forEach(row => {
                const sku_mdr = String(row.sku_mdr || '').trim();
                if (sku_mdr) {
                    skuMdrCounts.set(sku_mdr, (skuMdrCounts.get(sku_mdr) || 0) + 1);
                }
            });

            const duplicates = Array.from(skuMdrCounts.entries())
                .filter(([_, count]) => count > 1)
                .map(([sku_mdr, _]) => sku_mdr);

            if (duplicates.length > 0) {
                return NextResponse.json(
                    { 
                        message: 'Error: Se encontraron NOMBRES MADRE duplicados en el archivo. Un archivo de SKUs "Oficiales" solo puede tener una fila por cada NOMBRE MADRE.',
                        duplicates 
                    }, 
                    { status: 400 }
                );
            }
        }

        // --- Fetch existing data for comparison ---
        const allSkusFromFile = [...new Set(data.map(r => String(r.sku || '').trim()).filter(Boolean))];
        const allMdrFromFile = [...new Set(data.map(r => String(r.sku_mdr || '').trim()).filter(Boolean))];
        
        const CHUNK_SIZE = 200;
        let existingMData: any[] = [];
        let existingAlternoData: any[] = [];

        for (let i = 0; i < allMdrFromFile.length; i += CHUNK_SIZE) {
            const chunk = allMdrFromFile.slice(i, i + CHUNK_SIZE);
            const { data: mChunk, error: mError } = await supabase
                .from('sku_m')
                .select('sku_mdr, sku, cat_mdr, sub_cat, esti_time, piezas_por_sku')
                .in('sku_mdr', chunk);
            if (mError) throw new Error(`Error fetching existing sku_m data: ${mError.message}`);
            if (mChunk) existingMData.push(...mChunk);
        }

        for (let i = 0; i < allSkusFromFile.length; i += CHUNK_SIZE) {
            const chunk = allSkusFromFile.slice(i, i + CHUNK_SIZE);
            const { data: alternoChunk, error: alternoError } = await supabase
                .from('sku_alterno')
                .select('sku, sku_mdr')
                .in('sku', chunk);
            if (alternoError) throw new Error(`Error fetching existing sku_alterno data: ${alternoError.message}`);
            if (alternoChunk) existingAlternoData.push(...alternoChunk);
        }

        const existingMMap = new Map((existingMData || []).map(r => [r.sku_mdr, r]));
        const existingAlternoMap = new Map((existingAlternoData || []).map(r => [r.sku, r.sku_mdr]));


        // --- Prepare records for DB operations ---
        const skuMRecordsToUpsert: any[] = [];
        const skuAlternoRecordsToUpsert: any[] = [];
        const skuCostosRecordsToInsert: any[] = [];

        // De-duplicate incoming data to process each sku_mdr and sku once
        const uniqueMdrData = new Map<string, any>();
        const uniqueAlternoData = new Map<string, string>();
        
        data.forEach(row => {
            const sku_mdr = String(row.sku_mdr || '').trim();
            const sku = String(row.sku || '').trim();

            if (sku_mdr && !uniqueMdrData.has(sku_mdr)) {
                uniqueMdrData.set(sku_mdr, row);
            }
            if (sku && sku_mdr && !uniqueAlternoData.has(sku)) {
                uniqueAlternoData.set(sku, sku_mdr);
            }
        });


        // 1. Process sku_m records
        uniqueMdrData.forEach((row, sku_mdr) => {
            const existingRecord = existingMMap.get(sku_mdr);

            const recordFromFile = {
                sku_mdr,
                cat_mdr: row.cat_mdr || null,
                sub_cat: row.sub_categoria || null,
                esti_time: parseNumeric(row.esti_time, true),
                piezas_por_sku: parseNumeric(row.piezas_por_sku, true),
                ...(uploadType === 'oficial' && { sku: String(row.sku || '').trim() || null }),
            };

            if (!existingRecord) {
                skuMRecordsToUpsert.push(recordFromFile);
            } else {
                const mergedRecord = { ...existingRecord };
                let hasChanged = false;

                if (recordFromFile.cat_mdr !== null && recordFromFile.cat_mdr !== existingRecord.cat_mdr) {
                    mergedRecord.cat_mdr = recordFromFile.cat_mdr;
                    hasChanged = true;
                }
                if (recordFromFile.sub_cat !== null && recordFromFile.sub_cat !== existingRecord.sub_cat) {
                    mergedRecord.sub_cat = recordFromFile.sub_cat;
                    hasChanged = true;
                }
                if (recordFromFile.esti_time !== null && recordFromFile.esti_time !== existingRecord.esti_time) {
                    mergedRecord.esti_time = recordFromFile.esti_time;
                    hasChanged = true;
                }
                if (recordFromFile.piezas_por_sku !== null && recordFromFile.piezas_por_sku !== existingRecord.piezas_por_sku) {
                    mergedRecord.piezas_por_sku = recordFromFile.piezas_por_sku;
                    hasChanged = true;
                }
                if (uploadType === 'oficial' && recordFromFile.sku && recordFromFile.sku !== existingRecord.sku) {
                    mergedRecord.sku = recordFromFile.sku;
                    hasChanged = true;
                }

                if (hasChanged) {
                    skuMRecordsToUpsert.push(mergedRecord);
                }
            }
        });

        // 2. Process sku_alterno records (only for 'alterno' type)
        if (uploadType === 'alterno') {
            uniqueAlternoData.forEach((sku_mdr, sku) => {
                const existingMdr = existingAlternoMap.get(sku);
                if (!existingMdr || existingMdr !== sku_mdr) {
                    skuAlternoRecordsToUpsert.push({ sku, sku_mdr });
                }
            });
        }
        
        // 3. Process sku_costos (always append for history)
        data.forEach(row => {
            const sku_mdr = String(row.sku_mdr || '').trim();
            const landed_cost = parseNumeric(row.landed_cost);
            
            if (sku_mdr && landed_cost !== null) {
                skuCostosRecordsToInsert.push({
                    sku_mdr,
                    landed_cost,
                    proveedor: row.proveedor || null,
                    piezas_xcontenedor: parseNumeric(row.piezas_xcontenedor, true),
                });
            }
        });


        // --- DB Operations ---
        const errors: string[] = [];
        let mCount = 0, alternoCount = 0, costosCount = 0;

        if (skuMRecordsToUpsert.length > 0) {
            const { error: skuMError, count } = await supabase.from('sku_m').upsert(skuMRecordsToUpsert, { onConflict: 'sku_mdr', count: 'exact' });
            if (skuMError) {
                errors.push(`Error en sku_m: ${skuMError.message}`);
                throw new Error(errors.join('; '));
            }
            mCount = count ?? 0;
        }

        if (skuAlternoRecordsToUpsert.length > 0) {
            const { error: skuAlternoError, count } = await supabase.from('sku_alterno').upsert(skuAlternoRecordsToUpsert, { onConflict: 'sku', count: 'exact' });
            if (skuAlternoError) errors.push(`Error en sku_alterno: ${skuAlternoError.message}`);
            alternoCount = count ?? 0;
        }

        if (skuCostosRecordsToInsert.length > 0) {
            const { error: skuCostosError, count } = await supabase.from('sku_costos').insert(skuCostosRecordsToInsert, { count: 'exact' });
            if (skuCostosError) errors.push(`Error en sku_costos: ${skuCostosError.message}`);
            costosCount = count ?? 0;
        }

        if (errors.length > 0) {
            throw new Error(errors.join('; '));
        }
        
        let message = `Procesamiento completado. Registros maestros (sku_m) actualizados/insertados: ${mCount}. Nuevos registros de costos: ${costosCount}.`;
        if (uploadType === 'alterno') {
            message = `Procesamiento completado. Registros maestros (sku_m) actualizados/insertados: ${mCount}. Registros alternos actualizados/insertados: ${alternoCount}. Nuevos registros de costos: ${costosCount}.`;
        }

        return NextResponse.json({ message }, { status: 200 });

    } catch (e: any) {
        console.error('API Error:', e.message);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
