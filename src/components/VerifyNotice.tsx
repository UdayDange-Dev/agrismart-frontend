import { useState } from 'react';
import { ApiError } from '../api/client';
import { customerApi } from '../api/customer';
import { rememberReturnPath } from '../lib/redirect';

/** Reminds a signed-in customer to confirm their email, with a "resend" button. */
export function VerifyNotice({ message, returnTo }: { message: string; returnTo?: string }) {
  const [state, setState] = useState<{ message?: string; error?: ApiError; busy?: boolean }>({});
  return (
    <div className="notice notice-warning" role="status">
      <p>
        {message}{' '}
        <button
          type="button"
          className="link-button link-button-plain"
          disabled={state.busy}
          onClick={async () => {
            // The confirmation link may open in a new tab; it offers to continue from here.
            if (returnTo) rememberReturnPath(returnTo);
            setState({ busy: true });
            try {
              setState({ message: (await customerApi.resendVerification()).message });
            } catch (err) {
              setState({ error: err instanceof ApiError ? err : new ApiError(0, 'unknown', 'Could not send the email.') });
            }
          }}
        >
          Resend confirmation email
        </button>
      </p>
      {state.message ? <p className="small">{state.message}</p> : null}
      {state.error ? <p className="small field-error">{state.error.message}</p> : null}
    </div>
  );
}
