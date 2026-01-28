import { createClient } from '@supabase/supabase-js'
import crossFetch from 'cross-fetch';


const supabaseProdUrl = process.env.NEXT_PUBLIC_SUPABASE_PROD_URL;
const supabaseProdAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PROD_ANON_KEY;

if (!supabaseProdUrl) throw new Error('NEXT_PUBLIC_SUPABASE_PROD_URL is not set.');
if (!supabaseProdAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_PROD_ANON_KEY is not set.');

export const supabasePROD = createClient(supabaseProdUrl, supabaseProdAnonKey, {
    global: {
        fetch: crossFetch
    }
});
