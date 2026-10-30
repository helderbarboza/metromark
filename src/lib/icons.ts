import arrowLeft from '@iconify-icons/fluent/arrow-left-20-regular'
import arrowRight from '@iconify-icons/fluent/arrow-right-20-regular'
import refresh from '@iconify-icons/fluent/arrow-sync-20-regular'
import undo from '@iconify-icons/fluent/arrow-undo-20-regular'
import bookmark from '@iconify-icons/fluent/bookmark-20-regular'
import addBookmark from '@iconify-icons/fluent/bookmark-add-20-regular'
import searchBookmarks from '@iconify-icons/fluent/bookmark-search-20-regular'
import check from '@iconify-icons/fluent/checkmark-20-regular'
import copy from '@iconify-icons/fluent/copy-20-regular'
import deleteIcon from '@iconify-icons/fluent/delete-20-regular'
import close from '@iconify-icons/fluent/dismiss-circle-20-regular'
import edit from '@iconify-icons/fluent/edit-20-regular'
import folder from '@iconify-icons/fluent/folder-20-regular'
import addFolder from '@iconify-icons/fluent/folder-add-20-regular'
import globe from '@iconify-icons/fluent/globe-20-regular'
import customize from '@iconify-icons/fluent/grid-20-regular'
import more from '@iconify-icons/fluent/more-vertical-20-regular'
import openWindow from '@iconify-icons/fluent/open-20-regular'
import lock from '@iconify-icons/fluent/person-shield-20-regular'
import settings from '@iconify-icons/fluent/settings-20-regular'
import add from '@iconify-icons/fluent/square-add-20-regular'
import openTab from '@iconify-icons/fluent/tab-new-24-regular'

// Static per-icon imports keep the Iconify icon data tree-shakable. Passing the
// bundled data objects to OfflineIcon also avoids any remote icon requests.
export const icons = {
  add,
  addBookmark,
  addFolder,
  arrowLeft,
  arrowRight,
  bookmark,
  check,
  close,
  copy,
  customize,
  delete: deleteIcon,
  edit,
  folder,
  globe,
  lock,
  more,
  openTab,
  openWindow,
  refresh,
  searchBookmarks,
  settings,
  undo,
} as const

export type IconName = keyof typeof icons

export const getIcon = (name: IconName) => icons[name] ?? icons.globe
