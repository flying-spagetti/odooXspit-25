import { api } from '../../services/api';
import { router } from '../../router';

export function ForgotPasswordComponent(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'auth-container';

  container.innerHTML = `
    <div class="auth-card">
      <h1>StockMaster</h1>
      <h2>Reset Password</h2>
      <form id="forgot-password-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <button type="submit" class="btn btn-primary">Send OTP</button>
        <div id="otp-section" style="display: none;">
          <div class="form-group">
            <label for="otp">Enter OTP</label>
            <input type="text" id="otp" name="otp" maxlength="6" />
          </div>
          <div class="form-group">
            <label for="new-password">New Password</label>
            <input type="password" id="new-password" name="new-password" />
          </div>
          <button type="button" class="btn btn-primary" id="reset-password-btn">Reset Password</button>
        </div>
        <div class="auth-links">
          <a href="#" id="login-link">Back to Login</a>
        </div>
      </form>
    </div>
  `;

  const form = container.querySelector('#forgot-password-form') as HTMLFormElement;
  const otpSection = container.querySelector('#otp-section') as HTMLElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (container.querySelector('#email') as HTMLInputElement).value;
    try {
      const response = await api.forgotPassword(email);
      alert(response.data.message || 'OTP sent to your email');
      if (response.data.otp) {
        alert(`Development OTP: ${response.data.otp}`);
      }
      otpSection.style.display = 'block';
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send OTP');
    }
  });

  container.querySelector('#reset-password-btn')?.addEventListener('click', async () => {
    const email = (container.querySelector('#email') as HTMLInputElement).value;
    const otp = (container.querySelector('#otp') as HTMLInputElement).value;
    const newPassword = (container.querySelector('#new-password') as HTMLInputElement).value;
    
    try {
      await api.resetPassword(email, otp, newPassword);
      alert('Password reset successful!');
      router.navigate('/login');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reset password');
    }
  });

  container.querySelector('#login-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate('/login');
  });

  return container;
}

