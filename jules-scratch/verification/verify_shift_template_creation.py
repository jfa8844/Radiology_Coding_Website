from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # The app will redirect to index.html for login first.
    page.goto("file:///app/index.html")

    # Log in
    page.get_by_label("Email").fill("user@example.com")
    page.get_by_label("Password").fill("password")
    page.get_by_role("button", name="Login").click()

    # Wait for navigation to the start page
    expect(page).to_have_url("file:///app/start.html", timeout=10000)

    # Start a new shift
    page.get_by_role("button", name="Start New Shift").click()

    # Now we should be on the main page, wait for it to load
    expect(page).to_have_url("file:///app/main.html", timeout=10000)

    # Interact with the shift title input
    shift_title_input = page.get_by_label("Shift Title")

    # Type a new, non-existent shift title
    new_title = "New Test Location"
    shift_title_input.fill(new_title)

    # Click away to trigger the 'blur' event
    page.get_by_label("Shift Type").click()

    # The modal should now be visible
    modal = page.locator("#new-shift-template-modal")
    expect(modal).to_be_visible()

    # Check the content of the modal
    expect(modal.locator("h2")).to_have_text("Create New Shift Location?")
    expect(modal.locator("#new-template-name")).to_have_text(new_title)

    # Take a screenshot of the modal
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
