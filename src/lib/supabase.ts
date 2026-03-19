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

const supabasePersonalUrl = "https://fjeffdiayxvbiteewgvz.supabase.co";
const supabasePersonalAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZWZmZGlheXh2Yml0ZWV3Z3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTkyOTcsImV4cCI6MjA3NzU5NTI5N30.xOC4_UjVZq2Zs2hnLeAbb694sF9GAMlGmrrgFVTdwKc";

export const supabasePERSONAL = createClient(supabasePersonalUrl, supabasePersonalAnonKey, {
    global: {
        fetch: crossFetch
    }
});
