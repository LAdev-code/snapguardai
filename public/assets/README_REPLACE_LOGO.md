Place your provided PNG logo and favicon here to use as the project logo and favicon.

Files to add (recommended sizes):
- public/assets/snapguard-logo-512.png  (512×512 source PNG)
- public/assets/snapguard-logo-192.png  (192×192 for Android/Apple)
- public/favicon.ico                    (favicon ICO)

Generate `favicon.ico` from PNG (example using ImageMagick):

```powershell
magick convert public/assets/snapguard-logo-512.png -resize 64x64 -background transparent -gravity center -extent 64x64 public/favicon.ico
```

Or create PNG favicon versions:

```powershell
magick convert public/assets/snapguard-logo-512.png -resize 32x32 public/favicon-32.png
magick convert public/assets/snapguard-logo-512.png -resize 16x16 public/favicon-16.png
```

After adding your files, you can remove or replace the SVG placeholders at:
- public/assets/snapguard-logo.svg
- public/favicon.svg
