## MODIFIED Requirements

### Requirement: Exact source actions are preserved safely
When CanonicalTrip contains a valid exact source-provided URL (including a spreadsheet cell hyperlink), Result UI SHALL use that exact URL, open external actions in a new tab, and set safe `rel` attributes. It MUST NOT rewrite a source URL into a different map/restaurant URL. When an entity has place text but no source URL, Result UI SHALL offer a Google Maps search action built only from the verbatim confirmed place text, and it SHALL be labeled as a search (not a source link). It MUST NOT add coordinates or resolve a specific place. Entities without place text SHALL have no map action.

#### Scenario: Exact map URL exists
- **WHEN** a confirmed entity contains a source-provided Google Maps URL
- **THEN** the action uses the unchanged URL with safe external-link behavior

#### Scenario: Place text has no URL
- **WHEN** an entity contains place text `노랑통닭 명동점` but no confirmed link
- **THEN** the UI offers a map search action whose query is exactly `노랑통닭 명동점`, labeled as a search, opening in a new tab with safe `rel`

#### Scenario: Entity has no place
- **WHEN** an entity such as free time has no place text and no URL
- **THEN** no map action is rendered

### Requirement: Flexible and optional intent remains non-task-like
Free time and flexible content SHALL remain first-class, low-pressure itinerary content without checkboxes or incomplete status. Optional content SHALL remain visible outside the committed hierarchy and SHALL NOT appear disabled or overdue. State labels SHALL be reduced without changing Canonical data:
- members of an alternative (choose-one) group SHALL NOT show optional or tentative labels, because the group heading carries that meaning
- flexible SHALL NOT render as a text label; it is expressed by the absence of a fabricated time
- a standalone entity SHALL show at most one state label, preferring tentative over optional

#### Scenario: Optional free-time item renders
- **WHEN** an entity is both optional and flexible free time
- **THEN** it appears in the optional disclosure with flexible treatment, no task-completion affordance, and no `彈性` label

#### Scenario: Alternative members are all optional and tentative
- **WHEN** two restaurants form a choose-one group and both are optional, tentative, and flexible
- **THEN** the group shows its choose-one heading and neither member shows `可選`, `暫定`, or `彈性`

#### Scenario: Standalone item is optional and tentative
- **WHEN** a standalone entity is both optional and tentative
- **THEN** only `暫定` is shown

## ADDED Requirements

### Requirement: Place text is not repeated
When an entity's title already contains its place text after whitespace normalization, Result SHALL NOT render the place as a separate line; the map action SHALL attach to the title line instead. Otherwise the place line SHALL carry the map action. Map actions SHALL be at least 44px touch targets.

#### Scenario: Title equals place
- **WHEN** an entity's title and place are both `no more pizza`
- **THEN** the text appears once, with a map action beside the title

#### Scenario: Title contains place plus a gloss
- **WHEN** the title is `노랑통닭 명동점 (炸雞)` and the place is `노랑통닭 명동점`
- **THEN** the place line is omitted and the map action sits beside the title

### Requirement: Unimported images leave no empty frame
Result SHALL NOT render placeholder frames or "image attachment not provided" notices for unresolved image references. The unresolved references remain in Canonical data and are surfaced only through Review.

#### Scenario: Reference section had two missing timetables
- **WHEN** a confirmed trip contains two unresolved image supporting items
- **THEN** Result renders the surrounding reference text without any empty image frame or missing-image notice

### Requirement: Supporting groups render as collapsed sections
Result SHALL render supporting items grouped by their confirmed group as default-collapsed disclosure sections titled with the group label and the number of retained items. Ungrouped supporting items SHALL render in the existing reference area. Disclosure SHALL be keyboard- and screen-reader-operable at mobile and desktop widths, and Result MUST NOT know the source format.

#### Scenario: Workbook had a food list
- **WHEN** a confirmed trip has a supporting group `美食清單` with 42 items
- **THEN** Result shows a collapsed section `美食清單（42）` that expands to the 42 items in order
