# Beau AI: Your Beauty Legend

Build me a mobile app called "Beau AI" - The Cosmetic Legend.



**CORE IDEA:**

An AI beauty assistant that analyzes your face in real-time and tells you EXACTLY what to do to look better. It shows a live preview with the changes applied, and also lets you upload a photo + prompt to get advice.



**KEY FEATURES:**



1.  **AUTHENTICATION**

    - Sign up / Sign in with Google

    - Save user profile, saved looks, and history to database

    - Use Firebase Auth + Firestore



2.  **LIVE CAMERA ANALYSIS**

    - User opens camera and sees their face

    - AI analyzes: skin tone, skin texture, face shape, eye shape, lip shape, symmetry, undertones, problem areas

    - AI gives a voice + text breakdown: "You have warm olive skin. Your brows are uneven. To look better: 1. Fill brows with brown pencil 2. Use coral blush on cheekbones 3. Wear matte red lipstick"

    - **LIVE PREVIEW**: Show the same face with AR makeup applied based on the advice. Lipstick, blush, brows, contour, eyeshadow should render realistically on the face



3.  **SNAP + PROMPT MODE**

    - User takes a photo or uploads one

    - User types a prompt: "I have a wedding to attend" or "How do I look better for pictures"

    - AI returns: 

      a. List of specific steps to improve their look

      b. An AI-generated preview image of them with those changes applied

      c. Product recommendations with shade names and why they work

    - Save all analysis to user profile in database



4.  **PRODUCT SCANNER**

    - User can snap a picture of any cosmetic product: lipstick, foundation, palette

    - AI uses vision to identify the product + shade

    - AI tells user: "This shade will/won't work for you because..." + "Here are 3 better alternatives for your skin tone"

    - Save scanned products to user's "My Vanity" in database



5.  **BEAU AI BEAUTY CHAT**

    - Chatbot that acts like a top celebrity makeup artist

    - Personality: Confident, honest, encouraging, expert in all skin tones especially deep and olive skin

    - Can answer: "What foundation for oily skin?", "Makeup for evening event", "How to contour round face"

    - Chat history saved per user



6.  **TECH REQUIREMENTS**

    - Frontend: React Native + Expo for Android/iOS

    - Auth + Database: Firebase Auth, Firestore, Firebase Storage

    - Face Detection: Google ML Kit or MediaPipe for face landmarks

    - AR Makeup: Use canvas/overlay or integrate Banuba SDK / DeepAR for realistic makeup rendering

    - AI: Connect to Gemini 2.5 Pro Vision API. Send face image + prompt and get analysis + advice

    - Image Generation: Use Gemini 2.5 Flash Image or Stable Diffusion to generate "after" preview from the "before" photo

    - Product Vision: Use Gemini Vision to read product labels and identify cosmetics

    - UI: Clean, luxury, minimal. Color theme: Black + Gold. Big "ANALYZE ME" button



7.  **DESIGN STYLE**

    - Name: Beau AI

    - Tagline: "Your Cosmetic Legend"

    - Vibe: Premium, elegant, fast

    - Must work offline for camera, online for AI calls

    - Prioritize accuracy for all skin tones



**USER FLOW:**

Open App → Sign in with Google → Camera opens → Tap "Analyze" → Beau AI talks + shows AR preview with changes → Tap "Save Look" or "Scan Product" or "Chat with Beau"



Build this as a working MVP. Prioritize: Google Sign-in + Firebase + Camera + Face Analysis + AR Preview + Product Scanner + Gemini Vision API integration.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3616da76-1590-4546-80c7-8193b1879605).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
