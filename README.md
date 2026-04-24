# Friends Rating Sort for Letterboxd

A Chrome extension that adds a button to any Letterboxd list to sort films by your friends' average rating, with a score badge on each poster.

<img width="865" height="818" alt="image" src="https://github.com/user-attachments/assets/27c67bde-6747-47a1-85cb-c45165c83203" />

## Features

- Works on **any** Letterboxd list page (yours or someone else's)
- Sorts by the average rating of **your** friends (people you follow)
- Shows a rating badge on each poster
- Handles multi-page lists automatically
- Only runs when you click the button — no slowdown on page load

## Installation

This extension is not on the Chrome Web Store. You need to load it manually as an unpacked extension.

### Requirements

- Google Chrome (or any Chromium-based browser: Brave, Edge, Arc, etc.)
- A Letterboxd account
- You must be **logged in** to Letterboxd for the extension to work

### Steps

1. Download this repository and unzip it, or clone it.

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** using the toggle in the top-right corner

4. Click **Load unpacked** and select the folder you just downloaded/cloned

5. The extension is now installed. Navigate to any Letterboxd list and you'll see the button above the film grid.

## Usage

1. Go to any Letterboxd list page, e.g. `https://letterboxd.com/username/list/some-list/`
2. Make sure you're logged in to Letterboxd
3. Click the **⭐ Sort by friends avg rating** button above the film grid
4. Wait while it fetches ratings — a progress bar shows how far along it is
5. Films are sorted highest-to-lowest. Films with no friend ratings are moved to the end. Each poster shows the average score and a tooltip with the number of ratings.

> **Note:** The more films in the list and the more friends you have, the longer it takes. A 100-film list with 50 friends may take a minute or two.

## How it works

For each film in the list, the extension visits your Letterboxd friends page for that film (`letterboxd.com/YOUR_USERNAME/friends/film/SLUG`) and reads the ratings table. It then calculates the average and re-orders the DOM accordingly.

No data is sent anywhere — everything runs locally in your browser.

## Known limitations

- Only works on list pages (`/username/list/list-name/`), not on watchlists or other film grids
- Requires you to be logged in — ratings are fetched from your personal friends page
- Letterboxd does not have a public API, so the extension scrapes HTML pages. If Letterboxd changes their markup it may stop working.

## Contributing

Pull requests are welcome! If the extension breaks due to a Letterboxd markup change, please open an issue or submit a fix.
