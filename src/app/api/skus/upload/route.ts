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
        
        const { data: existingAlternoData, error: alternoError } = await supabase
            .from('sku_alterno')
            .select('sku, sku_mdr, empresa')
            .in('sku', allSkusFromFile);
        if (alternoError) throw new Error(`Error fetching existing sku_alterno data: ${alternoError.message}`);

        const allMdrFromDb = (existingAlternoData || []).map(r => r.sku_mdr).filter(Boolean);
        const allMdrsToFetch = [...new Set([...allMdrFromFile, ...allMdrFromDb])];

        let existingMData: any[] = [];
        if (allMdrsToFetch.length > 0) {
             const { data: mData, error: mError } = await supabase
                .from('sku_m')
                .select('sku_mdr, sku, cat_mdr, sub_cat, esti_time, piezas_por_sku, empaquetado_master, tip_empa, pz_empaquetado_master')
                .in('sku_mdr', allMdrsToFetch);
            if (mError) throw new Error(`Error fetching existing sku_m data: ${mError.message}`);
            if (mData) existingMData = mData;
        }

        const existingMMap = new Map(existingMData.map(r => [r.sku_mdr, r]));
        const existingAlternoMap = new Map((existingAlternoData || []).map(r => [r.sku, r]));


        // --- Prepare records for DB operations ---
        const skuMRecordsToUpsert = new Map<string, any>();
        const skuAlternoRecordsToUpsert = new Map<string, any>();
        const skuCostosRecordsToInsert: any[] = [];

        data.forEach(row => {
            const sku = String(row.sku || '').trim();
            const sku_mdr = String(row.sku_mdr || '').trim();
            if (!sku || !sku_mdr) return;

            // 1. Prepare sku_alterno upsert
            const existingAlternoRecord = existingAlternoMap.get(sku);
            const empresa = row.empresa || null;
            if (!existingAlternoRecord || existingAlternoRecord.sku_mdr !== sku_mdr || existingAlternoRecord.empresa !== empresa) {
                skuAlternoRecordsToUpsert.set(sku, { sku, sku_mdr, empresa });
            }

            // 2. Prepare sku_m upsert
            const existingMRecord = existingMMap.get(sku_mdr);
            const recordFromFileForM = {
                sku_mdr,
                cat_mdr: row.cat_mdr || null,
                sub_cat: row.sub_categoria || null,
                esti_time: parseNumeric(row.esti_time, true),
                piezas_por_sku: parseNumeric(row.piezas_por_sku, true),
                empaquetado_master: row.empaquetado_master || null,
                tip_empa: row.tip_empa || null,
                pz_empaquetado_master: parseNumeric(row.pz_empaquetado_master, true),
                ...(uploadType === 'oficial' && { sku }),
            };
            
            if (!existingMRecord) {
                // If sku_mdr is new, we'll upsert it.
                if (!skuMRecordsToUpsert.has(sku_mdr)) {
                    skuMRecordsToUpsert.set(sku_mdr, recordFromFileForM);
                }
            } else {
                // sku_mdr exists, so we check for changes
                const mergedRecord = { ...existingMRecord };
                let hasChanged = false;
                
                Object.keys(recordFromFileForM).forEach(key => {
                    const fileValue = recordFromFileForM[key as keyof typeof recordFromFileForM];
                    const dbValue = existingMRecord[key];
                    if (key !== 'sku_mdr' && fileValue !== null && fileValue !== dbValue) {
                        mergedRecord[key] = fileValue;
                        hasChanged = true;
                    }
                });

                if (hasChanged) {
                    skuMRecordsToUpsert.set(sku_mdr, mergedRecord);
                }
            }
            
            // 3. Prepare sku_costos insert (always append for history)
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

        const finalSkuMRecords = Array.from(skuMRecordsToUpsert.values());
        if (finalSkuMRecords.length > 0) {
            const { error: skuMError, count } = await supabase.from('sku_m').upsert(finalSkuMRecords, { onConflict: 'sku_mdr', count: 'exact' });
            if (skuMError) {
                errors.push(`Error en sku_m: ${skuMError.message}`);
                throw new Error(errors.join('; '));
            }
            mCount = count ?? 0;
        }

        const finalSkuAlternoRecords = Array.from(skuAlternoRecordsToUpsert.values());
        if (finalSkuAlternoRecords.length > 0) {
            const { error: skuAlternoError, count } = await supabase.from('sku_alterno').upsert(finalSkuAlternoRecords, { onConflict: 'sku', count: 'exact' });
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
        
        let message = `Procesamiento completado. Registros maestros (sku_m) actualizados/insertados: ${mCount}. Registros alternos (sku_alterno) actualizados/insertados: ${alternoCount}. Nuevos registros de costos: ${costosCount}.`;

        return NextResponse.json({ message }, { status: 200 });

    } catch (e: any) {
        console.error('API Error:', e.message);
        return NextResponse.json({ message: e.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
