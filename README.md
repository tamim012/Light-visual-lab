# Light Visual Lab — আলোক পরীক্ষাগার

A Bangla-first interactive web app for Class 9–10 reflection and refraction.

## Included in this MVP
- Plane, concave and convex mirror controls.
- Object distance, focal length and object height controls.
- Drag the object arrow left/right along the principal axis; image position, size and nature update live.
- Image position, image size, magnification and image nature (real/virtual, upright/inverted, same/enlarged/diminished).
- Mirror-equation based calculation and principal-ray diagrams, including dashed backward extensions for virtual images.
- Refraction between air, water and glass using Snell's law.
- Total internal reflection and critical-angle display.
- Bangla/English UI toggle, formula guide and quiz.
- Responsive desktop/mobile layout.
- Vitest equation tests.

## Run locally
Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Build for deployment
```bash
npm run build
npm run preview
```

The production site is generated in `dist/`. Deploy that folder to GitHub Pages, Netlify, Vercel or another static hosting provider.

## Run physics tests
```bash
npm test
```

## Physics conventions and limitations
- Mirror equation uses positive magnitude distances for a real object. Concave focal length is positive, convex focal length is negative; real image distance is positive and virtual image distance is negative.
- Plane mirror is handled separately.
- The image cards calculate position, absolute image height, magnification, orientation and real/virtual nature.
- Refraction uses Snell's law and checks for total internal reflection.
- The mirror canvas uses the standard Class 9–10 paraxial principal-ray rules: parallel ray, focus ray, pole ray, and centre-of-curvature ray where applicable. Concave-mirror virtual images use dashed backward extensions; convex-mirror F and C are shown only behind the mirror. Dragging the object updates the mirror-equation image and diagram live. This is an idealized teaching diagram, not a full numerical spherical-surface tracer, and should not be used for precision optical engineering.
- The current MVP has no server, account system, analytics or cloud storage.
