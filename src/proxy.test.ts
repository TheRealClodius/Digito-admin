import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

function makeRequest(path: string, cookies?: Record<string, string>) {
  const url = `http://localhost:3000${path}`;
  const headers = new Headers();
  if (cookies) {
    const cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('Cookie', cookieStr);
  }
  return new NextRequest(url, { headers });
}

describe('proxy', () => {
  it('allows /login without session cookie', () => {
    const res = proxy(makeRequest('/login'));
    // NextResponse.next() has no Location header
    expect(res.headers.get('Location')).toBeNull();
  });

  it('allows /unauthorized without session cookie', () => {
    const res = proxy(makeRequest('/unauthorized'));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('allows /auth/callback without session cookie', () => {
    const res = proxy(makeRequest('/auth/callback'));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('allows /api/ routes without session cookie', () => {
    const res = proxy(makeRequest('/api/check-permissions'));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('allows webhook routes without session cookie', () => {
    const res = proxy(makeRequest('/api/webhooks/auth/verify-user'));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('redirects dashboard routes to /login when no session cookie', () => {
    const res = proxy(makeRequest('/'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('Location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('/');
  });

  it('redirects nested dashboard routes to /login with redirect param', () => {
    const res = proxy(makeRequest('/clients/abc/events'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('Location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('redirect')).toBe('/clients/abc/events');
  });

  it('allows dashboard routes when session cookie is present', () => {
    const res = proxy(makeRequest('/', { 'gg-session': '1' }));
    expect(res.headers.get('Location')).toBeNull();
  });

  it('allows nested dashboard routes when session cookie is present', () => {
    const res = proxy(makeRequest('/clients/abc/events', { 'gg-session': '1' }));
    expect(res.headers.get('Location')).toBeNull();
  });
});
