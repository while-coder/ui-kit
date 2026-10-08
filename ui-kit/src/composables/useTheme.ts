import { ref } from "vue"

// 主题模型（与 styles/theme-dark.css 的 :root[data-theme="dark"] 约定一致）：
//   light = tokens.css 中 :root 的默认值；
//   任意主题 = html[data-theme="<name>"] 覆盖 token + 声明 color-scheme。
// isDark 以 color-scheme 为判定依据（同时驱动浏览器原生控件跟随主题），
// 未声明 color-scheme 时回退到 data-theme === "dark"。
const theme = ref<string>("")
const isDark = ref<boolean>(false)

function detectTheme(): string {
  return document.documentElement.getAttribute("data-theme") ?? ""
}

function detectDark(): boolean {
  const scheme = getComputedStyle(document.documentElement)
    .getPropertyValue("color-scheme")
    .trim()
  return scheme ? scheme.includes("dark") : detectTheme() === "dark"
}

// SSR/Node 守卫：模块顶层的 document 访问只在浏览器执行，Node/SSR 环境跳过（否则 import 即抛
// document is not defined）。同时完成两件事：
//   1) 默认主题跟随系统：data-theme 缺省时按 prefers-color-scheme 写入 dark/light，消费方不初始化也不再全亮；
//   2) HMR 重复求值时先断开上一轮的 observer，避免每轮泄漏一个全局监听。
if (typeof document !== "undefined") {
  const element = document.documentElement
  const media = typeof matchMedia !== "undefined" ? matchMedia("(prefers-color-scheme: dark)") : null
  //一旦手动设置过 data-theme（非本模块写入的值）就停止跟随系统
  let manual = element.hasAttribute("data-theme")
  let lastAuto = ""
  const applyAuto = () => {
    if (manual) return
    lastAuto = media?.matches ? "dark" : "light"
    element.setAttribute("data-theme", lastAuto)
  }
  applyAuto()
  theme.value = detectTheme()
  isDark.value = detectDark()

  type WithObserver = { __suiThemeObserver?: MutationObserver }
  const holder = globalThis as WithObserver
  holder.__suiThemeObserver?.disconnect()
  const observer = new MutationObserver(() => {
    const current = element.getAttribute("data-theme")
    if (current === null) { manual = false; applyAuto() }
    else if (current !== lastAuto) manual = true
    theme.value = detectTheme()
    isDark.value = detectDark()
  })
  observer.observe(element, { attributes: true, attributeFilter: ["data-theme"] })
  holder.__suiThemeObserver = observer
  media?.addEventListener("change", applyAuto)
}

export function useTheme() {
  return { theme, isDark }
}

export { isDark }