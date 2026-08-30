export class GoogleAuthCancelledError extends Error {
  constructor() {
    super('Google sign-in cancelled');
    this.name = 'GoogleAuthCancelledError';
  }
}

export type SupabaseIdTokenCredentials = {
  provider: 'google';
  token: string;
};

export function googleAuthStrategy(isNative: boolean) {
  return isNative ? 'native-id-token' as const : 'web-oauth' as const;
}

export async function exchangeNativeGoogleToken(
  getIdToken: () => Promise<string>,
  signInWithIdToken: (credentials: SupabaseIdTokenCredentials) => Promise<any>,
) {
  const token = await getIdToken();
  if (!token) throw new Error('لم يصل رمز تسجيل الدخول من Google');
  const result = await signInWithIdToken({ provider: 'google', token });
  if (result?.error) throw new Error(result.error.message || 'تعذر تسجيل الدخول باستخدام Google');
  if (!result?.data?.session) throw new Error('لم يتم إنشاء جلسة');
  return result.data;
}
