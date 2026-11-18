// Seeded demo profiles for the web preview (?profile=<id>).
// Each profile pairs a bookmark tree with a curated layout, tile appearance,
// mode, gallery theme and local shader background, so the published
// screenshots render the same on any machine without remote assets.
// Hex values are not used here; themes and shaders are referenced by id.
import type { Settings } from '$lib/config'
import type { ThemeName } from '$lib/themes'
import type { AppData, BookmarkNode, Layout, TileSize } from '$lib/types'
import { APPEARANCE_DEFAULTS, SETTINGS_DEFAULTS } from '$lib/config'
import { emptyData } from '$lib/coordinator'

const link = (id: string, title: string, url: string): BookmarkNode => ({ id, title, url })
const folder = (id: string, title: string, children: BookmarkNode[], folderType?: string): BookmarkNode => ({ id, title, children, folderType })
const item = (i: string, x: number, y: number, w: number, h: number) => ({ i, x, y, w, h })
function shader(shaderId: string): Settings['background'] {
  return {
    type: 'shader',
    shaderId,
    speed: 1,
    targetFps: 60,
    opacity: 1,
    mouseInteraction: false,
    renderScale: 0.5,
    quality: 'motion',
    auto: true,
  }
}

const DEMO_PROFILE_IDS = ['gamer', 'traveler', 'home-cook'] as const
export type DemoProfileId = (typeof DEMO_PROFILE_IDS)[number]

export interface DemoProfile {
  id: DemoProfileId
  /** Shown in tooling and used as the screenshot file name. */
  label: string
  mode: 'light' | 'dark'
  theme: ThemeName
  tree: () => BookmarkNode[]
  data: () => AppData
}

function buildData(layouts: Record<string, Layout>, sizes: Record<string, TileSize>, colors: Record<string, number>, background: Settings['background']): AppData {
  const appearance: AppData['appearance'] = Object.fromEntries(
    Object.keys(sizes).map(id => [id, { size: sizes[id], colorIndex: colors[id] ?? APPEARANCE_DEFAULTS.colorIndex }]),
  )
  return {
    ...emptyData({ ...SETTINGS_DEFAULTS, density: 'compact', background }),
    layouts,
    appearance,
  }
}

function gamerTree(): BookmarkNode[] {
  return [folder('root', '', [
    folder('bar', 'Bookmarks bar', [
      link('steam', 'Steam', 'https://store.steampowered.com/'),
      link('epic', 'Epic Games Store', 'https://store.epicgames.com/'),
      link('discord', 'Discord', 'https://discord.com/'),
      link('twitch', 'Twitch', 'https://www.twitch.tv/'),
      link('youtube', 'YouTube', 'https://www.youtube.com/'),
      folder('storefronts', 'Storefronts', [
        link('gog', 'GOG', 'https://www.gog.com/'),
        link('itch', 'itch.io', 'https://itch.io/'),
        link('humble', 'Humble Bundle', 'https://www.humblebundle.com/'),
        link('greenmangaming', 'Green Man Gaming', 'https://www.greenmangaming.com/'),
        link('fanatical', 'Fanatical', 'https://www.fanatical.com/'),
        link('gamersgate', 'GamersGate', 'https://www.gamersgate.com/'),
        link('eaapp', 'EA app', 'https://www.ea.com/ea-app'),
        link('playstation', 'PlayStation Store', 'https://www.playstation.com/en-us/store/'),
      ]),
      folder('community', 'Community', [
        link('pcgaming', 'r/pcgaming', 'https://www.reddit.com/r/pcgaming/'),
        link('steamdb', 'SteamDB', 'https://steamdb.info/'),
        link('protondb', 'ProtonDB', 'https://www.protondb.com/'),
        link('resetera', 'ResetEra', 'https://www.resetera.com/'),
        link('rsteam', 'r/Steam', 'https://www.reddit.com/r/Steam/'),
        link('rps', 'Rock Paper Shotgun', 'https://www.rockpapershotgun.com/'),
      ]),
      folder('tools', 'Tools', [
        link('pcpartpicker', 'PCPartPicker', 'https://pcpartpicker.com/'),
        link('canyourunit', 'Can You Run It', 'https://www.systemrequirementslab.com/cyri'),
        link('geforcedrivers', 'GeForce Drivers', 'https://www.nvidia.com/drivers'),
        link('obs', 'OBS Studio', 'https://obsproject.com/'),
        link('threedmark', '3DMark', 'https://www.3dmark.com/'),
        link('userbenchmark', 'UserBenchmark', 'https://www.userbenchmark.com/'),
      ]),
    ], 'bookmarks-bar'),
    folder('other', 'Other bookmarks', [
      link('howlongtobeat', 'HowLongToBeat', 'https://howlongtobeat.com/'),
      link('pcgamer', 'PC Gamer', 'https://www.pcgamer.com/'),
      link('isthereanydeal', 'IsThereAnyDeal', 'https://isthereanydeal.com/'),
      link('nexusmods', 'Nexus Mods', 'https://www.nexusmods.com/'),
      link('steamcharts', 'Steam Charts', 'https://steamcharts.com/'),
      link('backloggd', 'Backloggd', 'https://backloggd.com/'),
      link('metacritic', 'Metacritic', 'https://www.metacritic.com/game/'),
      link('gamersnexus', 'Gamers Nexus', 'https://www.gamersnexus.net/'),
      link('chesscom', 'Chess.com', 'https://www.chess.com/'),
      link('lichess', 'Lichess', 'https://lichess.org/'),
      link('osu', 'osu!', 'https://osu.ppy.sh/'),
    ], 'other'),
    folder('mobile', 'Mobile bookmarks', [], 'mobile'),
  ])]
}

