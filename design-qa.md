# Design QA — Amplify Knowledge

## Reference assets

- Index: `/Users/leonardocamacho/.codex/generated_images/01a11718-f9e7-76f0-aa11-d7d6e44196ee/exec-59eb34ba-6a78-4b46-8435-cfe4274ee17c.png`
- Document: `/Users/leonardocamacho/.codex/generated_images/01a11718-f9e7-76f0-aa11-d7d6e44196ee/exec-d7c75eb4-d090-43c3-b056-bdd5fb5d9b1a.png`

## Rendered evidence

- Desktop index (1586×992): `.qa/screenshots/knowledge-index-desktop.png`
- Desktop document (1586×992): `.qa/screenshots/knowledge-company-desktop.png`
- Mobile index (390×844): `.qa/screenshots/knowledge-index-mobile.png`
- Mobile document (390×844): `.qa/screenshots/knowledge-company-mobile.png`

## Comparison

1. The persistent dark header, left navigation rail, centered search and cyan accent follow the approved index concept closely.
2. The index keeps the reference hierarchy while adding the required compact filter control, status and tags.
3. The document view preserves the three-column desktop composition: navigation, reading column and sticky table of contents.
4. Typography, charcoal surfaces, thin borders, restrained contrast and icon treatment use the Amplify design system rather than importing Starlight.
5. Mobile replaces the rail with a keyboard-accessible drawer and turns global search into a focused overlay without changing URLs or content.

## Interaction QA

- Global search tested with accented and unaccented terms; title, description, tags and body participate in matching.
- Search and type filter tested simultaneously.
- Mobile search close behavior and mobile drawer tested.
- TOC anchor navigation and copy-link state tested.
- No browser console errors were observed; only expected development logs from React, Vercel Analytics and RD Station appeared.

## Intentional differences

- The approved visuals contained illustrative copy. The implementation renders the canonical OKF Markdown and metadata without rewriting facts.
- The filter panel is collapsed by default to keep the editorial index compact.
- The Starlight package was not installed because the project remains on Astro 5; only its documentation UX patterns were adapted.

final result: passed
