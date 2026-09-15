import { ErrorCode, GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { GoogleAuthCancelledError } from './google-auth-flow';

let initializedForClientId: string | null = null;

function googleWebClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) throw new Error('إعداد تسجيل Google غير مكتمل');
  return clientId;
}

export async function getNativeGoogleIdToken(): Promise<string> {
  const clientId = googleWebClientId();
  if (initializedForClientId !== clientId) {
    await GoogleSignIn.initialize({ clientId });
    initializedForClientId = clientId;
  }

  try {
    const result = await GoogleSignIn.signIn();
    if (!result.idToken) throw new Error('لم يصل رمز تسجيل الدخول من Google');
    return result.idToken;
  } catch (error: any) {
    if (error?.code === ErrorCode.SignInCanceled) throw new GoogleAuthCancelledError();
    if (error?.code === ErrorCode.NoCredentialAvailable) {
      throw new Error('لم يتم العثور على حساب Google متاح على الجهاز');
    }
    if (error?.code === ErrorCode.ProviderConfigurationError) {
      throw new Error('إعداد Google على هذا الإصدار من التطبيق غير صحيح');
    }
    throw error instanceof Error ? error : new Error('تعذر تسجيل الدخول باستخدام Google');
  }
}

export async function clearNativeGoogleCredentialState(): Promise<void> {
  try {
    await GoogleSignIn.signOut();
  } catch {
    // Supabase logout must remain successful even if native Google cleanup fails.
  }
}