function gamerData(): AppData {
  const layouts: Record<string, Layout> = {
    bar: [
      item('steam', 0, 0, 4, 4),
      item('epic', 4, 0, 2, 2),
      item('discord', 6, 0, 2, 2),
      item('twitch', 4, 2, 2, 2),
      item('storefronts', 6, 2, 2, 2),
      item('youtube', 0, 4, 4, 2),
      item('community', 4, 4, 4, 4),
    ],
    other: [
      item('howlongtobeat', 0, 0, 4, 2),
      item('pcgamer', 4, 0, 2, 2),
      item('isthereanydeal', 6, 0, 2, 2),
      item('tools', 0, 2, 4, 2),
      item('nexusmods', 4, 2, 2, 2),
      item('steamcharts', 6, 2, 2, 2),
      item('backloggd', 0, 4, 4, 2),
      item('metacritic', 4, 4, 2, 2),
      item('gamersnexus', 6, 4, 2, 2),
      item('chesscom', 0, 6, 2, 2),
      item('lichess', 2, 6, 2, 2),
      item('osu', 4, 6, 2, 2),
    ],
    storefronts: [
      item('gog', 0, 0, 2, 2),
      item('itch', 2, 0, 2, 2),
      item('humble', 4, 0, 2, 2),
      item('greenmangaming', 6, 0, 2, 2),
      item('fanatical', 0, 2, 2, 2),
      item('gamersgate', 2, 2, 2, 2),
      item('eaapp', 0, 4, 4, 2),
      item('playstation', 0, 6, 4, 2),
    ],
    community: [
      item('pcgaming', 0, 0, 4, 2),
      item('steamdb', 0, 2, 2, 2),
      item('protondb', 2, 2, 2, 2),
      item('resetera', 0, 4, 4, 2),
      item('rsteam', 0, 6, 2, 2),
      item('rps', 2, 6, 2, 2),
    ],
    tools: [
      item('pcpartpicker', 0, 0, 4, 2),
      item('canyourunit', 0, 2, 2, 2),
      item('geforcedrivers', 2, 2, 2, 2),
      item('obs', 0, 4, 4, 2),
      item('threedmark', 0, 6, 2, 2),
      item('userbenchmark', 2, 6, 2, 2),
    ],
  }
  const sizes: Record<string, TileSize> = {
    steam: 'large',
    epic: 'medium',
    discord: 'medium',
    twitch: 'medium',
    youtube: 'wide',
    storefronts: 'medium',
    community: 'large',
    tools: 'wide',
    howlongtobeat: 'wide',
    pcgamer: 'medium',
    isthereanydeal: 'medium',
    backloggd: 'wide',
    nexusmods: 'medium',
    steamcharts: 'medium',
    metacritic: 'medium',
    gamersnexus: 'medium',
    chesscom: 'medium',
    lichess: 'medium',
    osu: 'medium',
    gog: 'medium',
    itch: 'medium',
    humble: 'medium',
    greenmangaming: 'medium',
    fanatical: 'medium',
    gamersgate: 'medium',
    eaapp: 'wide',
    playstation: 'wide',
    pcgaming: 'wide',
    steamdb: 'medium',
    protondb: 'medium',
    resetera: 'wide',
    rsteam: 'medium',
    rps: 'medium',
    pcpartpicker: 'wide',
    canyourunit: 'medium',
    geforcedrivers: 'medium',
    obs: 'wide',
    threedmark: 'medium',
    userbenchmark: 'medium',
  }
  const colors: Record<string, number> = {
    steam: 0,
    epic: 7,
    discord: 5,
    twitch: 4,
    youtube: 6,
    storefronts: 3,
    community: 4,
    tools: 1,
    howlongtobeat: 2,
    pcgamer: 6,
    isthereanydeal: 3,
    backloggd: 5,
    nexusmods: 7,
    steamcharts: 0,
    metacritic: 3,
    gamersnexus: 6,
    chesscom: 2,
    lichess: 5,
    osu: 6,
    gog: 1,
    itch: 6,
    humble: 3,
    greenmangaming: 0,
    fanatical: 7,
    gamersgate: 2,
    eaapp: 6,
    playstation: 5,
    pcgaming: 7,
    steamdb: 0,
    protondb: 4,
    resetera: 5,
    rsteam: 6,
    rps: 7,
    pcpartpicker: 2,
    canyourunit: 6,
    geforcedrivers: 0,
    obs: 1,
    threedmark: 3,
    userbenchmark: 4,
  }
  return buildData(layouts, sizes, colors, shader('prism-flow'))
}

