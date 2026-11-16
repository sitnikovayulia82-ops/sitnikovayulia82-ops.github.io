import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Text, TextInput } from 'react-native';
import { Button, Card, P, Screen, s } from '../components/ui';
import { districtNames } from '../lib/districts';
import { signedUrl, supabase } from '../lib/supabase';
import { ageFrom, formatRuDate, type NannyProfile, type Profile } from '../lib/types';

type Pending = NannyProfile & {
  profiles: Pick<Profile, 'full_name' | 'phone' | 'districts'>;
  passportUrl?: string | null;
  selfieUrl?: string | null;
};

export default function Admin() {
  const [items, setItems] = useState<Pending[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('nanny_profiles')
      .select('*, profiles!inner(full_name, phone, districts)')
      .eq('verification_status', 'pending')
      .order('created_at');
    if (error) return Alert.alert('Ошибка', error.message);
    const rows = (data as Pending[]) ?? [];
    for (const r of rows) {
      r.passportUrl = await signedUrl('passports', r.passport_photo_path);
      r.selfieUrl = await signedUrl('passports', r.selfie_path);
    }
    setItems(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const decide = async (id: string, approve: boolean) => {
    const reason = reasons[id]?.trim();
    if (!approve && !reason) return Alert.alert('Укажите причину отказа');
    const { error } = await supabase.rpc('moderate_nanny', {
      nanny_id: id,
      approve,
      reason: approve ? null : reason,
    });
    if (error) return Alert.alert('Ошибка', error.message);
    load();
  };

  return (
    <Screen>
      {items.length === 0 ? <P muted>Нет анкет на проверке.</P> : null}
      {items.map((n) => (
        <Card key={n.user_id}>
          <Text style={{ fontSize: 17, fontWeight: '700' }}>{n.profiles.full_name}</Text>
          <P>
            📞 {n.profiles.phone} (подтверждён по СМС){'\n'}
            🎂 {formatRuDate(n.birth_date)} ({ageFrom(n.birth_date)} лет){'\n'}
            🪪 Паспорт: {n.passport_series} {n.passport_number}{'\n'}
            🚗 {n.car_model} {n.car_color ?? ''} · {n.car_plate}{'\n'}
            📍 {districtNames(n.profiles.districts)}
          </P>
          <P muted>Сверьте: ФИО и дата рождения совпадают с паспортом, лицо на селфи = фото в паспорте.</P>
          {n.passportUrl ? <Image source={{ uri: n.passportUrl }} style={{ height: 220, borderRadius: 10, marginBottom: 8 }} resizeMode="contain" /> : null}
          {n.selfieUrl ? <Image source={{ uri: n.selfieUrl }} style={{ height: 220, borderRadius: 10, marginBottom: 8 }} resizeMode="contain" /> : null}
          <TextInput
            style={[s.input, { marginBottom: 8 }]}
            placeholder="Причина отказа (если отклоняете)"
            value={reasons[n.user_id] ?? ''}
            onChangeText={(t) => setReasons((r) => ({ ...r, [n.user_id]: t }))}
          />
          <Button title="Одобрить" onPress={() => decide(n.user_id, true)} />
          <Button title="Отклонить" variant="danger" onPress={() => decide(n.user_id, false)} />
        </Card>
      ))}
    </Screen>
  );
}
