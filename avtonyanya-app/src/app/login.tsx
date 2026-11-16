import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Field, P, Screen } from '../components/ui';
import { normalizePhone, supabase } from '../lib/supabase';

export default function Login() {
  const { role } = useLocalSearchParams<{ role?: 'nanny' | 'parent' }>();
  const [phoneInput, setPhoneInput] = useState('+7 ');
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const p = normalizePhone(phoneInput);
    if (!p) {
      Alert.alert('Проверьте номер', 'Введите российский номер мобильного, например +7 900 123-45-67');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: p });
    setBusy(false);
    if (error) {
      Alert.alert('Не удалось отправить СМС', error.message);
      return;
    }
    setPhone(p);
  };

  const verify = async () => {
    if (!phone) return;
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
    if (error || !data.session) {
      setBusy(false);
      Alert.alert('Неверный код', error?.message ?? 'Попробуйте ещё раз');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.session.user.id)
      .maybeSingle();
    setBusy(false);
    if (profile) router.replace('/home');
    else router.replace(role ? `/register/${role}` : '/welcome');
  };

  return (
    <Screen>
      {!phone ? (
        <>
          <P>Мы отправим СМС с кодом — так мы подтверждаем, что номер принадлежит вам.</P>
          <Field
            label="Номер телефона"
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />
          <Button title="Получить код" onPress={sendCode} loading={busy} />
        </>
      ) : (
        <>
          <P>Код отправлен на {phone}</P>
          <Field
            label="Код из СМС"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
          />
          <Button title="Подтвердить" onPress={verify} loading={busy} disabled={code.length < 4} />
          <Button title="Изменить номер" variant="secondary" onPress={() => setPhone(null)} />
        </>
      )}
    </Screen>
  );
}