function travelerTree(): BookmarkNode[] {
  return [folder('root', '', [
    folder('bar', 'Bookmarks bar', [
      link('maps', 'Google Maps', 'https://www.google.com/maps'),
      link('skyscanner', 'Skyscanner', 'https://www.skyscanner.com/'),
      link('booking', 'Booking.com', 'https://www.booking.com/'),
      link('googletravel', 'Google Travel', 'https://www.google.com/travel'),
      link('wego', 'Wego', 'https://www.wego.com/'),
      link('translate', 'Google Translate', 'https://translate.google.com/'),
      link('nomadlist', 'Nomad List', 'https://nomadlist.com/'),
      folder('plan', 'Plan', [
        link('gflights', 'Google Flights', 'https://www.google.com/travel/flights'),
        link('kayak', 'Kayak', 'https://www.kayak.com/'),
        link('rome2rio', 'Rome2Rio', 'https://www.rome2rio.com/'),
        link('wanderlog', 'Wanderlog', 'https://wanderlog.com/'),
        link('tripadvisor', 'Tripadvisor', 'https://www.tripadvisor.com/'),
        link('kiwi', 'Kiwi.com', 'https://www.kiwi.com/'),
        link('tripit', 'TripIt', 'https://www.tripit.com/'),
      ]),
      folder('stay', 'Stay', [
        link('airbnb', 'Airbnb', 'https://www.airbnb.com/'),
        link('hotels', 'Hotels.com', 'https://www.hotels.com/'),
        link('hostelworld', 'Hostelworld', 'https://www.hostelworld.com/'),
        link('expedia', 'Expedia', 'https://www.expedia.com/'),
        link('vrbo', 'Vrbo', 'https://www.vrbo.com/'),
      ]),
      folder('inspiration', 'Inspiration', [
        link('atlasobscura', 'Atlas Obscura', 'https://www.atlasobscura.com/'),
        link('travelreddit', 'r/travel', 'https://www.reddit.com/r/travel/'),
        link('pointsguy', 'The Points Guy', 'https://thepointsguy.com/'),
        link('lonelyplanet', 'Lonely Planet', 'https://www.lonelyplanet.com/'),
        link('solotravel', 'r/solotravel', 'https://www.reddit.com/r/solotravel/'),
        link('blondeabroad', 'The Blonde Abroad', 'https://theblondeabroad.com/'),
      ]),
    ], 'bookmarks-bar'),
    folder('other', 'Other bookmarks', [
      link('xe', 'XE Currency', 'https://www.xe.com/'),
      link('earth', 'Google Earth', 'https://earth.google.com/'),
      link('seatguru', 'SeatGuru', 'https://www.seatguru.com/'),
      link('roadtrippers', 'Roadtrippers', 'https://roadtrippers.com/'),
      link('traveladvisory', 'Travel Advisory', 'https://travel.state.gov/en/international-travel.html'),
    ], 'other'),
    folder('mobile', 'Mobile bookmarks', [], 'mobile'),
  ])]
}

