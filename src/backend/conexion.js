// Importamos la librería de Supabase directamente desde JavaScript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://bpvvltxhfoubizhhjiuw.supabase.co'
const supabaseKey = 'sb_publishable_NqWjYn5HXNTN_CwexKLEqQ_CiERNPJz'
export const supabaseClient = createClient(supabaseUrl, supabaseKey)