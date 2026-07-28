import { createApp, defineComponent, h } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App.vue'

const mounted: Array<ReturnType<typeof createApp>> = []
const mountApp = (workspace: 'finite' | 'sparse'): HTMLElement => {
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(App)
  app.component('RouterView', defineComponent({
    setup: () => () => h('main', { 'data-workspace': workspace }, workspace),
  }))
  mounted.push(app)
  app.mount(host)
  return host
}

describe('App 公共 Footer', () => {
  afterEach(() => {
    for (const app of mounted.splice(0)) app.unmount()
    document.body.replaceChildren()
  })

  it.each(['finite', 'sparse'] as const)('%s 工作区显示备案号', (workspace) => {
    const host = mountApp(workspace)
    expect(host.querySelector(`[data-workspace="${workspace}"]`)).not.toBeNull()
    expect(host.textContent).toContain('粤ICP备2026064671号')
  })

  it('Footer 位于工作区之后且备案号只出现一次', () => {
    const host = mountApp('finite')
    expect(host.querySelector('[data-workspace="finite"]')!
      .compareDocumentPosition(host.querySelector('footer')!))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(host.querySelectorAll('a[href="https://beian.miit.gov.cn/#/Integrated/index"]'))
      .toHaveLength(1)
  })

  it('工作区切换不会让 Footer 消失或重复', async () => {
    const finiteHost = mountApp('finite')
    expect(finiteHost.querySelectorAll('footer.app-footer')).toHaveLength(1)
    mounted.shift()?.unmount()
    finiteHost.remove()
    const sparseHost = mountApp('sparse')
    expect(sparseHost.querySelectorAll('footer.app-footer')).toHaveLength(1)
    expect(sparseHost.textContent).toContain('粤ICP备2026064671号')
  })
})
