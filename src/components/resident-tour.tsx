"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Megaphone,
  Vote,
  Gavel,
  Wrench,
  FolderArchive,
  Phone,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  HelpCircle,
} from "lucide-react"

const SLIDES = [
  {
    icon: <div className="text-4xl">👋</div>,
    title: "Добродошли на портал!",
    desc: "Ово је ваш портал стамбене заједнице Пастерова 16. Овде можете пратити све вести, гласати, подносити захтеве и много тога. Прегледајте кратки водич кроз функције.",
  },
  {
    icon: <Megaphone className="w-10 h-10 text-indigo-500" />,
    title: "Обавештења",
    desc: "Управник објављује вести и обавештења за све станаре — ремонти, састанци, важне напомене. Хитна обавештења долазе и на ваш имејл.",
  },
  {
    icon: <Vote className="w-10 h-10 text-indigo-500" />,
    title: "Гласање",
    desc: "Учествујте у одлукама заједнице кроз анкете. Управник отвара гласање, а сваки станар може да да свој глас пре затварања.",
  },
  {
    icon: <Gavel className="w-10 h-10 text-indigo-500" />,
    title: "Тендери",
    desc: "Прегледајте понуде компанија за инвестиционе радове (нпр. видео надзор, ремонт лифта). Сваку понуду можете прочитати и гласати за ону коју сматрате најбољом.",
  },
  {
    icon: <Wrench className="w-10 h-10 text-indigo-500" />,
    title: "Захтеви за интервенцију",
    desc: "Пријавите кварове или проблеме у згради — водовод, електрика, лифт, чишћење. Управник прати статус и обавештава вас о решавању.",
  },
  {
    icon: <FolderArchive className="w-10 h-10 text-indigo-500" />,
    title: "Дигитална архива",
    desc: "Приступите важним документима заједнице — записници, уговори, фактуре, правилници. Сви документи су безбедно ускладиштени.",
  },
  {
    icon: <Phone className="w-10 h-10 text-indigo-500" />,
    title: "Контакти",
    desc: "Брз приступ контактима за хитне случајеве, одржавање и управљање зградом. Увек при руци када вам затреба.",
  },
  {
    icon: <Settings className="w-10 h-10 text-indigo-500" />,
    title: "Подешавања",
    desc: "У подешавањима можете ажурирати своје податке, промените лозинку и управљати имејл обавештењима. Препоручујемо да промените лозинку при првој пријави.",
  },
]

const STORAGE_KEY = "resident-tour-seen-v1"

export function ResidentTour({ userId }: { userId: string }) {
  const key = `${STORAGE_KEY}-${userId}`
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(key)) {
      setOpen(true)
    }
  }, [key])

  function close() {
    localStorage.setItem(key, "1")
    setOpen(false)
    setStep(0)
  }

  function next() {
    if (step < SLIDES.length - 1) setStep(step + 1)
    else close()
  }

  function prev() {
    if (step > 0) setStep(step - 1)
  }

  const slide = SLIDES[step]

  return (
    <>
      {/* Help trigger button */}
      <button
        onClick={() => { setStep(0); setOpen(true) }}
        className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Помоћ — водич кроз портал"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {/* Tour modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <span className="text-xs text-muted-foreground">
                {step + 1} / {SLIDES.length}
              </span>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center text-center px-8 py-6 gap-4 min-h-[220px] justify-center">
              {slide.icon}
              <h2 className="text-xl font-semibold">{slide.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{slide.desc}</p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-4">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === step ? "bg-primary w-4" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-2 px-5 pb-5">
              <Button
                variant="outline"
                size="sm"
                onClick={prev}
                disabled={step === 0}
                className="w-9 px-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={next} className="flex-1">
                {step === SLIDES.length - 1 ? "Завршi" : (
                  <>Следеће <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
