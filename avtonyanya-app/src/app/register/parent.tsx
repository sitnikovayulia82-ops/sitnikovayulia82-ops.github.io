import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Checkbox, DistrictPicker, Field, P, Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { CITY } from '../../lib/districts';
import { supabase } from '../../lib/supabase';

export default function ParentRegister() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!session) return router.replace('/login?role=parent');
    if (!fullName.trim()) return Alert.alert('Укажите, как к вам обращаться');
    if (districts.length === 0) return Alert.alert('Выберите хотя бы один район');
    if (!consent) return Alert.alert('Нужно согласие на обработку персональных данных');

    setBusy(true);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      role: 'parent',
      full_name: fullName.trim(),
      phone: session.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : '',
      city: CITY,
      districts,
      pd_consent_at: new Date().toISOString(),
    });
    if (error) {
      setBusy(false);
      return Alert.alert('Ошибка', error.message);
    }
    await refreshProfile();
    setBusy(false);
    // Сразу предлагаем добавить ребёнка.
    router.replace('/home');
    router.push('/child/edit');
  };

  return (
    <Screen>
      <P muted>После анкеты добавьте профиль ребёнка — автоняни увидят запрос в своих районах.</P>
      <Field label="Ваше имя" value={fullName} onChangeText={setFullName} placeholder="Анна" />
      <DistrictPicker
        value={districts}
        onChange={setDistricts}
        label="В каких районах нужны поездки"
      />
      <Checkbox
        checked={consent}
        onChange={setConsent}
        label="Даю согласие на обработку персональных данных — моих и моего ребёнка (152-ФЗ)"
      />
      <Button title="Продолжить" onPress={submit} loading={busy} />
    </Screen>
  );
}
