import { CM_TO_PX } from '@/utils/constants'

export const cmToPx = (cm = 0) => Math.round(cm * CM_TO_PX)

export const fmtCm = (cm = 0) => `${cm} cm`
