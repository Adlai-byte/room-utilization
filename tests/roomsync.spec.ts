import { test, expect, Page } from "@playwright/test";

// Helper to login
async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.fill('input[id="username"]', username);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("1. App starts without errors", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("PA-Set").first()).toBeVisible();
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });
});

test.describe("2. Super Admin login - sees all buildings", () => {
  test("superadmin can login and see dashboard", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("All Buildings")).toBeVisible();
  });

  test("superadmin sees all building tabs on schedule", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await page.goto("/schedule");
    await expect(page.getByText("BSIT")).toBeVisible();
    await expect(page.getByText("BSCE")).toBeVisible();
    await expect(page.getByText("BSMATH")).toBeVisible();
    await expect(page.getByText("BITM")).toBeVisible();
  });
});

test.describe("3. Admin login - sees only own building", () => {
  test("bsit_admin can login and sees department scope", async ({ page }) => {
    await login(page, "bsit_admin", "bsit123");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("bsit_admin schedule shows only BSIT building", async ({ page }) => {
    await login(page, "bsit_admin", "bsit123");
    await page.goto("/schedule");
    await expect(page.getByText("BSIT")).toBeVisible();
    // Other buildings should not have clickable tabs
    const bsceTab = page.locator('[role="tab"]:has-text("BSCE")');
    await expect(bsceTab).toHaveCount(0);
  });
});

test.describe("4. Dashboard shows correct stats and charts", () => {
  test("dashboard displays stat cards", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await expect(page.getByText("Total Rooms")).toBeVisible();
    await expect(page.getByText("Average Utilization")).toBeVisible();
    await expect(page.getByText("Active Bookings")).toBeVisible();
    await expect(page.getByText("Available Now")).toBeVisible();
  });

  test("dashboard displays charts", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await expect(page.getByText("Weekly Utilization")).toBeVisible();
    await expect(page.getByText("Peak Hours")).toBeVisible();
    await expect(page.getByText("Room Rankings")).toBeVisible();
  });
});

test.describe("5. Room Schedule shows timetable", () => {
  test("schedule page shows timetable with time slots", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await page.goto("/schedule");
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible();
    // Should show time headers
    await expect(page.getByText("7:00 AM")).toBeVisible();
    await expect(page.getByText("12:00 PM")).toBeVisible();
    // Should show room names for BSIT (default selected)
    await expect(page.getByText("Room 101")).toBeVisible();
  });

  test("schedule shows bookings on timetable", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await page.goto("/schedule");
    await page.waitForTimeout(2000);
    await expect(page.getByText("CS101").first()).toBeVisible();
  });
});

test.describe("6. Booking conflict detection", () => {
  test("creating a conflicting booking via API returns 409", async ({ request }) => {
    // Login first to get session cookie
    const loginRes = await request.post("/api/auth", {
      data: { username: "superadmin", password: "admin123" },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Try to create a conflicting booking: Room 101 at 08:00-10:00 on 2026-03-11
    const bookRes = await request.post("/api/bookings", {
      data: {
        roomId: "r1",
        title: "Test Conflict",
        type: "event",
        instructor: "Test",
        date: "2026-03-11",
        startTime: "08:00",
        endTime: "10:00",
      },
    });
    expect(bookRes.status()).toBe(409);
    const body = await bookRes.json();
    expect(body.error).toContain("conflict");
    expect(body.conflicts).toBeDefined();
    expect(body.conflicts.length).toBeGreaterThan(0);
  });
});

test.describe("7. Recurring bookings", () => {
  test("booking form shows recurrence options for class type", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await page.goto("/bookings");
    await page.getByRole("button", { name: "New Booking" }).click();

    // Dialog should open
    await expect(page.getByRole("heading", { name: "New Booking" })).toBeVisible();

    // Class type should be default, recurrence section should show
    await expect(page.getByText("Recurrence")).toBeVisible();
    await expect(page.getByText("Mon")).toBeVisible();
    await expect(page.getByText("Tue")).toBeVisible();
    await expect(page.getByText("Wed")).toBeVisible();
  });
});

test.describe("8. Room management - role-based access", () => {
  test("super admin sees Add Room button", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await page.goto("/rooms");
    await expect(page.getByRole("button", { name: "Add Room" })).toBeVisible();
  });

  test("admin does NOT see Add Room button", async ({ page }) => {
    await login(page, "bsit_admin", "bsit123");
    await page.goto("/rooms");
    await expect(page.getByRole("heading", { name: "Rooms" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Room" })).toHaveCount(0);
  });

  test("rooms page shows room data", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    await page.goto("/rooms");
    await expect(page.getByText("Room 101")).toBeVisible();
    await expect(page.getByText("projector").first()).toBeVisible();
  });
});

test.describe("9. Navigation icons display correctly", () => {
  test("navbar shows all nav links with icons", async ({ page }) => {
    await login(page, "superadmin", "admin123");
    // Use the nav area to scope link checks (avoid logo link)
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Schedule" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Rooms", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Bookings" })).toBeVisible();
    // Each link should have an SVG icon
    for (const name of ["Dashboard", "Schedule", "Bookings"]) {
      await expect(nav.getByRole("link", { name }).locator("svg")).toBeVisible();
    }
  });
});

test.describe("10. Responsive on mobile viewport", () => {
  test("mobile viewport shows hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, "superadmin", "admin123");
    // Desktop nav links should be hidden (the md:flex container)
    const desktopNav = page.locator("nav .hidden.md\\:flex");
    await expect(desktopNav).not.toBeVisible();
    // Hamburger button should be visible
    const hamburger = page.locator('button[aria-label="Toggle menu"]');
    await expect(hamburger).toBeVisible();
    // Click hamburger to open mobile menu
    await hamburger.click();
    // Mobile menu should appear with Schedule link
    const mobileMenu = page.locator("nav").locator(".md\\:hidden").last();
    await expect(mobileMenu.getByRole("link", { name: "Schedule" })).toBeVisible();
  });
});
