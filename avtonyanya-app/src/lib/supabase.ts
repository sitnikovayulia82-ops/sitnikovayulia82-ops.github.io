import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Загружает локальный файл (uri из камеры/галереи) в Storage и возвращает путь. */
export async function uploadImage(bucket: string, path: string, uri: string): Promise<string> {
  const res = await fetch(uri);
  const body = await res.arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

/** Временная ссылка на приватный файл (паспорт виден только владельцу и модератору). */
export async function signedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}

/** Нормализует телефон к виду +7XXXXXXXXXX. Возвращает null, если номер некорректный. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    digits = '7' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('9')) {
    digits = '7' + digits;
  } else {
    return null;
  }
  return '+' + digits;
}