function travelerData(): AppData {
  const layouts: Record<string, Layout> = {
    bar: [
      item('maps', 0, 0, 4, 4),
      item('skyscanner', 4, 0, 2, 2),
      item('booking', 6, 0, 2, 2),
      item('inspiration', 8, 0, 2, 2),
      item('plan', 4, 2, 2, 2),
      item('stay', 6, 2, 2, 2),
      item('googletravel', 0, 4, 4, 2),
      item('wego', 4, 4, 4, 2),
      item('translate', 0, 6, 4, 2),
      item('nomadlist', 4, 6, 4, 2),
    ],
    other: [
      item('xe', 0, 0, 4, 2),
      item('earth', 0, 2, 2, 2),
      item('seatguru', 2, 2, 2, 2),
      item('roadtrippers', 0, 4, 4, 2),
      item('traveladvisory', 0, 6, 4, 2),
    ],
    plan: [
      item('gflights', 0, 0, 4, 2),
      item('kayak', 0, 2, 2, 2),
      item('rome2rio', 2, 2, 2, 2),
      item('wanderlog', 0, 4, 2, 2),
      item('tripadvisor', 2, 4, 2, 2),
      item('kiwi', 0, 6, 2, 2),
      item('tripit', 2, 6, 2, 2),
    ],
    stay: [
      item('airbnb', 0, 0, 4, 4),
      item('hotels', 4, 0, 2, 2),
      item('hostelworld', 4, 2, 2, 2),
      item('expedia', 4, 4, 4, 2),
      item('vrbo', 4, 6, 4, 2),
    ],
    inspiration: [
      item('atlasobscura', 0, 0, 4, 2),
      item('travelreddit', 0, 2, 2, 2),
      item('pointsguy', 2, 2, 2, 2),
      item('lonelyplanet', 0, 4, 4, 2),
      item('solotravel', 0, 6, 2, 2),
      item('blondeabroad', 2, 6, 2, 2),
    ],
  }
  const sizes: Record<string, TileSize> = {
    maps: 'large',
    skyscanner: 'medium',
    booking: 'medium',
    googletravel: 'wide',
    wego: 'wide',
    translate: 'wide',
    nomadlist: 'wide',
    plan: 'medium',
    stay: 'medium',
    inspiration: 'medium',
    xe: 'wide',
    earth: 'medium',
    seatguru: 'medium',
    roadtrippers: 'wide',
    traveladvisory: 'wide',
    gflights: 'wide',
    kayak: 'medium',
    rome2rio: 'medium',
    wanderlog: 'medium',
    tripadvisor: 'medium',
    kiwi: 'medium',
    tripit: 'medium',
    airbnb: 'large',
    hotels: 'medium',
    hostelworld: 'medium',
    expedia: 'wide',
    vrbo: 'wide',
    atlasobscura: 'wide',
    travelreddit: 'medium',
    pointsguy: 'medium',
    lonelyplanet: 'wide',
    solotravel: 'medium',
    blondeabroad: 'medium',
  }
  const colors: Record<string, number> = {
    maps: 2,
    skyscanner: 4,
    booking: 1,
    googletravel: 0,
    wego: 7,
    translate: 6,
    nomadlist: 5,
    plan: 0,
    stay: 3,
    inspiration: 5,
    xe: 1,
    earth: 2,
    seatguru: 6,
    roadtrippers: 4,
    traveladvisory: 7,
    gflights: 0,
    kayak: 1,
    rome2rio: 4,
    wanderlog: 2,
    tripadvisor: 3,
    kiwi: 5,
    tripit: 6,
    airbnb: 6,
    hotels: 3,
    hostelworld: 7,
    expedia: 1,
    vrbo: 2,
    atlasobscura: 5,
    travelreddit: 7,
    pointsguy: 3,
    lonelyplanet: 2,
    solotravel: 6,
    blondeabroad: 4,
  }
  return buildData(layouts, sizes, colors, shader('clouds'))
}

