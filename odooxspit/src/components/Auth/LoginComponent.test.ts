/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/dom";
import { LoginComponent } from "./Login";

// --- Mock alert ---
vi.spyOn(window, 'alert').mockImplementation(() => {});

// --- Mock API, Store, Router ---
vi.mock("../../services/api", () => ({
  api: {
    login: vi.fn(),
  },
}));

vi.mock("../../store/api-store", () => ({
  store: {
    setCurrentUser: vi.fn(),
  },
}));

vi.mock("../../router", () => ({
  router: {
    navigate: vi.fn(),
    setAuthState: vi.fn(),
  },
}));

import { api } from "../../services/api";
import { store } from "../../store/api-store";
import { router } from "../../router";

describe("LoginComponent", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  // ------------------------------
  // Test 1: Successful login
  // ------------------------------
  it("should login successfully and navigate to dashboard", async () => {
    (api.login as any).mockResolvedValue({
      data: { user: { id: 1, email: "test@example.com" } },
    });

    const component = LoginComponent();
    document.body.appendChild(component);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const loginButton = screen.getByRole("button", { name: "Login" });

    fireEvent.input(emailInput, { target: { value: "test@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "password123" } });
    fireEvent.click(loginButton);

    await Promise.resolve();

    expect(api.login).toHaveBeenCalledWith("test@example.com", "password123");
    expect(store.setCurrentUser).toHaveBeenCalledWith({ id: 1, email: "test@example.com" });
    expect(router.setAuthState).toHaveBeenCalledWith(true);
    expect(router.navigate).toHaveBeenCalledWith("/dashboard");
  });

  // ------------------------------
  // Test 2: Failed login
  // ------------------------------
  it("should show alert on login failure", async () => {
    (api.login as any).mockRejectedValue({
      response: { data: { message: "Invalid credentials" } },
    });

    const component = LoginComponent();
    document.body.appendChild(component);

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const loginButton = screen.getByRole("button", { name: "Login" });

    fireEvent.input(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "wrongpass" } });
    fireEvent.click(loginButton);

    await Promise.resolve();

    expect(api.login).toHaveBeenCalledWith("wrong@example.com", "wrongpass");
    expect(window.alert).toHaveBeenCalledWith("Invalid credentials");
  });

  // ------------------------------
  // Test 3: Navigate to signup page
  // ------------------------------
  it("should navigate to signup page when clicking signup link", () => {
    const component = LoginComponent();
    document.body.appendChild(component);

    const signupLink = screen.getByText("Don't have an account? Sign up");
    fireEvent.click(signupLink);

    expect(router.navigate).toHaveBeenCalledWith("/signup");
  });

  // ------------------------------
  // Test 4: Navigate to forgot password page
  // ------------------------------
  it("should navigate to forgot-password page when clicking forgot password link", () => {
    const component = LoginComponent();
    document.body.appendChild(component);

    const forgotLink = screen.getByText("Forgot Password?");
    fireEvent.click(forgotLink);

    expect(router.navigate).toHaveBeenCalledWith("/forgot-password");
  });
});
