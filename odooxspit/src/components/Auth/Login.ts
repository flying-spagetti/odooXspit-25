import { store } from '../../store/api-store';
import { api } from '../../services/api';
import { router } from '../../router';

export function LoginComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';
  container.style.position = 'relative';
  container.style.background = '#fefcff';

  let loginMode: 'password' | 'otp' = 'password';
  let otpRequested = false;

  function renderLoginForm() {
    container.innerHTML = `
      <div class="auth-background" style="
        position: absolute;
        inset: 0;
        z-index: 0;
        background-image: 
          radial-gradient(circle at 30% 70%, rgba(173, 216, 230, 0.35), transparent 60%),
          radial-gradient(circle at 70% 30%, rgba(255, 182, 193, 0.4), transparent 60%);
      "></div>
      <div class="auth-card" style="position: relative; z-index: 1;">
        <h1>StockMaster</h1>
        <h2>Login</h2>
        <div class="login-mode-toggle" style="margin-bottom: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
          <button type="button" class="btn btn-sm ${loginMode === 'password' ? 'btn-primary' : 'btn-secondary'}" id="password-mode-btn">Password</button>
          <button type="button" class="btn btn-sm ${loginMode === 'otp' ? 'btn-primary' : 'btn-secondary'}" id="otp-mode-btn">OTP</button>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required />
          </div>
          ${loginMode === 'password' ? `
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" required />
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
          ` : `
            <div class="form-group" id="otp-group" style="${otpRequested ? '' : 'display: none;'}">
              <label for="otp">Enter OTP</label>
              <input type="text" id="otp" name="otp" placeholder="000000" maxlength="6" pattern="[0-9]{6}" />
              <small style="display: block; margin-top: 0.25rem; color: #666;">Check your email for the 6-digit code</small>
            </div>
            ${!otpRequested ? `
              <button type="button" class="btn btn-primary" id="request-otp-btn">Send OTP</button>
            ` : `
              <button type="submit" class="btn btn-primary">Verify OTP & Login</button>
              <button type="button" class="btn btn-secondary" id="resend-otp-btn" style="margin-top: 0.5rem;">Resend OTP</button>
            `}
          `}
          <div class="auth-links">
            ${loginMode === 'password' ? '<a href="#" id="forgot-password">Forgot Password?</a>' : ''}
            <a href="#" id="signup-link">Don't have an account? Sign up</a>
          </div>
        </form>
      </div>
    `;

    attachEventListeners();
  }

  function attachEventListeners() {
    const form = container.querySelector('#login-form') as HTMLFormElement;
    const passwordModeBtn = container.querySelector('#password-mode-btn');
    const otpModeBtn = container.querySelector('#otp-mode-btn');
    const requestOtpBtn = container.querySelector('#request-otp-btn');
    const resendOtpBtn = container.querySelector('#resend-otp-btn');

    // Mode toggle
    passwordModeBtn?.addEventListener('click', () => {
      loginMode = 'password';
      otpRequested = false;
      renderLoginForm();
    });

    otpModeBtn?.addEventListener('click', () => {
      loginMode = 'otp';
      otpRequested = false;
      renderLoginForm();
    });

    // Request OTP
    requestOtpBtn?.addEventListener('click', async () => {
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const email = emailInput?.value;

      if (!email) {
        alert('Please enter your email address');
        return;
      }

      try {
        const response = await api.requestLoginOTP(email);
        if (response.data.status === 'success') {
          otpRequested = true;
          renderLoginForm();
          alert('OTP sent to your email! Please check your inbox.');
        }
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to send OTP');
      }
    });

    // Resend OTP
    resendOtpBtn?.addEventListener('click', async () => {
      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const email = emailInput?.value;

      if (!email) {
        alert('Please enter your email address');
        return;
      }

      try {
        const response = await api.requestLoginOTP(email);
        if (response.data.status === 'success') {
          alert('OTP resent to your email!');
        }
      } catch (error: any) {
        alert(error.response?.data?.message || 'Failed to resend OTP');
      }
    });

    // Form submission
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const email = formData.get('email') as string;

      try {
        if (loginMode === 'password') {
          const password = formData.get('password') as string;
          const response = await api.login(email, password);
          if (response.data.user) {
            store.setCurrentUser(response.data.user);
            router.setAuthState(true);
            router.navigate('/dashboard');
          }
        } else {
          // OTP mode
          const otp = formData.get('otp') as string;
          if (!otp || otp.length !== 6) {
            alert('Please enter a valid 6-digit OTP');
            return;
          }
          const response = await api.verifyLoginOTP(email, otp);
          if (response.data.user) {
            store.setCurrentUser(response.data.user);
            router.setAuthState(true);
            router.navigate('/dashboard');
          }
        }
      } catch (error: any) {
        alert(error.response?.data?.message || 'Login failed');
      }
    });

    container.querySelector('#signup-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate('/signup');
    });

    container.querySelector('#forgot-password')?.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate('/forgot-password');
    });
  }

  renderLoginForm();
  return container;
}
