import { ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  text: string
  tone: ToastTone
}

const messages = ref<ToastMessage[]>([])
let nextId = 1

export const useToast = () => {
  const remove = (id: number) => {
    messages.value = messages.value.filter((item) => item.id !== id)
  }

  const show = (text: string, tone: ToastTone = 'info') => {
    const id = nextId++
    messages.value.push({ id, text, tone })
    window.setTimeout(() => remove(id), 3600)
  }

  return { messages, show, remove }
}
