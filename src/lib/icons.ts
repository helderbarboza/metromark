import density from '@iconify-icons/fluent/align-space-between-horizontal-20-regular'
import arrowDownRight from '@iconify-icons/fluent/arrow-down-right-20-regular'
import arrowLeft from '@iconify-icons/fluent/arrow-left-20-regular'
import arrowReset from '@iconify-icons/fluent/arrow-reset-20-regular'
import arrowRight from '@iconify-icons/fluent/arrow-right-20-regular'
import refresh from '@iconify-icons/fluent/arrow-sync-20-regular'
import undo from '@iconify-icons/fluent/arrow-undo-20-regular'
import arrowUpLeft from '@iconify-icons/fluent/arrow-up-left-20-regular'
import bookmark from '@iconify-icons/fluent/bookmark-20-regular'
import addBookmark from '@iconify-icons/fluent/bookmark-add-20-regular'
import searchBookmarks from '@iconify-icons/fluent/bookmark-search-20-regular'
import buildingFactory from '@iconify-icons/fluent/building-factory-20-regular'
import cellularExcellent from '@iconify-icons/fluent/cellular-data-1-20-regular'
import cellularGood from '@iconify-icons/fluent/cellular-data-2-20-regular'
import cellularModerate from '@iconify-icons/fluent/cellular-data-3-20-regular'
import cellularWeak from '@iconify-icons/fluent/cellular-data-4-20-regular'
import cellularPoor from '@iconify-icons/fluent/cellular-data-5-20-regular'
import check from '@iconify-icons/fluent/checkmark-20-regular'
import chevronDown from '@iconify-icons/fluent/chevron-down-20-regular'
import color from '@iconify-icons/fluent/color-20-regular'
import copy from '@iconify-icons/fluent/copy-20-regular'
import darkTheme from '@iconify-icons/fluent/dark-theme-20-regular'
import deleteIcon from '@iconify-icons/fluent/delete-20-regular'
import close from '@iconify-icons/fluent/dismiss-circle-20-regular'
import edit from '@iconify-icons/fluent/edit-20-regular'
import fastForward from '@iconify-icons/fluent/fast-forward-20-regular'
import folder from '@iconify-icons/fluent/folder-20-regular'
import gauge from '@iconify-icons/fluent/gauge-20-regular'
import globe from '@iconify-icons/fluent/globe-20-regular'
import customize from '@iconify-icons/fluent/grid-20-regular'
import image from '@iconify-icons/fluent/image-20-regular'
import imageAdd from '@iconify-icons/fluent/image-add-20-regular'
import layer from '@iconify-icons/fluent/layer-20-regular'
import more from '@iconify-icons/fluent/more-vertical-20-regular'
import openWindow from '@iconify-icons/fluent/open-20-regular'
import paintBrush from '@iconify-icons/fluent/paint-brush-20-regular'
import pause from '@iconify-icons/fluent/pause-20-regular'
import lock from '@iconify-icons/fluent/person-shield-20-regular'
import prohibited from '@iconify-icons/fluent/prohibited-20-regular'
import scaleFill from '@iconify-icons/fluent/scale-fill-20-regular'
import settings from '@iconify-icons/fluent/settings-20-regular'
import add from '@iconify-icons/fluent/square-add-20-regular'
import openTab from '@iconify-icons/fluent/tab-new-20-regular'
import transparencySquare from '@iconify-icons/fluent/transparency-square-20-regular'
import weatherMoon from '@iconify-icons/fluent/weather-moon-20-regular'
import weatherSunny from '@iconify-icons/fluent/weather-sunny-20-regular'

// Static per-icon imports keep the Iconify icon data tree-shakable. Passing the
// bundled data objects to OfflineIcon also avoids any remote icon requests.
export const icons = {
  add,
  addBookmark,
  arrowDownRight,
  arrowLeft,
  arrowReset,
  arrowRight,
  arrowUpLeft,
  bookmark,
  buildingFactory,
  check,
  chevronDown,
  close,
  color,
  copy,
  customize,
  darkTheme,
  delete: deleteIcon,
  density,
  edit,
  fastForward,
  folder,
  gauge,
  globe,
  image,
  imageAdd,
  layer,
  lock,
  more,
  openTab,
  openWindow,
  paintBrush,
  pause,
  prohibited,
  refresh,
  scaleFill,
  searchBookmarks,
  settings,
  signalExcellent: cellularExcellent,
  signalGood: cellularGood,
  signalModerate: cellularModerate,
  signalPoor: cellularPoor,
  signalWeak: cellularWeak,
  transparencySquare,
  undo,
  weatherMoon,
  weatherSunny,
} as const

export type IconName = keyof typeof icons

export const getIcon = (name: IconName) => icons[name] ?? icons.globe
