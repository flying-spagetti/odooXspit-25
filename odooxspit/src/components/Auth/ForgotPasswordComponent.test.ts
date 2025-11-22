/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/dom";
import { ForgotPasswordComponent } from "./ForgotPassword";

// --- Mock alert ---
vi.spyOn(window, 'alert').mockImplementation(() => {});

// --- Mock API and Router ---
vi.mock("../../services/api", () => ({
  api: {
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock("../../router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

import { api } from "../../services/api";
import { router } from "../../router";

describe("ForgotPasswordComponent", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  // ------------------------------
  // Test 1: Send OTP + Show OTP section
  // ------------------------------
  it("should send OTP and show OTP section", async () => {
    (api.forgotPassword as any).mockResolvedValue({
      data: { message: "OTP sent!", otp: "123456" },
    });

    const component = ForgotPasswordComponent();
    document.body.appendChild(component);

    const emailInput = screen.getByLabelText("Email");
    const sendOtpButton = screen.getByText("Send OTP");

    fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(sendOtpButton);

    await Promise.resolve(); // wait for async

    expect(api.forgotPassword).toHaveBeenCalledWith("test@example.com");

    const otpSection = document.querySelector("#otp-section") as HTMLElement;
    expect(otpSection.style.display).toBe("block");
  });

  // ------------------------------
  // Test 2: Reset password + navigate
  // ------------------------------
  it("should reset password and navigate to login", async () => {
    (api.resetPassword as any).mockResolvedValue({ data: {} });

    const component = ForgotPasswordComponent();
    document.body.appendChild(component);

    const emailInput = screen.getByLabelText("Email");
    const otpInput = screen.getByLabelText("Enter OTP");
    const newPassInput = screen.getByLabelText("New Password");

    // make OTP section visible
    const otpSection = document.querySelector("#otp-section") as HTMLElement;
    otpSection.style.display = "block";

    fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    fireEvent.input(otpInput, { target: { value: "123456" } });
    fireEvent.input(newPassInput, { target: { value: "newpass123" } });

    // --- Select button by role to avoid the <h2> conflict ---
    const resetBtn = screen.getByRole("button", { name: "Reset Password" });
    fireEvent.click(resetBtn);

    await Promise.resolve();

    expect(api.resetPassword).toHaveBeenCalledWith(
      "test@example.com",
      "123456",
      "newpass123"
    );

    expect(router.navigate).toHaveBeenCalledWith("/login");
  });

  // ------------------------------
  // Test 3: Navigate to Login link
  // ------------------------------
  it("should navigate to login page when clicking Back to Login", () => {
    const component = ForgotPasswordComponent();
    document.body.appendChild(component);

    const loginLink = screen.getByText("Back to Login");
    fireEvent.click(loginLink);

    expect(router.navigate).toHaveBeenCalledWith("/login");
  });
});
