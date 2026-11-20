// Declarative demo profile specs for the web preview (?profile=<id>).
// This file is the single source for the seeded demo profiles. It holds plain
// data only (no value imports) so plain Node scripts can import it directly
// with native type stripping. Derivation lives in $lib/demo-profiles.
// Tiles carry no coordinates; the app places them with the same first-fit
// packing used for unplaced bookmarks. Order folders large -> wide -> medium
// so the first-fit pass packs densely.
import type { Settings } from '$lib/config'
import type { ThemeName } from '$lib/themes'
import type { TileSize } from '$lib/types'

export interface DemoTileSpec {
  title: string
  url: string
  size: TileSize
  colorIndex: number
}

export interface DemoFolderSpec {
  title: string
  size: TileSize
  colorIndex: number
  children: readonly DemoNodeSpec[]
}

export type DemoNodeSpec = DemoTileSpec | DemoFolderSpec

export interface DemoProfileSpec {
  id: string
  /** Shown in tooling and used as the screenshot file name. */
  label: string
  mode: 'light' | 'dark'
  theme: ThemeName
  /** Background layer; any Settings['background'] variant. Remote image URLs and YouTube embeds make the demo produce runtime requests to that host. */
  background: Settings['background']
  /** Tiles of the Bookmarks bar container. */
  bar: readonly DemoNodeSpec[]
  /** Tiles of the Other bookmarks container. */
  other: readonly DemoNodeSpec[]
  /** Tiles of the Mobile bookmarks container. Defaults to empty. */
  mobile?: readonly DemoNodeSpec[]
}

// Public site URLs provide real domains for favicon lookup.
// Bookmark titles are illustrative and may not match the linked landing pages.
function tile(title: string, url: string, size: TileSize, colorIndex: number): DemoTileSpec {
  return { title, url, size, colorIndex }
}

function folder(title: string, size: TileSize, colorIndex: number, children: readonly DemoNodeSpec[]): DemoFolderSpec {
  return { title, size, colorIndex, children }
}

