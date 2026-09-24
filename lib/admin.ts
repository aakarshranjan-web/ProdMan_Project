/**
 * DEMO-ONLY admin credentials for the Edit/Delete approval popup.
 * This is not real security: the values ship to the browser in plain text.
 * Presenter: username "admin", password "admin123".
 */
export const DEMO_ADMIN_USERNAME = "admin";
export const DEMO_ADMIN_PASSWORD = "admin123";

export function isDemoAdmin(username: string, password: string) {
  return username.trim() === DEMO_ADMIN_USERNAME && password === DEMO_ADMIN_PASSWORD;
}
