# Design System: Concept 3: ATELIER VIBE (Swiss Minimalistic Multi-Theme)
**Project ID:** projects/10896536421119175918

## 1. Visual Theme & Atmosphere
Rooted in the Swiss International Typographic Style and editorial elegance, the **Atelier Vibe** aesthetic emphasizes crystal-clear objective hierarchy, high structural contrast, and mathematical precision. Unlike cluttered modern web UIs, this system strips away decorative noise—replacing heavy drop shadows and bulbous roundings with crisp geometric alignment, hairline rules, and generous whitespace. It creates an atmosphere of uncompromising professionalism, transparency, and high-fashion institutional trust.

The application features three distinct, selectable atmospheres:
- **Atelier Noir (Swiss Dark)**: A profound obsidian void where glowing emerald metrics and crisp hairline dividers emerge like precision instruments.
- **Atelier Blanc (Swiss Light)**: An airy, warm eggshell editorial canvas inspired by Swiss print design and luxury financial annual reports.
- **Atelier Navy (Refined Deep Slate)**: A refined institutional dark mode balancing deep sapphire hues with translucent glassmorphic surfaces.

## 2. Color Palette & Roles

### Atelier Noir (Swiss Dark - Default)
- **Obsidian Void** (`#0F0E0D`): Primary page canvas (`--bg-page`). Grounding, ultra-deep matte black.
- **Charcoal Slate** (`#181716`): Elevated container & card surface (`--bg-card`). Subtly distinct from the page canvas.
- **Hover Graphite** (`#22201F`): Interactive hover state for cards and rows (`--bg-card-hover`).
- **Crisp Snow** (`#FBF9F5`): Primary typography and high-contrast headlines (`--text-primary`).
- **Muted Platinum** (`#A19E9B`): Secondary labels and body metadata (`--text-secondary`).
- **Hairline White** (`rgba(255, 255, 255, 0.12)`): 0.5px/1px architectural dividers (`--border`).

### Atelier Blanc (Swiss Light)
- **Warm Eggshell** (`#FBF9F5`): Primary editorial background (`--bg-page`). Soft on the eyes, rich paper feel.
- **Pure Alabaster** (`#FFFFFF`): Elevated card and table container (`--bg-card`).
- **Alabaster Hover** (`#F3F0EC`): Interactive hover state (`--bg-card-hover`).
- **Jet Ink** (`#0F0E0D`): Primary text and serif headers (`--text-primary`). High contrast ink.
- **Graphite Gray** (`#57534E`): Secondary descriptions (`--text-secondary`).
- **Hairline Graphite** (`rgba(15, 14, 13, 0.12)`): Crisp structural rules (`--border`).

### Functional Accents & Risk Tiers (Shared across themes)
- **Swiss Emerald (Tier Strong)** (`#10B981`): Used for approval signals, low risk, positive health metrics.
- **Institutional Blue (Tier Adequate)** (`#3B82F6`): Used for neutral operational status and active selection.
- **Caution Amber (Tier Watch)** (`#F59E0B`): Used for review queue warnings and moderate risk.
- **Critical Rose (Tier High Risk)** (`#F43F5E`): Used for rejected status, critical alerts, and high default probability.
- **Editorial Gold** (`#EAB308`): Used for primary call-to-action buttons (`.btn-gold`) and key highlights.

## 3. Typography Rules
- **Headlines & Editorial Titles (`font-serif`)**: `Playfair Display`, serif. Used for page titles, hero metrics, and section headers to convey authority, heritage, and prestige.
- **Interface & Body (`font-sans`)**: `Inter`, sans-serif. Used for navigation, form labels, and dense tabular data for maximum clarity and geometric neutrality.
- **Numerical & Code (`font-mono`)**: `JetBrains Mono`, monospace. Used for financial ratios, SHAP values, risk scores, and IDs for columnar alignment.

## 4. Component Stylings
* **Buttons**: 
  - *Primary Gold*: Pill or subtly rounded (`rounded-xl`), high-impact linear gradient (`#EAB308` to `#CA8A04`) with dark ink text (`#0F172A`).
  - *Swiss Ghost*: Hairline border (`1px solid var(--border)`), transparent background, crisp typography.
* **Cards/Containers (`.glass-card`)**:
  - Subtly rounded corners (`rounded-xl` to `rounded-2xl`), flat or whisper-soft diffused backdrop blur, bordered by crisp hairline dividers (`1px solid var(--border)`).
* **Navigation & Header**:
  - Distinct separation via hairline bottom border (`border-b border-[var(--border)]`). Contains the interactive **Theme Switcher** pill.
* **Badges (`.status-badge`)**:
  - Pill-shaped (`rounded-full`), 1px colored border matching the tier accent, 15% opacity tinted background for instant visual categorization.

## 5. Layout Principles
- **Grid & Alignment**: Strictly aligned 260px fixed left sidebar anchored by a hairline right border. Fluid right content area with responsive grid spacing (`gap-6`).
- **Whitespace Strategy**: Generous internal padding (`p-6` to `p-8`) allowing financial data to breathe without cognitive overload.
- **Dividers over Shadows**: Layering is achieved primarily through color contrast and 1px hairline borders rather than heavy blur drop-shadows.