function homeCookTree(): BookmarkNode[] {
  return [folder('root', '', [
    folder('bar', 'Bookmarks bar', [
      link('seriouseats', 'Serious Eats', 'https://www.seriouseats.com/'),
      link('budgetbytes', 'Budget Bytes', 'https://www.budgetbytes.com/'),
      link('kingarthur', 'King Arthur Baking', 'https://www.kingarthurbaking.com/'),
      link('foodnetwork', 'Food Network', 'https://www.foodnetwork.com/'),
      link('epicurious', 'Epicurious', 'https://www.epicurious.com/'),
      link('paprika', 'Paprika', 'https://www.paprikaapp.com/'),
      link('plantoeat', 'Plan to Eat', 'https://plantoeat.com/'),
      folder('recipes', 'Recipes', [
        link('allrecipes', 'Allrecipes', 'https://www.allrecipes.com/'),
        link('nytcooking', 'NYT Cooking', 'https://cooking.nytimes.com/'),
        link('bbcgoodfood', 'BBC Good Food', 'https://www.bbcgoodfood.com/'),
        link('simplyrecipes', 'Simply Recipes', 'https://www.simplyrecipes.com/'),
        link('tasteofhome', 'Taste of Home', 'https://www.tasteofhome.com/'),
      ]),
      folder('technique', 'Technique', [
        link('chefsteps', 'ChefSteps', 'https://www.chefsteps.com/'),
        link('food52', 'Food52', 'https://food52.com/'),
        link('amtk', 'America’s Test Kitchen', 'https://www.americastestkitchen.com/'),
        link('foodlab', 'The Food Lab', 'https://www.seriouseats.com/food-lab'),
        link('sousvide', 'Sous Vide Everything', 'https://www.youtube.com/@sousvideeverything'),
      ]),
      folder('community', 'Community', [
        link('askculinary', 'r/AskCulinary', 'https://www.reddit.com/r/AskCulinary/'),
        link('bakingreddit', 'r/Baking', 'https://www.reddit.com/r/Baking/'),
        link('mealprep', 'r/MealPrepSunday', 'https://www.reddit.com/r/MealPrepSunday/'),
        link('rfood', 'r/Food', 'https://www.reddit.com/r/Food/'),
        link('rcooking', 'r/Cooking', 'https://www.reddit.com/r/Cooking/'),
        link('rrecipes', 'r/recipes', 'https://www.reddit.com/r/recipes/'),
      ]),
    ], 'bookmarks-bar'),
    folder('other', 'Other bookmarks', [
      link('bonappetit', 'Bon Appétit', 'https://www.bonappetit.com/'),
      link('thekitchn', 'The Kitchn', 'https://www.thekitchn.com/'),
      link('delish', 'Delish', 'https://www.delish.com/'),
      link('tasty', 'Tasty', 'https://tasty.co/'),
      link('saveur', 'Saveur', 'https://www.saveur.com/'),
    ], 'other'),
    folder('mobile', 'Mobile bookmarks', [], 'mobile'),
  ])]
}

