import { NextResponse } from 'next/server';
import { validateMasterCredentials, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const isValid = validateMasterCredentials(email, password);
    if (!isValid) {
      // Artificial delay to prevent brute-force timing attacks
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json(
        { error: 'Invalid executive credentials. Access denied.' },
        { status: 401 }
      );
    }

    const sessionToken = await createSessionToken(email);
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json({
      success: true,
      email: email.trim().toLowerCase(),
      message: 'Executive authentication verified. Console unlocked.',
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Authentication service encountered an unexpected error.' },
      { status: 500 }
    );
  }
}
