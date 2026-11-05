# Illustrative preview assets

The original page mockups in `../output/design` were inspected as design references. They are not embedded as page images.

Real public mode uses backend room and offering photography or neutral, labelled photography placeholders. A verified hotel hero can be configured. The following assets are used only in explicitly labelled development preview; the production build aliases the demo module away, excluding sample data and imagery.

## Twin-room image

Saved project asset: `src/assets/demo-twin.png`.

Generated with the built-in ImageGen tool, not the API/CLI fallback. This is illustrative, not an actual IGES photograph. Visual inspection confirmed two physically separate beds and a visible bedside table between them. No existing asset was overwritten.

Final prompt:

> Use case: photorealistic-natural. Asset type: a single landscape hotel-room photograph for a clearly labelled illustrative hotel website design preview. Create a premium warm modern hotel TWIN BEDROOM with exactly TWO SEPARATE SINGLE BEDS, side by side, a substantial visible gap and a wooden bedside table between them. Both complete single beds must be unmistakable and visible in the central composition, each has its own white duvet, two white pillows and a deep olive green runner. Warm walnut wall panels, upholstered beige headboards, subtle brass accents, bedside lamps with warm golden light, ivory curtains over a large window to the right, tasteful chair at window, patterned neutral rug. Elegant Nigerian boutique-hotel hospitality atmosphere, no people. Shoot architectural interior photograph from near foot of the beds at diagonal wide-angle perspective, landscape 3:2, balanced warm light with daylight fill, realistic polished materials, refined and calm, close visual feel to luxury walnut-and-olive hotel mockups. Critical: two physically separated SINGLE beds of equal width, neither one king bed nor sofa. No text, no logo, no watermark, no web interface.

## Other preview photos

HTTPS Unsplash image URLs in `src/demo.ts` provide the remaining illustrative room, bathroom, dining, food and pool images. They are never represented as actual hotel photographs. Images are loaded directly in preview, with responsive width variants and error placeholders. No stock-image connection is made by the live experience.

The IGES wordmark and geometric line mark are original HTML/SVG components informed by the supplied references; replace with the hotel's approved brand asset if supplied. Typography uses local system Georgia and Arial/Helvetica; there are no third-party font calls, analytics or tracking tags.
