This is a React + Vite + TypeScript PWA using React Three Fiber
(Three.js) for 3D rendering and Firebase Firestore for the backend.

The app is "Tobu Farm of Fame" — a 3D low-poly bull farm for an
MBA section. Everything lives in a single 3D scene. No tabs or
navigation. The farm IS the app.

Key libraries:
- @react-three/fiber for 3D scene
- @react-three/drei for OrbitControls, Html, useGLTF, Environment
- firebase/firestore for real-time database
- zustand for state management
- howler for audio

Art style: Smooth low-poly 3D, flat shading, toy-like.
Color palette: Red #D50032, Yellow #FFCD00, Blue #004D98.

Rules:
- Functional components with hooks only
- Strict TypeScript, no 'any'
- Mobile-first, portrait orientation priority
- Use InstancedMesh for rendering multiple bulls (shared geometry)
- Use Zustand for shared state between 3D scene and UI overlays
