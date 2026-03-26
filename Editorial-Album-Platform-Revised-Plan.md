# Editorial Album Platform — Revised Strategic Plan

## A. Executive Summary

This product is a **professional editorial album creation platform** built for Arabic newsroom-style social albums. It starts from the visual logic of Al Jazeera albums, but it must be architected as a **multi-channel, profile-driven, rules-based design system**, not a one-brand template generator.

The platform's main job is not merely placing text on white boxes. Its job is to help a designer receive a pre-written script, choose the correct channel profile, decide the most suitable visual treatment for each slide, maintain brand correctness, and export production-ready slides efficiently.

The system should feel like a hybrid of:
- a newsroom production tool,
- a constrained but powerful design editor,
- and a creative system with AI assistance, not AI replacement.

The long-term quality bar is: **a designer should feel faster, safer, and more creatively guided — without losing control**.

---

## B. What This Product Actually Is

This is **not** just an Al Jazeera album generator.

It is a **profile-based editorial slide composition platform** for Arabic-first visual storytelling.

It must support:
- fixed channel or department setup per project,
- brand-safe customization,
- editorial layout selection per slide,
- structured handling of scripts already written slide-by-slide,
- future multi-brand flexibility,
- future export to PSD with Photoshop artboards,
- and future advanced image treatment and AI-assisted visual generation.

At launch, the product should focus on one real workflow:
1. The designer receives a full script.
2. The script is already divided into slides.
3. The designer chooses the department/channel.
4. The platform applies the correct channel setup.
5. The designer decides the best visual treatment per slide.
6. The platform helps maintain consistency, typography quality, spacing, and export readiness.

---

## C. Core Insight from the Real Workflow

The real workflow matters more than abstract template theory.

### Actual working pattern

The team does **not** start by freely designing random slides.

The team usually starts with:
- a fixed department/channel,
- a pre-written script,
- a known cover-first structure,
- and an editorial need to decide **how each information chunk should be shown**.

### Typical script structure

A script usually arrives like this:
- Slide 1 = cover title
- Slide 2 onward = title + body, or structured facts, or bullets, or credentials, or infographic-worthy content

This means the product should treat albums as **script-driven**, not canvas-driven from zero.

### Important consequence

The platform should not ask the user to choose from every possible setting at project start.

Instead:
- the user first chooses the **department/channel profile**,
- then sees only the options relevant to that profile,
- then imports/pastes the script,
- then works slide by slide.

This reduces chaos and keeps the tool aligned with real production.

---

## D. Product Principles

These are non-negotiable:

1. **Arabic-first**
   RTL is the default mental model, not an afterthought.

2. **Profile-driven**
   Every project belongs to one department/channel profile.

3. **Brand-safe but dynamic**
   The user gets flexibility, but inside meaningful boundaries.

4. **Script-first**
   The platform assumes the content often arrives already written and divided into slides.

5. **Creative-direction-aware**
   The platform should help choose the best presentation style for the information itself.

6. **Not one-style-only**
   Even inside the same organization, channels and departments can differ in logo, banner system, accents, footer logic, and layout feel.

7. **Future-proof**
   The architecture must not collapse when new fonts, new profiles, new sizes, or new export formats are introduced.

---

## E. Shared Editorial DNA Across the References

Across the references, the shared DNA is not one exact template but a repeating editorial logic:

- strong hero image or image zone,
- light or white reading surface for text,
- controlled Arabic hierarchy,
- highly intentional emphasis,
- consistent channel chrome,
- small but meaningful footer/system elements,
- different slide types within one album, but with internal rhythm.

Common repeated elements:
- logo at top-left,
- social/footer area at bottom,
- image-led top half or major region,
- white/light content region,
- red/blue/neutral accent use,
- title + body slides,
- bullet-led informational slides,
- highlighted callouts,
- stat or infographic adaptations where content requires them.

---

## F. Critical Differences Between Channel Families

This is strategically important.

Not every channel or department should behave the same.

Differences may include:
- logo variant,
- fixed vs flexible accent colors,
- banner shape,
- white panel treatment,
- footer style,
- source placement style,
- typography profile,
- weight mapping,
- default slide families,
- how formal or flexible the layout is,
- how much infographic logic is allowed.

Examples:
- Al Jazeera standard may use one banner language.
- Al Jazeera Mubasher may use another.
- Al Jazeera Lebanon may later need another package.

So the architecture must be based on **Channel Profiles**, not one universal skin.

