<template>
  <footer class="app-footer" aria-label="网站备案信息">
    <a
      href="https://beian.miit.gov.cn/#/Integrated/index"
      target="_blank"
      rel="noopener noreferrer"
    >
      粤ICP备2026064671号
    </a>
  </footer>
</template>

<style scoped>
.app-footer {
  width: 100%;
  max-width: 100%;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  overflow-wrap: anywhere;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
  background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
}

.app-footer a {
  max-width: 100%;
  color: inherit;
  text-decoration: none;
  border-radius: 4px;
  transition: color 160ms ease, text-decoration-color 160ms ease;
}

.app-footer a:hover {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.app-footer a:focus-visible {
  color: var(--accent);
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
</style>
