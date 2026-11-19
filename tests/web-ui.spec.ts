import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class SuspendedAudioContext {
      state = "suspended";

      resume(): Promise<void> {
        return new Promise(() => {});
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: SuspendedAudioContext,
    });
  });
  await page.goto("/");
});

const recordInterruptedWork = async (page: Page): Promise<void> => {
  await page.locator("#task").fill("UI behavior check");
  await page.locator("#start").click();
  await page.locator("#finish").click();
  await page.locator("#interrupt-work").click();
  await page.locator("#end-note").fill("Unexpected interruption");
  await page.locator("#save-end").click();
};

test("starts the timer while audio unlock is still pending", async ({ page }) => {
  await page.locator("#task").fill("UI behavior check");
  await page.locator("#start").click();

  await expect(page.locator("#finish")).toBeEnabled();
  await expect(page.locator("#state")).toContainText("Focusing");
  await expect(page.locator("#error")).toBeHidden();
});

test("records an interruption and copies its Markdown log", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://127.0.0.1:8788",
  });
  await recordInterruptedWork(page);

  const entry = page.locator(".history-entry");
  await expect(entry).toBeVisible();
  await entry.locator("summary").click();
  const markdown = page.locator(".log-markdown");
  await expect(markdown).toHaveAttribute("readonly", "");
  await expect(markdown).toHaveValue(/ \[Outcome:: interrupted\] /);
  await expect(markdown).toHaveValue(/ \[WorkNote:: Unexpected interruption\] /);
  const expectedMarkdown = await markdown.inputValue();

  await entry.getByRole("button", { name: "Copy Markdown" }).click();
  await expect(page.locator("#error")).toHaveText("Markdown log copied.");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(expectedMarkdown);
});

test("clears browser logs only after confirmation", async ({ page }) => {
  await recordInterruptedWork(page);
  const clearButton = page.locator("#clear-logs");
  const dialog = page.locator("#clear-logs-dialog");

  await expect(clearButton).toBeEnabled();
  await clearButton.click();
  await expect(dialog).toBeVisible();
  await page.locator("#cancel-clear-logs").click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".history-entry")).toHaveCount(1);

  await page.locator("#task").fill("Current work");
  await page.locator("#start").click();
  await expect(page.locator("#finish")).toBeEnabled();
  await clearButton.click();
  await page.locator("#confirm-clear-logs").click();

  await expect(page.locator(".history-entry")).toHaveCount(0);
  await expect(page.locator("#history-empty")).toBeVisible();
  await expect(page.locator("#finish")).toBeEnabled();
  await page.reload();
  await expect(page.locator(".history-entry")).toHaveCount(0);
  await expect(page.locator("#finish")).toBeEnabled();
  await expect(page.locator("#task")).toBeDisabled();
  await expect(page.locator("#task")).toHaveValue("Current work");
});

test("uses vibration when selected and reports unsupported devices", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: VibratePattern) => {
        document.documentElement.dataset.vibrationPattern = String(pattern);
        return true;
      },
    });
  });
  await page.reload();
  await page.locator(".settings summary").click();
  await page.locator("#alarm-mode").selectOption("vibration");
  await expect(page.locator("#volume-setting")).toBeHidden();
  await page.locator("#preview").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-vibration-pattern",
    "240,100,240",
  );

  await page.evaluate(() => {
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: () => false,
    });
  });
  await page.locator("#preview").click();
  await expect(page.locator("#error")).toContainText(
    "Vibration is unavailable in this browser or device.",
  );
});

test("notifies at focus and break completion after explicit permission", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-19T10:00:00") });
  await page.addInitScript(() => {
    let permission: NotificationPermission = "default";
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return permission;
        },
        requestPermission: async (): Promise<NotificationPermission> => {
          document.documentElement.dataset.notificationPermissionRequested = "true";
          permission = "granted";
          return permission;
        },
      },
    });
    Object.defineProperty(ServiceWorkerRegistration.prototype, "showNotification", {
      configurable: true,
      value: (_title: string, options?: NotificationOptions): Promise<void> => {
        document.documentElement.dataset.lastNotification = options?.body ?? "";
        return Promise.resolve();
      },
    });
  });
  await page.reload();
  await page.locator(".settings summary").click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const notifications = page.locator("#notifications-enabled");
  await expect(notifications).not.toBeChecked();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-notification-permission-requested",
  );
  await notifications.check();
  await expect(notifications).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute(
    "data-notification-permission-requested",
    "true",
  );

  await page.locator("#focus-minutes").fill("1");
  await page.locator("#focus-minutes").dispatchEvent("change");
  await page.locator("#break-minutes").fill("1");
  await page.locator("#break-minutes").dispatchEvent("change");
  await page.locator("#task").fill("Notification test");
  await page.locator("#start").click();
  await page.clock.fastForward(60_100);
  await expect(page.locator("html")).toHaveAttribute(
    "data-last-notification",
    "Focus time is over.",
  );

  await page.locator("#finish").click();
  await page.locator("#complete-work").click();
  await page.clock.fastForward(60_100);
  await expect(page.locator("html")).toHaveAttribute(
    "data-last-notification",
    "Break time is over.",
  );
});

test("loads the installed app shell while offline", async ({ context, page }) => {
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "./manifest.webmanifest",
  );
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  const manifest: unknown = JSON.parse(await manifestResponse.text());
  expect(manifest).toMatchObject({ display: "standalone" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const cachedAppShell = await page.evaluate(async () =>
    Boolean(await caches.match(new URL("./index.html", window.location.href).href)),
  );
  expect(cachedAppShell).toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#start")).toBeVisible();
  await context.setOffline(false);
});
