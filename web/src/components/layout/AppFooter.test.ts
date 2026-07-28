import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createApp } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import AppFooter from './AppFooter.vue'

describe('AppFooter', () => {
  const mounted: Array<ReturnType<typeof createApp>> = []
  const render = (): HTMLElement => {
    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(AppFooter)
    mounted.push(app)
    app.mount(host)
    return host
  }

  afterEach(() => {
    for (const app of mounted.splice(0)) app.unmount()
    document.body.replaceChildren()
  })

  it('渲染唯一且精确的 ICP 备案链接', () => {
    const host = render()
    const links = host.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.textContent?.trim()).toBe('粤ICP备2026064671号')
    expect(links[0]!.getAttribute('href')).toBe(
      'https://beian.miit.gov.cn/#/Integrated/index',
    )
    expect(links[0]!.getAttribute('target')).toBe('_blank')
    expect(links[0]!.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('使用公共 footer 语义并提供可访问名称', () => {
    const footer = render().querySelector('footer')
    expect(footer?.tagName).toBe('FOOTER')
    expect(footer?.getAttribute('aria-label')).toBe('网站备案信息')
  })

  it.each([
    '@/stores/grid',
    '@/stores/planner',
    '@/stores/sparse',
    'setTimeout',
    'setInterval',
    'new Worker',
    '<canvas',
    'addEventListener',
    'window.open',
  ])('不依赖或创建 %s', (forbidden) => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/layout/AppFooter.vue'),
      'utf8',
    )
    expect(source).not.toContain(forbidden)
  })

  it('移动端安全样式不引入页面级横向溢出', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/layout/AppFooter.vue'),
      'utf8',
    )
    expect(source).toContain('max-width: 100%')
    expect(source).toContain('overflow-wrap: anywhere')
    expect(source).not.toContain('position: fixed')
    expect(source).not.toMatch(/width:\s*\d+px/)
  })
})
