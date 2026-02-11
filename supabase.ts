
import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto ControlaGrana
const supabaseUrl = 'https://oeolbhvxgsymlnvrmlsx.supabase.co';
const supabaseAnonKey = 'sb_publishable_k-K-uK2D94SaCyjozMmE4Q_8NFqXKCA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
