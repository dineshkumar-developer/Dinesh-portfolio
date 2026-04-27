# Dinesh Kumar S Portfolio

A production-ready static portfolio site for a game developer and frontend application developer. The project is a merged single-site version with two selectable visual themes: Aurora and Space. It is optimized for static hosting on GitHub Pages and similar platforms.

## Stack

- HTML
- CSS
- JavaScript
- ES modules
- GSAP / ScrollTrigger
- Canvas 2D particles
- Optional Three.js Space background

## Project Structure

```text
/
├── assets/
│   ├── fonts/
│   ├── icons/
│   ├── images/
│   └── vendor/
│       ├── fonts/
│       ├── gsap/
│       └── three/
├── css/
│   └── themes/
│       ├── aurora.css
│       └── space.css
├── js/
│   ├── background/
│   ├── modules/
│   └── script.js
├── about-site.html
├── package.json
├── README.md
├── .nojekyll
└── index.html
```

## Local Preview

Open the site through a local static server so ES modules and dynamic imports behave the same way they do in production.

Example with Python:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173/`.

## GitHub Pages Deployment

1. Push this project to a GitHub repository.
2. Open the repository on GitHub.
3. Go to `Settings`.
4. Open `Pages`.
5. Under `Build and deployment`, choose `Deploy from a branch`.
6. Select the `main` branch.
7. Select the `/ (root)` folder.
8. Save the configuration.
9. For a user site, access the deployed site at `https://username.github.io/`.
10. For a project site, access it at `https://username.github.io/repository-name/`.

If you publish from a repository project page such as `https://username.github.io/repository-name/`, the current build still works because all site links use relative paths.

## Production Notes

- `index.html` stays at the publishing source root for GitHub Pages compatibility.
- Theme CSS is stored in `css/themes/`.
- JavaScript modules are stored in `js/`.
- Shared static assets live under `assets/`.
- All local CSS, JavaScript, and asset references use relative paths.
- `.nojekyll` is included so GitHub Pages serves static files directly.
- ADLaM Display, GSAP, ScrollTrigger, and Three.js are vendored under `assets/vendor/` so the deployed site is not dependent on runtime CDN access.
- Space imports Three.js only when the Space theme is active.

## Before Publishing

- Confirm the phone, email, and location in `index.html`.
- Confirm the title, meta description, and public contact information.
- Test both Aurora and Space themes after deployment.

## Final Checklist

- Site loads without console errors.
- Theme switch works.
- Mobile menu opens in portrait and landscape.
- Layout works on mobile, tablet, and desktop.
- All paths remain relative for static hosting.
