import type { MiniReactChild, MiniReactElement } from '@/lib/mini-react/jsx-runtime'

export function isMiniReactElement(value: MiniReactChild): value is MiniReactElement {
  return Boolean(value && typeof value === 'object' && 'props' in (value as Record<string, unknown>))
}

export function getChildren(element: MiniReactElement): MiniReactChild[] {
  return element.props.children ?? []
}

export function findElement(
  node: MiniReactChild,
  predicate: (element: MiniReactElement) => boolean,
): MiniReactElement | null {
  if (!isMiniReactElement(node)) {
    return null
  }

  if (predicate(node)) {
    return node
  }

  for (const child of getChildren(node)) {
    const match = findElement(child, predicate)
    if (match) {
      return match
    }
  }
  return null
}

export function collectElements(
  node: MiniReactChild,
  predicate: (element: MiniReactElement) => boolean,
  bucket: MiniReactElement[] = [],
): MiniReactElement[] {
  if (!isMiniReactElement(node)) {
    return bucket
  }

  if (predicate(node)) {
    bucket.push(node)
  }

  for (const child of getChildren(node)) {
    collectElements(child, predicate, bucket)
  }

  return bucket
}
