# Design Guidelines: Voice API Platform

## Design Approach
**System-Based Approach** inspired by modern developer platforms (Stripe, Replicate, Hugging Face Spaces)
- Clean, technical aesthetic prioritizing clarity and functionality
- Developer-focused with emphasis on interactive testing capabilities
- Professional presentation balancing technical depth with accessibility

## Typography System
**Primary Font:** Inter or IBM Plex Sans (Google Fonts CDN)
- Headings: 600-700 weight, precise spacing
- Body: 400 weight, 16px base size
- Code/Technical: JetBrains Mono, 14px for API endpoints, model parameters
- Hero Display: 48-72px bold
- Section Headers: 32-40px semibold
- Card Titles: 20-24px medium
- Body Text: 16-18px regular
- Captions/Labels: 14px regular

## Layout System
**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Container max-width: 7xl (1280px)
- Section padding: py-16 to py-24 (desktop), py-12 (mobile)
- Component spacing: gap-6 to gap-8
- Card padding: p-6 to p-8
- Tight spacing for related elements: gap-2 to gap-4

## Page Structure

### Landing Page (6-7 Sections)

**1. Hero Section** (h-screen or min-h-[600px])
- Two-column layout (60/40 split)
- Left: Headline + subtext + dual CTAs ("Try Demo" primary, "View Docs" secondary)
- Right: Animated audio waveform visualization or product screenshot showing dashboard
- Trust indicators below CTAs: "Open Source • GPU-Accelerated • ElevenLabs Quality"

**2. Live Demo Section** (Full-width, prominent)
- Interactive TTS comparison widget
- 3-column grid showing Chatterbox, Higgs Audio V2, StyleTTS2 side-by-side
- Each column: Model name, parameter count, language badge, audio player, "Generate" button
- Text input area above columns
- Visual indicators showing processing state

**3. Features Grid** (4-column on desktop, 2 on tablet, 1 on mobile)
- 8 feature cards in grid-cols-4 lg layout
- Each card: Icon (Heroicons), title, 2-line description
- Features: Real-time TTS, Voice Cloning, Multi-language STT, VAD, VLLM Integration, Sub-200ms Latency, GPU Acceleration, Open Source Stack

**4. Technical Specifications** (2-column comparison table)
- Left column: Model comparison matrix (table format)
- Right column: Performance metrics with visual bars/indicators
- Include: Parameters, Languages, Speed benchmarks, Quality scores

**5. API Showcase** (Code-first presentation)
- Center-aligned heading
- Three code examples in tabs: cURL, Python, JavaScript
- Real API endpoint examples with syntax highlighting
- "Get API Key" CTA button below

**6. Pricing/Access Tiers** (3-column cards)
- Free Tier, Pro Tier, Enterprise (even if free/open-source, show deployment options)
- Each card: tier name, feature list with checkmarks, prominent CTA button

**7. Footer** (Rich, 4-column)
- Column 1: Logo + tagline
- Column 2: Product links (API Docs, Dashboard, Models)
- Column 3: Resources (GitHub, Examples, Community)
- Column 4: Newsletter signup + social links

### Dashboard Interface

**Layout:** Sidebar + Main Content
- Fixed left sidebar (w-64): Navigation, API key display, usage stats widget
- Main content area: max-w-6xl with px-8 padding
- Top bar: Search, notifications, user menu

**Dashboard Sections:**
1. **Overview Cards** (4-column grid)
   - API Requests Today, Success Rate, Average Latency, Credits Used
   - Each card: Large number, label, sparkline trend

2. **Voice Testing Interface**
   - Tabbed interface: TTS, STT, Voice Cloning, VAD
   - TTS tab: Model selector dropdown, text area, voice selection, generate button, audio player with waveform
   - Results area showing: Generated audio player, quality metrics, processing time

3. **Model Comparison Tool**
   - Split-screen layout (grid-cols-3)
   - Simultaneous audio generation across all 3 models
   - Visual comparison: waveforms, spectrograms, quality scores

4. **API Key Management**
   - Table layout: Key name, created date, usage, actions
   - "Create New Key" button (prominent, top-right)
   - Copy-to-clipboard functionality with toast notifications

## Component Library

### Core UI Elements
- **Buttons:** Rounded (rounded-lg), solid primary, outline secondary, consistent px-6 py-3 sizing
- **Input Fields:** Bordered (border-2), rounded-lg, focus states with ring, helper text below
- **Cards:** Elevated appearance, rounded-xl, p-6 padding, subtle border
- **Badges:** Small rounded-full pills for tags (languages, model status)
- **Dropdowns:** Custom styled with Heroicons chevrons
- **Tabs:** Underline style with active indicator

### Specialized Components
- **Audio Player:** Custom design with play/pause, waveform visualization, time display, volume control
- **Code Block:** Dark theme snippet with syntax highlighting, copy button (top-right corner)
- **Progress Indicators:** Thin bars (h-1) for loading states
- **Toast Notifications:** Fixed bottom-right, slide-in animation, auto-dismiss
- **Modal Dialogs:** Centered overlay, max-w-2xl, rounded-xl, backdrop blur

### Data Display
- **Tables:** Striped rows, sticky headers, sortable columns, hover states
- **Metrics Cards:** Large number display (text-4xl), label below, trend indicator
- **Charts:** Simple bar/line charts for usage analytics (use Chart.js via CDN)

## Navigation
- **Landing:** Fixed top navbar, transparent initially, solid on scroll, logo left, links center, CTA right
- **Dashboard:** Persistent sidebar with icon+text items, active state highlighting, collapsible on mobile

## Responsive Behavior
- Desktop (lg): Full multi-column layouts, sidebar visible
- Tablet (md): 2-column grids, condensed spacing
- Mobile (base): Single column stacking, hamburger menu, full-width buttons

## Icons
Use **Heroicons** (outline style) via CDN for consistency:
- Navigation icons, feature cards, button prefixes
- Audio controls: play/pause/stop
- Actions: copy, download, settings, delete

## Images
- **Hero Section:** Yes - Full-height product screenshot or abstract audio waveform visualization (right side)
- **Features Section:** Icon-based, no images
- **Demo Section:** Real-time generated waveform visualizations
- **Footer:** Optional small logo

## Accessibility
- ARIA labels on all interactive audio controls
- Keyboard navigation for all dashboard functions
- Focus indicators on all form inputs and buttons
- Screen reader announcements for audio generation status

## Animations
**Minimal, purposeful only:**
- Waveform visualization during audio generation (smooth SVG animation)
- Button hover: subtle scale (scale-105)
- Toast notifications: slide-in from bottom-right
- No page transitions, no scroll effects