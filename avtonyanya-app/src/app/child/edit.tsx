import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, DistrictSelect, Field, H2, P, Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { formatRuDate, parseRuDate, type Child } from '../../lib/types';

export default function ChildEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [fromDistrict, setFromDistrict] = useState<string | null>(null);
  const [toDistrict, setToDistrict] = useState<string | null>(null);
  const [schedule, setSchedule] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('children')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        const c = data as Child | null;
        if (!c) return;
        setName(c.name);
        setBirth(formatRuDate(c.birth_date));
        setSchool(c.school ?? '');
        setGrade(c.grade ?? '');
        setFromDistrict(c.from_district);
        setToDistrict(c.to_district);
        setSchedule(c.schedule ?? '');
        setNotes(c.notes ?? '');
      });
  }, [id]);

  const save = async () => {
    if (!session) return;
    const birthIso = parseRuDate(birth);
    if (!name.trim()) return Alert.alert('Укажите имя ребёнка');
    if (!birthIso) return Alert.alert('Дата рождения в формате ДД.ММ.ГГГГ');
    if (!fromDistrict) return Alert.alert('Выберите район, откуда забирать');

    setBusy(true);
    const row = {
      parent_id: session.user.id,
      name: name.trim(),
      birth_date: birthIso,
      school: school.trim() || null,
      grade: grade.trim() || null,
      from_district: fromDistrict,
      to_district: toDistrict,
      schedule: schedule.trim() || null,
      notes: notes.trim() || null,
    };
    const { error } = id
      ? await supabase.from('children').update(row).eq('id', id)
      : await supabase.from('children').insert(row);
    setBusy(false);
    if (error) return Alert.alert('Ошибка', error.message);
    router.back();
  };

  const remove = () =>
    Alert.alert('Удалить профиль ребёнка?', '', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('children').delete().eq('id', id!);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Field label="Имя ребёнка" value={name} onChangeText={setName} placeholder="Соня" />
      <Field label="Дата рождения" value={birth} onChangeText={setBirth} placeholder="ДД.ММ.ГГГГ" keyboardType="numbers-and-punctuation" maxLength={10} />
      <Field label="Школа / садик / секция" value={school} onChangeText={setSchool} placeholder="Школа №45" />
      <Field label="Класс / группа" value={grade} onChangeText={setGrade} placeholder="2 «Б»" />

      <H2>Маршрут</H2>
      <DistrictSelect label="Откуда забирать" value={fromDistrict} onChange={setFromDistrict} />
      <DistrictSelect label="Куда отвозить" value={toDistrict} onChange={setToDistrict} />
      <Field
        label="Расписание"
        value={schedule}
        onChangeText={setSchedule}
        multiline
        placeholder="Пн–Пт: из школы в 13:00 домой; Вт, Чт: на хоккей к 16:00"
      />

      <H2>Важно знать автоняне</H2>
      <P muted>Не показывается в поиске — видно только вам. Расскажите автоняне, когда договоритесь.</P>
      <Field
        label="Особенности, аллергии, здоровье"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Аллергия на орехи, укачивает на заднем сиденье…"
      />

      <Button title="Сохранить" onPress={save} loading={busy} />
      {id ? <Button title="Удалить" variant="danger" onPress={remove} /> : null}
    </Screen>
  );
}
