import { afterEach, describe, expect, it, vi } from 'vitest'
import { BRIDGE_TAG, listen, post, type ToPage } from '@/lib/bridge'

const cleanups: (() => void)[] = []
afterEach(() => cleanups.splice(0).forEach((stop) => stop()))

function dispatch(data: unknown) {
  window.dispatchEvent(new MessageEvent('message', { data, source: window, origin: location.origin }))
}

describe('bridge', () => {
  it('delivers messages addressed to the listener', () => {
    const handler = vi.fn()
    cleanups.push(listen<ToPage>('page', handler))
    dispatch({ tag: BRIDGE_TAG, to: 'page', kind: 'status', id: '1' })
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'status', id: '1' }))
  })

  it('ignores other senders, other tags and the other side', () => {
    const handler = vi.fn()
    cleanups.push(listen<ToPage>('page', handler))
    dispatch({ tag: BRIDGE_TAG, to: 'content', kind: 'status', id: '1' })
    dispatch({ tag: 'someone-else', to: 'page', kind: 'status', id: '1' })
    window.dispatchEvent(new MessageEvent('message', { data: { tag: BRIDGE_TAG, to: 'page' }, origin: 'https://evil.example' }))
    expect(handler).not.toHaveBeenCalled()
  })

  it('posts with the tag and direction', () => {
    const spy = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined)
    post<ToPage>('page', { kind: 'status', id: '9' })
    expect(spy.mock.calls[0]![0]).toEqual({ kind: 'status', id: '9', tag: BRIDGE_TAG, to: 'page' })
    spy.mockRestore()
  })
})
