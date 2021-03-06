const path = require('path')
const fs = require('fs-extra')
const ImageProcessQueue = require('../lib/app/ImageProcessQueue')
const targetDir = path.join(__dirname, 'assets', 'static')
const assetsDir = path.join(targetDir, 'assets')
const context = assetsDir
const pathPrefix = '/'

const baseconfig = {
  pathPrefix,
  targetDir,
  assetsDir,
  imageExtensions: ['.jpg', '.png', '.webp'],
  maxImageWidth: 1000
}

beforeEach(() => (ImageProcessQueue.uid = 0))
afterAll(() => fs.remove(targetDir))

test('generate srcset for image', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath)

  expect(result.type).toEqual('png')
  expect(result.filePath).toEqual(filePath)
  expect(result.src).toEqual('/assets/static/1000x600-w1000.test.png')
  expect(result.sizes).toEqual('(max-width: 1000px) 100vw, 1000px')
  expect(result.dataUri).toMatchSnapshot()
  expect(result.imageHTML).toMatchSnapshot()
  expect(result.noscriptHTML).toMatchSnapshot()
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600-w480.test.png')
  expect(result.sets[0].width).toEqual(480)
  expect(result.sets[0].height).toEqual(288)
  expect(result.sets[0].type).toEqual('png')
  expect(result.sets[1].src).toEqual('/assets/static/1000x600-w1000.test.png')
  expect(result.sets[1].width).toEqual(1000)
  expect(result.sets[1].height).toEqual(600)
  expect(result.sets[1].type).toEqual('png')
  expect(result.srcset[0]).toEqual('/assets/static/1000x600-w480.test.png 480w')
  expect(result.srcset[1]).toEqual('/assets/static/1000x600-w1000.test.png 1000w')
})

test('resize image by width attribute', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { width: 300 })

  expect(result.src).toEqual('/assets/static/1000x600-w300.test.png')
  expect(result.sizes).toEqual('(max-width: 300px) 100vw, 300px')
  expect(result.dataUri).toMatchSnapshot()
  expect(result.sets).toHaveLength(1)
  expect(result.srcset).toHaveLength(1)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600-w300.test.png')
  expect(result.sets[0].width).toEqual(300)
  expect(result.sets[0].height).toEqual(180)
  expect(result.srcset[0]).toEqual('/assets/static/1000x600-w300.test.png 300w')
})

test('disable blur filter', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { blur: '0' })

  expect(result.dataUri).toMatchSnapshot()
})

test('set custom quality', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { quality: 10 })

  expect(result.src).toEqual('/assets/static/1000x600-w1000-q10.test.png')
})

test('add custom attributes to markup', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, {
    classNames: ['test-1', 'test-2'],
    alt: 'Alternative text',
    height: '100'
  })

  expect(result.imageHTML).toMatch(/test-1/)
  expect(result.imageHTML).toMatch(/test-2/)
  expect(result.imageHTML).toMatch(/height=\"100\"/)
  expect(result.imageHTML).toMatch(/alt=\"Alternative text\"/)

  expect(result.noscriptHTML).toMatch(/test-1/)
  expect(result.noscriptHTML).toMatch(/test-2/)
  expect(result.noscriptHTML).toMatch(/height=\"100\"/)
  expect(result.noscriptHTML).toMatch(/alt=\"Alternative text\"/)
})

test('respect config.maxImageWidth', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const config = { ...baseconfig, maxImageWidth: 600 }
  const queue = new ImageProcessQueue({ context, config })

  const result = await queue.add(filePath)

  expect(result.src).toEqual('/assets/static/1000x600-w600.test.png')
  expect(result.sets).toHaveLength(2)
  expect(result.srcset).toHaveLength(2)
  expect(result.sets[0].src).toEqual('/assets/static/1000x600-w480.test.png')
  expect(result.sets[1].src).toEqual('/assets/static/1000x600-w600.test.png')
  expect(result.srcset[0]).toEqual('/assets/static/1000x600-w480.test.png 480w')
  expect(result.srcset[1]).toEqual('/assets/static/1000x600-w600.test.png 600w')
})

test('do not resize if image is too small', async () => {
  const filePath = path.resolve(__dirname, 'assets/350x250.png')
  const config = { ...baseconfig, maxImageWidth: 600 }
  const queue = new ImageProcessQueue({ context, config })

  const result = await queue.add(filePath, { width: 600 })

  expect(result.src).toEqual('/assets/static/350x250-w350.test.png')
  expect(result.sets).toHaveLength(1)
  expect(result.srcset).toHaveLength(1)
})

test('get url for server in serve mode', async () => {
  const relPath = 'assets/1000x600.png'
  const absPath = path.resolve(__dirname, relPath)
  const config = { ...baseconfig, maxImageWidth: 500 }
  const queue = new ImageProcessQueue({ config, context: __dirname })
  const mode = process.env.GRIDSOME_MODE

  process.env.GRIDSOME_MODE = 'serve'

  const result = await queue.add(absPath)
  const result2 = await queue.add(absPath, { quality: 50, width: 200 })

  process.env.GRIDSOME_MODE = mode

  expect(result.src).toEqual('/assets/static/assets/1000x600.png?width=500')
  expect(result2.src).toEqual('/assets/static/assets/1000x600.png?width=200&quality=50')
})

test('get queue values', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  await queue.add(filePath)
  const values = queue.queue

  expect(values).toHaveLength(2)
})

test('disable lazy loading', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { immediate: true })

  expect(result.imageHTML).toMatchSnapshot()
  expect(result.noscriptHTML).toEqual('')
})

test('skip srcset and dataUri', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  const result = await queue.add(filePath, { srcset: false })

  expect(result.srcset).toBeUndefined()
  expect(result.dataUri).toBeUndefined()
  expect(result.sizes).toBeUndefined()
  expect(result.imageHTML).toMatchSnapshot()
})

test('fail if file is missing', async () => {
  const filePath = path.resolve(__dirname, 'assets/1000x600-missing.png')
  const queue = new ImageProcessQueue({ context, config: baseconfig })

  expect(queue.add(filePath, { srcset: false })).rejects.toThrow(/was not found/)
})

test('fail if extension is not supported', async () => {
  const filePath = path.resolve(__dirname, 'assets/text.txt')
  const config = { ...baseconfig, imageExtensions: ['.jpg'] }
  const queue = new ImageProcessQueue({ context, config })

  expect(queue.add(filePath)).rejects.toThrow(/\.txt is not a supported image format/)
})
