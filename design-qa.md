# Amplify Day — design and functional QA

Date: 2026-08-25
Branch: `feat/amplify-day-expanded-lp`
Route: `/amplify-day`

## Visual review

- Hero preserves the approved editorial save-the-date composition, the large `23`, cyan accent, three coalizadoras, clear event proposition, and primary CTA.
- Long-form sequence reviewed at 1440×900: plenaries, Brasília transition, audience/curation, venue, coalition history, proof wall, FAQ, and final CTA.
- Qualification popup reviewed after its entrance transition at 1366×768 and 390×844. Previous form and landing layers no longer remain visible underneath it.
- Confirmation reviewed at 1366×768 and 390×844. It is static, clean, free of illustration, and uses carmine rather than a full-screen fluorescent magenta.
- Mobile confirmation footer was adjusted so the three brands and editorial signature no longer overlap.

## Responsive matrix

| Viewport | Horizontal overflow | Result |
| --- | ---: | --- |
| 1440×900 | none | passed |
| 1366×768 | none | passed |
| 768×1024 | none | passed |
| 390×844 | none | passed |
| 360×800 | none | passed |

## Functional flow

- CTA → identity capture → qualification → confirmation: passed.
- Partial qualification persistence and mock server submission: passed.
- WhatsApp action is hidden in initial HTML and appears only after a successful `amplify_day_profile_completed` response: passed.
- WhatsApp click event and Kit tag mapping: passed.
- Calendar, map, CTA-position, form-open, identity, profile, and WhatsApp analytics events are instrumented.
- Invalid API event returns HTTP 422: passed.
- No application console errors during automated browser flow.
- `prefers-reduced-motion`: moving visual-kit treatments report `animation-name: none`.

## Automated checks

- `npm test`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.

## Production gates

- The supplied Ulysses photograph is allowed in this Preview for review, but production publication still requires confirmation of image rights/credit.
- Production must define `KIT_API_KEY` and `AMPLIFY_DAY_WHATSAPP_URL`; Preview tests use mock capture and a non-production WhatsApp URL.

final result: passed
