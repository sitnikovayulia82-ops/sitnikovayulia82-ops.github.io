import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import {
  Button,
  Card,
  Checkbox,
  DistrictPicker,
  Field,
  H2,
  P,
  PhotoInput,
  Screen,
} from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { CITY } from '../../lib/districts';
import { supabase, uploadImage } from '../../lib/supabase';
import { ageFrom, parseRuDate } from '../../lib/types';

const MIN_NANNY_AGE = 21;

export default function NannyRegister() {
  const { session, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [birth, setBirth] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [about, setAbout] = useState('');
  const [experience, setExperience] = useState('');
  const [price, setPrice] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carColor, setCarColor] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [childSeat, setChildSeat] = useState(true);
  const [series, setSeries] = useState('');
  const [number, setNumber] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!session) return router.replace('/login?role=nanny');
    const birthIso = parseRuDate(birth);
    const errors: string[] = [];
    if (fullName.trim().split(/\s+/).length < 2) errors.push('Укажите фамилию и имя полностью');
    if (!birthIso) errors.push('Дата рождения в формате ДД.ММ.ГГГГ');
    else if (ageFrom(birthIso) < MIN_NANNY_AGE) errors.push(`Автоняне должно быть не меньше ${MIN_NANNY_AGE} года`);
    if (districts.length === 0) errors.push('Выберите хотя бы один район');
    if (!carModel.trim() || !carPlate.trim()) errors.push('Укажите марку и госномер автомобиля');
    if (!/^\d{4}$/.test(series.replace(/\s/g, ''))) errors.push('Серия паспорта — 4 цифры');
    if (!/^\d{6}$/.test(number.replace(/\s/g, ''))) errors.push('Номер паспорта — 6 цифр');
    if (!passportPhoto) errors.push('Сфотографируйте разворот паспорта с фото');
    if (!selfie) errors.push('Сделайте селфи с паспортом в руках');
    if (!consent) errors.push('Нужно согласие на обработку персональных данных');
    if (errors.length) {
      Alert.alert('Заполните анкету', errors.join('\n'));
      return;
    }

    setBusy(true);
    try {
      const uid = session.user.id;
      const ts = Date.now();
      const passportPath = await uploadImage('passports', `${uid}/passport_${ts}.jpg`, passportPhoto!);
      const selfiePath = await uploadImage('passports', `${uid}/selfie_${ts}.jpg`, selfie!);

      const { error: pErr } = await supabase.from('profiles').upsert({
        id: uid,
        role: 'nanny',
        full_name: fullName.trim(),
        phone: session.user.phone ? `+${session.user.phone.replace(/^\+/, '')}` : '',
        city: CITY,
        districts,
        pd_consent_at: new Date().toISOString(),
      });
      if (pErr) throw pErr;

      const { error: nErr } = await supabase.from('nanny_profiles').upsert({
        user_id: uid,
        birth_date: birthIso,
        about: about.trim() || null,
        experience_years: Number(experience) || 0,
        price_from: Number(price) || null,
        car_model: carModel.trim(),
        car_color: carColor.trim() || null,
        car_plate: carPlate.trim().toUpperCase(),
        has_child_seat: childSeat,
        passport_series: series.replace(/\s/g, ''),
        passport_number: number.replace(/\s/g, ''),
        passport_photo_path: passportPath,
        selfie_path: selfiePath,
        verification_status: 'pending',
      });
      if (nErr) throw nErr;

      await refreshProfile();
      router.replace('/home');
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <P muted>
        Анкету проверяет модератор: сверяем паспорт с селфи и телефоном. Обычно это занимает до
        24 часов. Паспортные данные видит только модератор — родители их не видят.
      </P>

      <H2>О вас</H2>
      <Field label="ФИО (как в паспорте)" value={fullName} onChangeText={setFullName} placeholder="Иванова Мария Петровна" />
      <Field label="Дата рождения" value={birth} onChangeText={setBirth} placeholder="ДД.ММ.ГГГГ" keyboardType="numbers-and-punctuation" maxLength={10} />
      <Field label="Опыт работы с детьми, лет" value={experience} onChangeText={setExperience} keyboardType="number-pad" />
      <Field label="Стоимость поездки от, ₽" value={price} onChangeText={setPrice} keyboardType="number-pad" />
      <Field label="О себе" value={about} onChangeText={setAbout} multiline placeholder="Мама двоих детей, педагогическое образование…" />

      <H2>Где готовы работать</H2>
      <DistrictPicker value={districts} onChange={setDistricts} label={`Районы (${CITY})`} />

      <H2>Автомобиль</H2>
      <Field label="Марка и модель" value={carModel} onChangeText={setCarModel} placeholder="Kia Rio" />
      <Field label="Цвет" value={carColor} onChangeText={setCarColor} placeholder="Белый" />
      <Field label="Госномер" value={carPlate} onChangeText={setCarPlate} placeholder="А123ВС116" autoCapitalize="characters" />
      <Checkbox checked={childSeat} onChange={setChildSeat} label="Есть детское кресло / бустер" />

      <H2>Паспорт</H2>
      <Card>
        <Field label="Серия" value={series} onChangeText={setSeries} keyboardType="number-pad" maxLength={5} placeholder="9200" />
        <Field label="Номер" value={number} onChangeText={setNumber} keyboardType="number-pad" maxLength={7} placeholder="123456" />
        <PhotoInput
          label="Фото разворота паспорта с фотографией"
          hint="Все данные должны читаться, без бликов"
          uri={passportPhoto}
          onChange={setPassportPhoto}
          camera
        />
        <PhotoInput
          label="Селфи с паспортом в руках"
          hint="Лицо и раскрытый паспорт в одном кадре"
          uri={selfie}
          onChange={setSelfie}
          camera
          front
        />
      </Card>

      <Checkbox
        checked={consent}
        onChange={setConsent}
        label="Даю согласие на обработку моих персональных данных, включая паспортные данные, для проверки личности (152-ФЗ)"
      />

      <Button title="Отправить на проверку" onPress={submit} loading={busy} />
    </Screen>
  );
}
