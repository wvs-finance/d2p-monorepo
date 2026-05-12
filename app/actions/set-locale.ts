'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function setLocale(locale: 'es-CO' | 'en'): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
    path: '/',
  })
  revalidatePath('/', 'layout')
}
