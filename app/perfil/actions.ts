'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function buildProfilePath(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `/perfil?${query}` : '/perfil';
}

export async function registerDependentAction(formData: FormData) {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const documentNumber = String(formData.get('documentNumber') ?? '').trim();
  const relationship = String(formData.get('relationship') ?? 'child').trim();

  if (!fullName || !documentNumber) {
    redirect(
      buildProfilePath({
        error: encodeMessage('Completa el nombre y el CI del hijo o hija.'),
      })
    );
  }

  if (relationship !== 'child') {
    redirect(
      buildProfilePath({
        error: encodeMessage('Solo puedes registrar familiares marcados como hijo o hija.'),
      })
    );
  }

  if (!isSupabaseConfigured()) {
    redirect(
      buildProfilePath({
        error: encodeMessage('El registro familiar aun no esta disponible.'),
      })
    );
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirect(
      buildProfilePath({
        error: encodeMessage('No se pudo conectar con la base familiar.'),
      })
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fperfil');
  }

  const { error } = await supabase.from('family_dependents').insert({
    guardian_user_id: user.id,
    full_name: fullName,
    document_number: documentNumber,
    relationship: 'child',
  });

  if (error) {
    redirect(
      buildProfilePath({
        error: encodeMessage(error.message),
      })
    );
  }

  redirect(
    buildProfilePath({
      message: encodeMessage('Hijo o hija registrado correctamente en la familia.'),
    })
  );
}
