import { describe, expect, it } from 'vitest'
import { outputName, uniqueNames } from './names'

describe('outputName', () => {
  it('keeps the name, with the extension of the new format', () => {
    expect(outputName('photo.png', 'webp')).toBe('photo.webp')
    expect(outputName('photo.final.PNG', 'avif')).toBe('photo.final.avif')
    expect(outputName('photo', 'jpeg')).toBe('photo.jpg')
    expect(outputName('scan.gif', 'png')).toBe('scan.png')
    expect(outputName('photo.jfif', 'jpeg')).toBe('photo.jpg')
  })

  it('keeps an extension that already names the format, as it was spelt', () => {
    expect(outputName('photo.jpeg', 'jpeg')).toBe('photo.jpeg')
    expect(outputName('photo.JPG', 'jpeg')).toBe('photo.JPG')
    expect(outputName('art.WebP', 'webp')).toBe('art.WebP')
  })
})

describe('uniqueNames', () => {
  it('numbers repeated names so a zip keeps every file', () => {
    expect(uniqueNames(['a.png', 'b.png', 'a.png', 'a.png', 'A.png'])).toEqual([
      'a.png',
      'b.png',
      'a (2).png',
      'a (3).png',
      'A (4).png',
    ])
  })
})
