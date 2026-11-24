import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../lib/auth';
import { SignUpPage } from '../pages/account/SignUpPage';

/** Registration when the API is down or slow (Vite/Nginx proxy answers 502/504). */
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function mockApi(register: () => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input).split('?')[0]!;
    if (path === '/api/customer/auth/session') return json(200, { customer: null, csrfToken: null });
    if (path === '/api/customer/auth/register' && init?.method === 'POST') return register();
    return json(404, {});
  });
}

async function fillForm() {
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignUpPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
  await userEvent.type(await screen.findByLabelText('Full name'), 'Kavya Rao');
  await userEvent.type(screen.getByLabelText('Email'), 'kavya@example.com');
  await userEvent.type(screen.getByLabelText('Mobile number'), '+91 98765 43210');
  await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), 'Green-Fields-2026');
  await userEvent.type(screen.getByLabelText('Confirm password', { selector: 'input' }), 'Green-Fields-2026');
}

const posts = (spy: ReturnType<typeof mockApi>) => spy.mock.calls.filter(([, init]) => init?.method === 'POST');

describe('sign-up when the API is unavailable', () => {
  it('says the service is unavailable (not "something went wrong") when the proxy answers 502', async () => {
    const spy = mockApi(async () => new Response('', { status: 502 })); // backend not running
    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('This service is temporarily unavailable. Please try again shortly.')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong on our side/)).toBeNull();
    expect(posts(spy)).toHaveLength(1);
  });

  it('sends one request for a double click or a repeated submit while the first is pending', async () => {
    let release!: (r: Response) => void;
    const spy = mockApi(() => new Promise<Response>((resolve) => (release = resolve)));
    await fillForm();
    const button = screen.getByRole('button', { name: 'Create account' });
    await userEvent.dblClick(button);
    // Two submit events in the same tick (e.g. Enter pressed twice before React re-renders).
    act(() => {
      fireEvent.submit(button.closest('form')!);
      fireEvent.submit(button.closest('form')!);
    });
    expect(posts(spy)).toHaveLength(1);
    await act(async () => release(json(202, { message: 'Check your inbox.' })));
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
  });
});
