export type MiniReactChild = MiniReactElement | MiniReactPrimitive

export type MiniReactPrimitive = string | number | boolean | null | undefined

export interface MiniReactElement<P = Record<string, unknown>> {
  readonly type: MiniReactComponent<P> | string | typeof Fragment
  readonly key: string | number | null
  readonly props: P & {
    children?: MiniReactChild[]
  }
}

export type MiniReactComponent<P = Record<string, unknown>> = (props: P) => MiniReactChild | MiniReactChild[]

export const Fragment = Symbol('MiniReact.Fragment')

type JSXRuntimeProps = Record<string, unknown> & {
  children?: MiniReactChild[] | MiniReactChild
}

type JSXKey = string | number | undefined

function normalizeChildren(children: JSXRuntimeProps['children']): MiniReactChild[] | undefined {
  if (children === undefined || children === null) {
    return undefined
  }
  const asArray = Array.isArray(children) ? children : [children]
  const filtered: MiniReactChild[] = []
  const pushChild = (child: JSXRuntimeProps['children']) => {
    if (Array.isArray(child)) {
      child.forEach(pushChild)
      return
    }
    if (child === false || child === undefined || child === null) {
      return
    }
    filtered.push(child as MiniReactChild)
  }
  asArray.forEach(pushChild)
  return filtered.length > 0 ? filtered : undefined
}

function createElement<P extends JSXRuntimeProps>(
  type: MiniReactElement<P>['type'],
  props: P | null,
  key?: JSXKey,
): MiniReactElement<P> {
  const normalized = props ? { ...props } : ({} as P)
  if ('children' in (normalized as JSXRuntimeProps)) {
    const normalizedChildren = normalizeChildren((normalized as JSXRuntimeProps).children)
    if (normalizedChildren === undefined) {
      delete (normalized as JSXRuntimeProps).children
    } else {
      ;(normalized as JSXRuntimeProps).children = normalizedChildren
    }
  }

  return {
    type,
    key: key ?? null,
    props: normalized as MiniReactElement<P>['props'],
  }
}

export function jsx<P extends JSXRuntimeProps>(type: MiniReactElement<P>['type'], props: P | null, key?: JSXKey) {
  return createElement(type, props, key)
}

export function jsxs<P extends JSXRuntimeProps>(type: MiniReactElement<P>['type'], props: P | null, key?: JSXKey) {
  return createElement(type, props, key)
}

export function jsxDEV<P extends JSXRuntimeProps>(
  type: MiniReactElement<P>['type'],
  props: P | null,
  key?: JSXKey,
) {
  return createElement(type, props, key)
}
