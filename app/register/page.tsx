import { redirect } from 'next/navigation';

type RegisterAliasPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function RegisterAliasPage({ searchParams }: RegisterAliasPageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === 'string' && params.next.startsWith('/')
      ? `?next=${encodeURIComponent(params.next)}`
      : '';

  redirect(`/registro${nextPath}`);
}
