# Steam Screensavers

A collection of space-themed screensavers for Steam Deck and other devices that support Steam's screensaver feature. Pick a quiet flight through the stars, a moving abstract sculpture, or a little space station with a life of its own.

They start automatically when Steam activates the screensaver. There are no buttons to press or setup screens to get through, and no internet connection is needed once they are installed.

## Included screensavers

### [The Little Space Station](little-space-station/)

Watch Pip, a small maintenance robot, look after a station above a colorful planet. Ships visit, packages are delivered, equipment needs attention, and Pip sometimes takes a rest and dreams. The planet changes with the seasons, and the station has seasonal decorations and short stories.

This is a slow-moving scene, not a constant show: quiet stretches are intentional. Some stories are tied to particular dates and years, including autumn and Thanksgiving 2026, so you will not see everything on every visit.

### [Deep Field](starfield-screensaver/)

A flight through a field of stars, with a softly cloudy background and occasional shooting stars. This is the classic starfield choice.

### [Monolith Drift](monolith-drift/)

A floating, slowly turning 3D monolith above a grid, surrounded by drifting particles. A simple geometric scene with gentle movement.

### [Orbital Bloom](orbital-bloom/)

A glowing, twisting 3D shape surrounded by orbital rings, small moving lights, and particles. A more abstract, colorful space sculpture.

## Install on Steam Deck

You need a Steam version that includes screensavers. If **Settings → Customization** does not have screensaver settings, update Steam first. Valve describes this feature and the custom screensaver folder in its [Steam Deck update notes](https://www.steamdeck.com/en/news?p=2).

1. Switch your Steam Deck to **Desktop Mode**.
2. Open [this project's GitHub page](https://github.com/CobraA1/steam-screensavers), select the green **Code** button, and choose **Download ZIP**.
3. Open the downloaded ZIP and extract it. Inside the extracted project folder, find the screensaver folders listed above.
4. Open **Dolphin**, the file manager. Press **Ctrl+L**, paste this folder location, and press Enter:

   ```text
   ~/.steam/root/config/uioverrides/screensavers/
   ```

   If the folder does not exist, open `~/.steam/root/config/` first, then create a folder named `uioverrides` and a folder named `screensavers` inside it.

5. Copy the **whole folder** for each screensaver you want into `screensavers`. Keep its name and everything inside it. You can install any or all four.
6. Return to **Gaming Mode**, open **Settings → Customization**, and select your screensaver. Choose how long Steam should wait before showing it using the available idle-time settings.

For example, installing The Little Space Station should give you this file:

```text
~/.steam/root/config/uioverrides/screensavers/little-space-station/index.html
```

Do not copy just `index.html`, and do not put the outer `steam-screensavers-main` download folder inside the screensaver folder. Each individual screensaver folder must sit directly inside `screensavers`.

You do not need Decky Loader, a separate app, or changes to SteamOS system files.

## Install on other supported devices

These are Steam screensavers, not Windows or desktop lock-screen screensavers. Your device needs Steam's custom screensaver support, normally used through **Big Picture Mode**.

Download and extract the project as above. In your Steam installation folder, open or create `config/uioverrides/screensavers`, and copy the individual screensaver folders there. On Windows, a typical location is:

```text
C:\Program Files (x86)\Steam\config\uioverrides\screensavers\
```

Use your actual Steam installation location if it is different. On Linux, `~/.steam/root/config/uioverrides/screensavers/` is the usual location; installations managed by another app may store Steam elsewhere.

Open Steam's Big Picture Mode and look under **Settings → Customization** to select the screensaver. Steam Deck is the main development device; appearance and performance on other devices may vary.

## Settings, updates, and removal

- **Change settings:** Each screensaver has a `config.js` file. Open it in a text editor and follow the comments to change the available settings. Make a backup first. Restart the screensaver to see changes; there is no settings menu inside it.
- **Update:** Download a fresh copy and replace the installed screensaver folder. Save any edited `config.js` first, then reapply your choices to the new version.
- **Remove:** Choose another screensaver in Steam, then delete only the folder for the screensaver you no longer want.

The Little Space Station saves some story progress locally. This is not a Steam Cloud save, and clearing Steam's stored browser data may reset it.

## If something does not work

- **Not listed in Steam?** Check the folder layout above and make sure the ZIP was extracted. Try restarting Steam after copying the files.
- **Blank or incomplete picture?** Copy the entire screensaver folder again, including all its smaller folders, and check for Steam updates.
- **It disappears when you move the mouse or press a button?** That is normal: Steam handles waking up from the screensaver.
- **Want to try it in Desktop Mode?** The optional [preview guide](PREVIEW.md) explains how to use the included preview tool. It is not needed for installation. Opening the HTML file directly in a browser may not work for every screensaver.

If you report a problem, include your device, the screensaver name, your Steam version, and a screenshot if possible.

## License

These screensavers are shared under the [MIT License](LICENSE). You may use, modify, and share them under its terms. Included third-party libraries retain their own license notices.

This is a community project, not an official Valve product.