---

## G. Channel Profile System

### Main idea
A project belongs to **one fixed channel/department profile**.

That means when the user starts a project, they first choose:
- Al Jazeera
- Al Jazeera Mubasher
- Al Jazeera Lebanon
- any future department or custom profile

Then the system loads only the relevant setup.

### Why this matters
The user should not see every possible brand option if they only work in one department. That would create noise and bad decisions.

### Each Channel Profile should define
- logo set
- default canvas presets
- allowed color palette
- whether colors are fixed or editable
- banner families
- white-panel styles
- footer style
- source placement rule
- typography family and weights
- default slide archetypes
- allowed customization depth
- export defaults
- optional locked brand rules

### Example structure
`Global System → Channel Profile → Album Theme → Slide Variant → Block Overrides`

---

## H. Brand Locks vs Editable Controls

This section was missing previously and is essential.

The system must clearly distinguish between:

### Locked elements
Things the designer cannot freely break, depending on profile:
- official logo usage rules
- protected spacing around logo
- footer structure
- certain fixed brand colors
- prohibited banner styles
- prohibited font substitutions
- source placement rules

### Editable but guided elements
Things the designer can adjust safely:
- accent color if profile allows it
- using one or two main colors in an album
- banner position
- banner size
- text weights
- highlight style
- bullet appearance
- spacing density
- slide layout choice
- image crop
- source font size

### Freeform future elements
Advanced creative options that may come later:
- floating cutout subjects crossing banner boundaries
- foreground/background separation
- semi-custom infographic assembly
- free slide mode

This gives the platform structure without making it rigid.

---

## I. Main User Workflow

This should become the backbone of the product.

### Step 1 — Select channel/department
The user starts a project and selects one channel profile.

This is a fixed choice per project.

Once selected, the platform loads:
- correct logo,
- correct color rules,
- correct templates,
- correct banner families,
- correct footer/source behavior,
- correct typography setup.

### Step 2 — Create album setup
The designer decides the base setup for the album:
- primary accent color
- optional secondary accent color
- preferred visual tone
- banner strategy
- whether the album feels text-led, image-led, or infographic-leaning

### Step 3 — Paste/import the script
The designer receives the full script already written.

The platform should support:
- pasting the full script,
- identifying slide boundaries,
- recognizing slide numbers,
- separating cover from inner slides,
- detecting title/body structure where possible.

### Step 4 — Parse slides
Typical logic:
- Slide 1 = cover
- Slide 2+ = title + body or another structured content form

The system should parse and present the slides as editable units.

### Step 5 — Recommend best slide treatment
For each slide, the platform should help answer:
- is this best as title + paragraph?
- bullets?
- credentials?
- quote?
- infographic?
- stat-led slide?
- comparison?

This is where AI and the rules engine should help.

### Step 6 — Choose image
For each slide, the user selects the most truthful and relevant image possible.

MVP:
- upload image manually
- replace image manually
- basic placeholder/suggestion only

Later:
- better search
- cutout subject extraction
- foreground/background separation
- allowing a subject to overlap into the banner region
- AI enhancement for selected imagery

### Step 7 — Tune typography and composition
The designer adjusts:
- bold/regular distribution
- line breaks
- body density
- title balance
- bullet treatment
- highlight treatment
- banner position and size
- source placement

### Step 8 — Export
The album exports in production-friendly formats.

---

## J. Cover Slide vs Inner Slides

This distinction must be explicit.

### Cover slide
The cover is often more artistic and less template-bound.
It may involve:
- custom artwork,
- more expressive typography,
- more dramatic image treatment,
- less rigid system structure.

### Inner slides
Most inner slides are more systematized.
These should benefit most from the platform.

### Product implication
For now:
- focus MVP mainly on inner slides,
- but design the architecture so cover generation can be added later,
- and allow occasional “free slide” behavior in the future.

---

## K. Slide Archetypes for MVP

The MVP should support the most frequent and useful inner-slide patterns.

### 1. Standard Title + Body
Used when the slide is mainly explanatory.
- title
- paragraph body
- image region
- optional banner

### 2. Bullet Points Slide
Used when the information reads better as separated points.
- title
- bullet list
- optional separators
- selectable bullet shapes

### 3. Credentials / Facts Slide
Useful for profile or biography albums.
- title
- fact rows or short bullets
- strong hierarchy
- image or portrait support

### 4. Highlighted Statement Slide
For one key line or dominant message.
- large highlighted phrase
- supporting text
- optional image

