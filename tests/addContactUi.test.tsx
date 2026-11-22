// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { useEffect } from "react";
import { StoreProvider, useStore } from "../src/store";
import { CustomerDetailPage } from "../src/pages/CustomerDetail";

function Workspace() {
  const { route, navigate } = useStore();
  useEffect(() => {
    navigate({ name: "customer", id: "c_brio" });
  }, [navigate]);
  return route.name === "customer" ? <CustomerDetailPage id={route.id} tab={route.tab} /> : null;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

test("Add contact stays in My Workspace and saves searchable external contacts", async () => {
  const view = render(
    <StoreProvider>
      <Workspace />
    </StoreProvider>,
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Add contact" }));
  expect(screen.getByRole("tab", { name: "Add contact" }).getAttribute("aria-selected")).toBe(
    "true",
  );
  expect(screen.getByText("Directory")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "External contacts" })).toBeTruthy();
  fireEvent.click(screen.getAllByRole("button", { name: "Add contact" })[0]);
  const dialog = screen.getByRole("dialog", { name: "Add external contact" });
  fireEvent.change(within(dialog).getByRole("textbox", { name: /Name/ }), {
    target: { value: "Avery Client" },
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: /Work email/ }), {
    target: { value: "avery@brio.co.in" },
  });
  fireEvent.change(within(dialog).getByRole("textbox", { name: /Mobile number/ }), {
    target: { value: "+91 98765 43210" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add contact" }));
  expect(await within(dialog).findByRole("alert")).toHaveProperty(
    "textContent",
    expect.stringContaining("workspace directory"),
  );
  fireEvent.change(within(dialog).getByRole("textbox", { name: /Work email/ }), {
    target: { value: "avery@client.example" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add contact" }));
  const table = await screen.findByRole("table", { name: "External contacts" });
  expect(within(table).getByText("Avery Client")).toBeTruthy();
  expect(within(table).getByText("+91 98765 43210")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Add contact" }));
  const phoneOnly = screen.getByRole("dialog", { name: "Add external contact" });
  fireEvent.change(within(phoneOnly).getByRole("textbox", { name: /Name/ }), {
    target: { value: "Morgan POC" },
  });
  fireEvent.change(within(phoneOnly).getByRole("textbox", { name: /Mobile number/ }), {
    target: { value: "+91 98765 43211" },
  });
  fireEvent.click(within(phoneOnly).getByRole("button", { name: "Add contact" }));
  expect(await screen.findByText("Morgan POC")).toBeTruthy();
  await waitFor(() =>
    expect(localStorage.getItem("brio-customer-portal-test-v1")).toContain("avery@client.example"),
  );
  fireEvent.change(screen.getByRole("searchbox", { name: "Search external contacts" }), {
    target: { value: "missing" },
  });
  expect(screen.getByText("No matching contacts")).toBeTruthy();
  view.unmount();
  render(
    <StoreProvider>
      <Workspace />
    </StoreProvider>,
  );
  fireEvent.click(await screen.findByRole("tab", { name: "Add contact" }));
  expect(await screen.findByText("Avery Client")).toBeTruthy();
});
