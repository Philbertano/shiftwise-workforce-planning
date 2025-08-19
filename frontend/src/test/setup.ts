import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock HTML5 drag and drop API
Object.defineProperty(window, 'DragEvent', {
  value: class DragEvent extends Event {
    dataTransfer: DataTransfer
    constructor(type: string, eventInitDict?: DragEventInit) {
      super(type, eventInitDict)
      this.dataTransfer = {
        dropEffect: 'none',
        effectAllowed: 'uninitialized',
        files: [] as any,
        items: [] as any,
        types: [],
        clearData: () => {},
        getData: () => '',
        setData: () => {},
        setDragImage: () => {}
      } as DataTransfer
    }
  }
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()