### 5. Source-heavy Informational Slide
For cases where source text or attribution matters.
- standard layout
- source in bottom-right replacing or sharing the dots area based on rules

### 6. Basic Infographic-like Slide
Not full advanced infographic generation yet.
But enough to support:
- small labeled facts
- icon/flag + text rows
- simple data blocks

### Phase 2 archetypes
- quote slide
- comparison slide
- timeline slide
- advanced infographic slide
- free composition slide
- document/annotation slide

---

## L. Banner System

The banner logic is a major part of the visual identity.

The app should not assume one fixed banner placement.

A banner can be:
- top
- bottom
- floating
- semi-floating
- absent entirely

The user should be able to move it based on the image and readability.

But the movement should be **guided**, not chaotic.

### Banner system should support
- profile-specific banner families
- size presets
- top/bottom/float positions
- optional no-banner mode
- overlap rules with image content
- clipping/cutout interactions in future versions

This should feel dynamic but controlled.

---

## M. Typography System Architecture

Typography should be a full subsystem, not styling garnish.

### Needs
- Arabic-first hierarchy
- profile-based font family
- future font replacement
- weight control
- mixed Arabic/Latin handling
- proper numeral rendering
- line-height system
- title balancing rules
- source-size adaptation for short vs long sources

### Real design behavior
The designer often decides:
- what becomes bold,
- what stays regular,
- how to break the lines,
- how dense the body should be,
- whether emphasis comes from weight or color or both.

The platform must expose this elegantly.

---

## N. Arabic Layout Rules

The system must be explicit about Arabic layout quality.

Required behavior:
- RTL by default
- clean line breaking
- multi-line title balancing
- paragraph readability
- bullet indentation that works in Arabic
- punctuation spacing awareness
- Arabic/English mixed-line safety
- percentage and date formatting safety
- consistent right alignment rules

The product must avoid ugly automated wrapping and weak hierarchy.

---

## O. Design Guardrails / Safety System

This was missing and must be added.

A serious design tool needs guardrails.

### The system should prevent or warn against
- unreadable contrast
- bad text overflow
- broken title wrapping
- source text colliding with footer
- banner placement hiding critical image content
- too many emphasis colors
- impossible margins
- visually inconsistent slides inside one album

### Guardrail types
- hard constraints
- soft warnings
- recommended fixes
- auto-suggest safe alternatives

This is one of the most important differences between a premium tool and a messy editor.

---

## P. Customization System

Customization should be layered.

### Album-level controls
- primary accent color
- optional secondary accent color
- banner family
- preferred layout tone
- typography density
- bullet style family
- source style
- default panel style

### Slide-level controls
- slide archetype
- image placement
- banner position
- title weight
- body weight
- highlight mode
- bullet shape
- divider on/off
- spacing density override
- source visibility and size

### Future advanced controls
- subject cutout crossing banner
- controlled free composition
- infographic fragment builder
- AI-based image enhancement suggestions

---

## Q. Content Model / Script Model

The platform should support a script-first data model.

### Basic imported structure
- album title
- cover content
- slides array

### Slide structure
Each slide should support:
- slide number
- raw source text
- parsed title
- parsed body
- content type guess
- designer-approved archetype
- image asset
- source text
- styling overrides

### Suggested conceptual schema
```json
{
  "project": {
    "channelProfileId": "aj-main",
    "canvas": { "width": 1350, "height": 1080 },
    "albumTheme": {
      "primaryColor": "#d71920",
      "secondaryColor": "#0057b8",
      "bannerFamily": "classic-main",
      "density": "comfortable"
    },
    "script": {
      "rawText": "...",
      "slides": [
        {
          "number": 1,
          "role": "cover",
          "title": "..."
        },
        {
          "number": 2,
          "role": "inner",
          "title": "النشأة والبدايات العسكرية",
          "body": "وُلد ...",
          "suggestedType": "standard_title_body",
          "selectedType": "standard_title_body",
          "image": null,
          "source": null,
          "overrides": {}
        }
      ]
    }
  }
}
```

---

## R. Canvas and Sizing System

Default size should be:
- **1350 × 1080**

But the system must not hardcode this forever.

It must support:
- future size presets
- future resizing
- normalized layout logic
- export-safe coordinates
- scalable artboard thinking

This is important both for future channels and for future PSD export.

---

## S. Export Strategy