export const DEMO_PROFILE_SPECS = [
  {
    id: 'daily-work',
    label: 'daily-work-launchpad',
    theme: 'ayu-light',
    mode: 'light',
    background: { type: 'shader', shaderId: 'flow', opacity: 0.7 },
    bar: [
      tile('Today’s Tasks', 'https://todoist.com/', 'large', 0),
      tile('Focus Timer', 'https://pomofocus.io/', 'wide', 2),
      tile('Personal Tasks', 'https://ticktick.com/', 'small', 3),
      tile('Issue Tracker', 'https://linear.app/', 'wide', 1),
      tile('Team Calendar', 'https://calendar.google.com/', 'wide', 1),
      tile('Availability Poll', 'https://doodle.com/', 'wide', 3),
      tile('Project Board', 'https://trello.com/', 'wide', 2),
      tile('Time Zone Converter', 'https://timeanddate.com/', 'small', 0),
      tile('Inbox', 'https://mail.google.com/', 'medium', 1),
      tile('Shared Inbox', 'https://front.com/', 'wide', 1),
      tile('Quick Messages', 'https://teams.microsoft.com/', 'wide', 2),
      tile('Email Templates', 'https://mailchimp.com/', 'small', 2),
      tile('File Requests', 'https://dropbox.com/', 'small', 3),
      tile('Sprint Backlog', 'https://atlassian.com/', 'small', 2),
      tile('Shared Drive', 'https://drive.google.com/', 'medium', 2),
      tile('Chat', 'https://slack.com/', 'small', 0),
      tile('Invoices', 'https://freshbooks.com/', 'wide', 0),
      tile('Video Calls', 'https://zoom.us/', 'medium', 1),
      tile('Team Docs', 'https://docs.google.com/', 'medium', 2),
      tile('Receipts', 'https://waveapps.com/', 'small', 1),
      tile('Expenses', 'https://expensify.com/', 'small', 3),
    ],
    other: [
      folder('Team Reference', 'medium', 3, [
        tile('Team Handbook', 'https://notion.so/', 'wide', 3),
        tile('Company Wiki', 'https://confluence.atlassian.com/', 'medium', 3),
        tile('Policy Library', 'https://sharepoint.com/', 'medium', 0),
        tile('Meeting Recordings', 'https://otter.ai/', 'wide', 2),
        tile('Meeting Notes', 'https://onenote.com/', 'medium', 1),
        tile('Planning Notes', 'https://coda.io/', 'medium', 3),
      ]),
    ],
  },
  {
    // Open both Design folders for the full-ancestry screenshot.
    id: 'multi-project',
    label: 'multi-project-workspace',
    theme: 'tokyo-night-moon',
    mode: 'dark',
    background: { type: 'shader', shaderId: 'incense' },
    bar: [
      folder('Harbor Studio', 'wide', 0, [
        folder('Design', 'medium', 0, [
          tile('Homepage Mockups', 'https://figma.com/', 'wide', 0),
          tile('Mobile Mockups', 'https://sketch.com/', 'wide', 2),
          tile('Round Two Feedback', 'https://miro.com/', 'medium', 1),
          tile('Color Palette', 'https://coolors.co/', 'medium', 3),
          tile('Usability Findings', 'https://maze.co/', 'medium', 1),
          tile('Review Recording', 'https://vimeo.com/', 'wide', 2),
          tile('Component Handoff', 'https://storybook.js.org/', 'medium', 2),
          tile('Icon Library', 'https://lucide.dev/', 'medium', 2),
          tile('Accessibility Checklist', 'https://w3.org/', 'medium', 3),
        ]),
        tile('Website Brief', 'https://basecamp.com/', 'medium', 1),
        tile('Content Inventory', 'https://airtable.com/', 'medium', 0),
        tile('Launch Checklist', 'https://clickup.com/', 'medium', 1),
      ]),
      folder('Orchard Market', 'wide', 2, [
        folder('Design', 'wide', 2, [
          tile('Checkout Mockups', 'https://adobe.com/', 'wide', 2),
          tile('Checkout Flow Map', 'https://whimsical.com/', 'medium', 3),
          tile('Type Samples', 'https://fonts.google.com/', 'wide', 0),
          tile('Prototype Feedback', 'https://loom.com/', 'medium', 3),
          tile('Interview Notes', 'https://dovetail.com/', 'wide', 2),
          tile('Survey Results', 'https://typeform.com/', 'medium', 3),
          tile('Checkout Handoff', 'https://zeplin.io/', 'medium', 0),
          tile('Motion Specs', 'https://lottiefiles.com/', 'medium', 3),
          tile('Illustration Assets', 'https://thenounproject.com/', 'medium', 0),
        ]),
        tile('Checkout Brief', 'https://asana.com/', 'wide', 3),
        tile('Milestone Plan', 'https://smartsheet.com/', 'wide', 1),
        tile('Stakeholder Signoff', 'https://docusign.com/', 'wide', 2),
      ]),
    ],
    other: [
      tile('Project Templates', 'https://canva.com/', 'medium', 1),
      tile('Presentation Templates', 'https://slidesgo.com/', 'medium', 0),
      tile('Stock Photography', 'https://unsplash.com/', 'medium', 1),
    ],
  },
  {
    // Search for “urban heat” to surface matches across both containers.
    id: 'research',
    label: 'research-library',
    theme: 'ayu-dark',
    mode: 'dark',
    background: { type: 'shader', shaderId: 'monterey' },
    bar: [
      folder('Papers', 'wide', 0, [
        tile('Urban Heat and Street Tree Canopy', 'https://nature.com/', 'wide', 0),
        tile('Urban Heat and Cool Roofs', 'https://pnas.org/', 'medium', 1),
        tile('Urban Heat Exposure by Neighborhood', 'https://plos.org/', 'wide', 2),
        tile('Mapping Urban Heat After Sunset', 'https://sciencedirect.com/', 'wide', 1),
        tile('Urban Heat After Dark: Review', 'https://springer.com/', 'wide', 1),
        tile('Urban Heat and Building Density', 'https://tandfonline.com/', 'wide', 2),
        tile('Measuring Roadside Air Quality', 'https://pubmed.ncbi.nlm.nih.gov/', 'wide', 2),
        tile('Roadside Particulate Trends', 'https://eea.europa.eu/', 'wide', 0),
        tile('Traffic Noise Mapping', 'https://who.int/', 'medium', 3),
      ]),
      folder('Datasets', 'wide', 1, [
        tile('Urban Heat Sensor Readings', 'https://data.gov/', 'wide', 1),
        tile('Urban Heat Satellite Layers', 'https://earthdata.nasa.gov/', 'wide', 0),
        tile('Urban Heat Station Archive', 'https://ncei.noaa.gov/', 'medium', 1),
        tile('City Park Boundaries', 'https://openstreetmap.org/', 'medium', 2),
        tile('Street Tree Inventory', 'https://nyc.gov/', 'medium', 0),
        tile('Open Land Cover Maps', 'https://usgs.gov/', 'medium', 1),
      ]),
    ],
    other: [
      folder('Articles', 'medium', 2, [
        tile('How Cities Tackle Urban Heat', 'https://epa.gov/', 'wide', 2),
        tile('Urban Heat and Public Health', 'https://theconversation.com/', 'medium', 0),
        tile('Urban Heat Adaptation Case Studies', 'https://c40.org/', 'medium', 1),
        tile('Stormwater Design Guide', 'https://nacto.org/', 'wide', 1),
        tile('Designing Streets for Heavy Rain', 'https://wri.org/', 'medium', 3),
        tile('Flood Risk Maps', 'https://fema.gov/', 'medium', 2),
      ]),
    ],
  },
  {
    id: 'travel',
    label: 'travel-planner',
    theme: 'ayu-dark',
    mode: 'light',
    background: { type: 'shader', shaderId: 'monterey' },
    bar: [
      tile('Lisbon Trip Itinerary', 'https://visitlisboa.com/', 'large', 0),
      tile('Travel Checklist', 'https://ricksteves.com/', 'small', 0),
      tile('Lisbon City Guide', 'https://lonelyplanet.com/', 'small', 3),
      tile('Rail Timetables', 'https://cp.pt/', 'wide', 1),
      tile('Regional Bus Schedules', 'https://rede-expressos.pt/', 'medium', 1),
      tile('Rail Route Planner', 'https://rome2rio.com/', 'small', 0),
      tile('Hostel Backup', 'https://hostelworld.com/', 'medium', 2),
      tile('Apartment Shortlist', 'https://airbnb.com/', 'small', 1),
      tile('Accommodation', 'https://booking.com/', 'small', 2),
      tile('Metro Map', 'https://metrolisboa.pt/', 'medium', 1),
      tile('Tram Routes', 'https://carris.pt/', 'medium', 3),
      tile('Offline Area Maps', 'https://organicmaps.app/', 'wide', 0),
      tile('Museum Hours', 'https://museus.gov.pt/', 'medium', 3),
      tile('Gulbenkian Museum', 'https://gulbenkian.pt/', 'small', 3),
      tile('Weather', 'https://ipma.pt/', 'small', 0),
      tile('Restaurant Shortlist', 'https://tripadvisor.com/', 'medium', 2),
      tile('Market Food Stalls', 'https://timeoutmarket.com/', 'small', 0),
      tile('MAAT Exhibitions', 'https://maat.pt/', 'medium', 0),
      tile('Dinner Reservations', 'https://thefork.com/', 'medium', 1),
      tile('Local Forecast', 'https://meteoblue.com/', 'medium', 1),
      tile('Sunset Times', 'https://time.is/', 'medium', 0),
    ],
    other: [
      folder('Day Trips', 'medium', 3, [
        tile('Sintra Day Trip', 'https://parquesdesintra.pt/', 'wide', 3),
        tile('Pena Palace Tickets', 'https://tiqets.com/', 'wide', 1),
        tile('Sintra Walking Routes', 'https://alltrails.com/', 'medium', 2),
        tile('Cascais Coastal Walk', 'https://cascais.pt/', 'medium', 1),
        tile('Cascais Bike Routes', 'https://komoot.com/', 'medium', 3),
        tile('Coastal Conditions', 'https://windy.com/', 'medium', 0),
      ]),
    ],
  },
  {
    // For a companion shot, drag Lemon Chickpea Orzo forward in the bar.
    id: 'cooking',
    label: 'cooking-reference-shelf',
    theme: 'ayu-dark',
    mode: 'light',
    background: { type: 'shader', shaderId: 'monterey' },
    bar: [
      tile('Weekly Meal Plan', 'https://mealime.com/', 'large', 0),
      tile('Grocery List', 'https://anylist.com/', 'wide', 1),
      tile('Recipe Queue', 'https://paprikaapp.com/', 'wide', 2),
      folder('Weeknight Dinners', 'medium', 1, [
        tile('Sheet-Pan Salmon', 'https://allrecipes.com/', 'wide', 1),
        tile('Miso Salmon', 'https://justonecookbook.com/', 'medium', 0),
        tile('Lemon Chicken Tray Bake', 'https://recipetineats.com/', 'medium', 1),
        tile('Crispy Bean Tostadas', 'https://cookieandkate.com/', 'wide', 0),
        tile('Black Bean Tacos', 'https://budgetbytes.com/', 'medium', 2),
        tile('Roasted Cauliflower Tacos', 'https://minimalistbaker.com/', 'medium', 1),
      ]),
      folder('Baking', 'wide', 2, [
        tile('No-Knead Focaccia', 'https://kingarthurbaking.com/', 'wide', 2),
        tile('Rosemary Flatbread', 'https://theperfectloaf.com/', 'wide', 3),
        tile('Overnight Pizza Dough', 'https://kingarthurbaking.com/', 'medium', 0),
        tile('Blueberry Muffins', 'https://sallysbakingaddiction.com/', 'medium', 3),
        tile('Banana Crumb Muffins', 'https://smittenkitchen.com/', 'medium', 2),
        tile('Lemon Poppy Seed Loaf', 'https://joythebaker.com/', 'medium', 3),
      ]),
      tile('Substitutions', 'https://thespruceeats.com/', 'medium', 3),
      tile('Egg Replacements', 'https://bobsredmill.com/', 'small', 0),
      tile('Buttermilk Alternatives', 'https://thekitchn.com/', 'small', 1),
      tile('Pancakes', 'https://bbcgoodfood.com/', 'small', 1),
      tile('Oat Pancakes', 'https://loveandlemons.com/', 'wide', 0),
      tile('Dutch Baby', 'https://bonappetit.com/', 'small', 1),
      tile('Lemon Chickpea Orzo', 'https://eatingwell.com/', 'wide', 2),
      tile('Lemony White Beans', 'https://simplyrecipes.com/', 'wide', 1),
      tile('Spinach Orzo', 'https://food52.com/', 'medium', 0),
    ],
    other: [
      folder('Kitchen Reference', 'medium', 3, [
        tile('Volume-to-Weight Conversions', 'https://seriouseats.com/', 'wide', 3),
        tile('Ingredient Weights', 'https://baking-sense.com/', 'medium', 0),
        tile('Oven Temperature Chart', 'https://deliaonline.com/', 'wide', 1),
        tile('Freezer Storage Guide', 'https://foodsafety.gov/', 'medium', 0),
        tile('Leftover Safety', 'https://fsis.usda.gov/', 'medium', 3),
        tile('Frozen Food Storage Times', 'https://extension.umn.edu/', 'medium', 0),
      ]),
    ],
  },
] as const satisfies readonly DemoProfileSpec[]
