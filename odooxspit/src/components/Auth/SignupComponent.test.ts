/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/dom";
import { SignupComponent } from "./Signup";

// --- Mock alert ---
vi.spyOn(window, 'alert').mockImplementation(() => {});

// --- Mock API, Store, Router ---
vi.mock("../../services/api", () => ({
  api: {
    signup: vi.fn(),
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

describe("SignupComponent", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  // ------------------------------
  // Test 1: Successful signup
  // ------------------------------
  it("should signup successfully and navigate to dashboard", async () => {
    (api.signup as any).mockResolvedValue({
      data: { user: { id: 1, name: "John", email: "john@example.com", role: "inventory_manager" } },
    });

    const component = SignupComponent();
    document.body.appendChild(component);

    const nameInput = screen.getByLabelText("Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const roleSelect = screen.getByLabelText("Role");
    const signupButton = screen.getByRole("button", { name: "Sign Up" });

    fireEvent.input(nameInput, { target: { value: "John" } });
    fireEvent.input(emailInput, { target: { value: "john@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "password123" } });
    fireEvent.change(roleSelect, { target: { value: "inventory_manager" } });
    fireEvent.click(signupButton);

    await Promise.resolve();

    expect(api.signup).toHaveBeenCalledWith(
      "John",
      "john@example.com",
      "password123",
      "inventory_manager"
    );
    expect(store.setCurrentUser).toHaveBeenCalledWith({
      id: 1,
      name: "John",
      email: "john@example.com",
      role: "inventory_manager"
    });
    expect(router.setAuthState).toHaveBeenCalledWith(true);
    expect(router.navigate).toHaveBeenCalledWith("/dashboard");
  });

  // ------------------------------
  // Test 2: Failed signup
  // ------------------------------
  it("should show alert on signup failure", async () => {
    (api.signup as any).mockRejectedValue({
      response: { data: { message: "Email already exists" } },
    });

    const component = SignupComponent();
    document.body.appendChild(component);

    const nameInput = screen.getByLabelText("Name");
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    const roleSelect = screen.getByLabelText("Role");
    const signupButton = screen.getByRole("button", { name: "Sign Up" });

    fireEvent.input(nameInput, { target: { value: "John" } });
    fireEvent.input(emailInput, { target: { value: "john@example.com" } });
    fireEvent.input(passwordInput, { target: { value: "password123" } });
    fireEvent.change(roleSelect, { target: { value: "warehouse_staff" } });
    fireEvent.click(signupButton);

    await Promise.resolve();

    expect(api.signup).toHaveBeenCalledWith(
      "John",
      "john@example.com",
      "password123",
      "warehouse_staff"
    );
    expect(window.alert).toHaveBeenCalledWith("Email already exists");
  });

  // ------------------------------
  // Test 3: Navigate to login page
  // ------------------------------
  it("should navigate to login page when clicking login link", () => {
    const component = SignupComponent();
    document.body.appendChild(component);

    const loginLink = screen.getByText("Already have an account? Login");
    fireEvent.click(loginLink);

    expect(router.navigate).toHaveBeenCalledWith("/login");
  });
});