function homeCookData(): AppData {
  const layouts: Record<string, Layout> = {
    bar: [
      item('seriouseats', 0, 0, 4, 4),
      item('budgetbytes', 4, 0, 2, 2),
      item('kingarthur', 6, 0, 2, 2),
      item('recipes', 4, 2, 2, 2),
      item('technique', 6, 2, 2, 2),
      item('community', 8, 0, 2, 2),
      item('foodnetwork', 0, 4, 4, 2),
      item('epicurious', 4, 4, 4, 2),
      item('paprika', 0, 6, 4, 2),
      item('plantoeat', 4, 6, 4, 2),
    ],
    other: [
      item('bonappetit', 0, 0, 4, 2),
      item('thekitchn', 0, 2, 2, 2),
      item('delish', 2, 2, 2, 2),
      item('tasty', 0, 4, 4, 2),
      item('saveur', 0, 6, 4, 2),
    ],
    recipes: [
      item('allrecipes', 0, 0, 4, 2),
      item('nytcooking', 0, 2, 2, 2),
      item('bbcgoodfood', 2, 2, 2, 2),
      item('simplyrecipes', 0, 4, 4, 2),
      item('tasteofhome', 0, 6, 4, 2),
    ],
    technique: [
      item('chefsteps', 0, 0, 4, 2),
      item('food52', 0, 2, 2, 2),
      item('amtk', 2, 2, 2, 2),
      item('foodlab', 0, 4, 4, 2),
      item('sousvide', 0, 6, 4, 2),
    ],
    community: [
      item('askculinary', 0, 0, 4, 2),
      item('bakingreddit', 0, 2, 2, 2),
      item('mealprep', 2, 2, 2, 2),
      item('rfood', 0, 4, 2, 2),
      item('rcooking', 2, 4, 2, 2),
      item('rrecipes', 0, 6, 4, 2),
    ],
  }
  const sizes: Record<string, TileSize> = {
    seriouseats: 'large',
    budgetbytes: 'medium',
    kingarthur: 'medium',
    foodnetwork: 'wide',
    epicurious: 'wide',
    paprika: 'wide',
    plantoeat: 'wide',
    recipes: 'medium',
    technique: 'medium',
    community: 'medium',
    bonappetit: 'wide',
    thekitchn: 'medium',
    delish: 'medium',
    tasty: 'wide',
    saveur: 'wide',
    allrecipes: 'wide',
    nytcooking: 'medium',
    bbcgoodfood: 'medium',
    simplyrecipes: 'wide',
    tasteofhome: 'wide',
    chefsteps: 'wide',
    food52: 'medium',
    amtk: 'medium',
    foodlab: 'wide',
    sousvide: 'wide',
    askculinary: 'wide',
    bakingreddit: 'medium',
    mealprep: 'medium',
    rfood: 'medium',
    rcooking: 'medium',
    rrecipes: 'wide',
  }
  const colors: Record<string, number> = {
    seriouseats: 6,
    budgetbytes: 3,
    kingarthur: 1,
    foodnetwork: 3,
    epicurious: 6,
    paprika: 2,
    plantoeat: 4,
    recipes: 4,
    technique: 0,
    community: 5,
    bonappetit: 7,
    thekitchn: 1,
    delish: 6,
    tasty: 5,
    saveur: 2,
    allrecipes: 7,
    nytcooking: 1,
    bbcgoodfood: 2,
    simplyrecipes: 3,
    tasteofhome: 6,
    chefsteps: 0,
    food52: 1,
    amtk: 2,
    foodlab: 6,
    sousvide: 3,
    askculinary: 5,
    bakingreddit: 1,
    mealprep: 2,
    rfood: 6,
    rcooking: 3,
    rrecipes: 7,
  }
  return buildData(layouts, sizes, colors, shader('incense'))
}

export const DEMO_PROFILES: Record<DemoProfileId, DemoProfile> = {
  'gamer': { id: 'gamer', label: 'Gamer', mode: 'dark', theme: 'vice', tree: gamerTree, data: gamerData },
  'traveler': { id: 'traveler', label: 'Traveler', mode: 'dark', theme: 'tokyo-night-moon', tree: travelerTree, data: travelerData },
  'home-cook': { id: 'home-cook', label: 'Home cook', mode: 'dark', theme: 'solarized-dark', tree: homeCookTree, data: homeCookData },
}

const DEMO_PROFILE_ID_LIST: readonly string[] = DEMO_PROFILE_IDS

export function isDemoProfileId(value: unknown): value is DemoProfileId {
  return typeof value === 'string' && DEMO_PROFILE_ID_LIST.includes(value)
}
