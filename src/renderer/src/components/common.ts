import { electronAPI } from '../../../electronAPI'

export function onShow() {
  electronAPI?.disableMenu()
}

export function onHide() {
  electronAPI?.enableMenu()
}