### MVP exports
- PNG per slide
- JPG per slide
- ZIP of all slides

### Phase 2+
- PDF export
- PSD export

### PSD requirement
This is not optional strategically.
The long-term goal is:
- Photoshop-compatible PSD
- separate artboards per slide

If this is difficult in MVP, the system should still be architected so PSD support can be added later without rewriting the whole product.

That means:
- slide coordinates and assets should stay well-structured,
- layers should remain conceptually separable,
- export abstraction should exist from day one.

---

## T. Permissions and Project Simplicity

The workflow suggests a useful operational rule:

Not every user needs access to every channel profile.

So the system should support future role/profile restrictions such as:
- a user sees only their assigned department profile(s)
- a user starts only approved project types
- a user cannot access irrelevant templates

This simplifies the interface and reduces mistakes.

---

## U. AI Role in MVP

The AI should help, not dominate.

### MVP AI tasks
- parse pasted script
- identify slide boundaries
- separate cover from inner slides
- detect likely title/body structure
- suggest best slide archetype
- suggest emphasis opportunities
- suggest simple placeholder image search terms

### Not required yet
- perfect image generation
- perfect infographic generation
- auto-art-directed covers
- full visual creativity replacement

The real intelligence in MVP should be **layout and structuring intelligence**.

---

## V. Production Mode vs Creative Mode

This is useful and should be explicitly planned.

### Production Mode
- strict profile rules
- limited safe customization
- fast execution
- high consistency
- ideal for daily newsroom production

### Creative Mode
- wider variation range
- more experimental banner behavior
- more override power
- better for special projects or standout slides

MVP can launch mainly with Production Mode logic, while preparing the foundation for a future Creative Mode.

---

## W. Technical Recommendation

### Recommended product direction
Use a **structured editor with HTML/CSS/SVG-friendly rendering**, not a purely canvas-first editor.

Why:
- Arabic text rendering quality matters
- typography fidelity matters
- export consistency matters
- PSD future mapping benefits from structured layers

### Suggested stack direction
- React + TypeScript
- structured editor state
- token-based theming
- server-side export layer
- asset manager
- normalized layout engine

### Editor model
- left: slides navigator
- center: live canvas
- right: controls/context panel
- top: project/channel/theme/export tools

### Important technical principle
Do not build the system as random visual widgets.
Build it as:
- Channel Profiles
- Theme Tokens
- Slide Archetypes
- Structured Blocks
- Guardrails
- Export Abstraction

---

## X. Phased Roadmap

### Phase 0 — Foundation
- channel profile architecture
- script parser
- slide data model
- theme token system
- default canvas system
- export abstraction

### Phase 1 — MVP Inner-Slide Editor
- create project by channel
- paste script
- parse slides
- edit title/body
- select slide type
- upload image
- adjust banner/highlight/bullets/source
- export PNG/JPG/ZIP

### Phase 2 — Smarter Editor
- better AI suggestions
- richer archetypes
- PDF export
- source rules refinement
- more channel families

### Phase 3 — Advanced Visual Features
- image cutout workflows
- foreground/background separation
- subject overlapping banner
- more flexible free slides
- better infographic tooling

### Phase 4 — Full Editorial Platform
- cover generator
- PSD artboards export
- collaboration
- comments
- version history
- multi-brand beyond Al Jazeera ecosystem

---

## Y. Key Risks and Hard Problems

Main risks:
- Arabic typography quality
- too much freedom leading to broken layouts
- too many options causing UI clutter
- weak parsing of real scripts
- PSD export complexity
- channel-profile sprawl if not designed cleanly
- image workflow becoming too ambitious too early

The answer is not reducing ambition blindly.
The answer is sequencing correctly.

---

## Z. Final Strategic Recommendation

The correct version of this product is not:
- a fixed template app,
- not a chaotic freeform editor,
- and not an overpromising AI toy.

The correct version is:

**a script-driven, channel-profile-based, Arabic-first editorial album platform with brand-safe flexibility and future-ready export architecture.**

That matches the real workflow you described.
It gives enough system to scale.
And it still leaves room for stronger creative power later.

---

## AA. Suggested Next Build Spec

The next practical step should be to turn this plan into a build-ready product spec with these exact deliverables:

1. Channel Profile schema
2. Script parser rules
3. Slide archetype definitions
4. Theme token system
5. Guardrails matrix
6. Editor screen map
7. Export abstraction design
8. MVP backlog split into implementation tasks

That should be the document used before coding begins.
