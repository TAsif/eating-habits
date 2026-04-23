import { useEffect, useState } from "react"
import { Heart, Sparkles, ArrowLeft, RotateCcw, Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { QUESTIONS } from "@/lib/questions"
import { analyzeAnswers } from "@/lib/analyze"

function Shell({ children }) {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-rose-50 via-background to-pink-50 dark:from-rose-950/20 dark:via-background dark:to-pink-950/20 px-4 py-8 sm:py-12 flex items-center justify-center">
      <div className="w-full max-w-xl">
        {children}
      </div>
    </div>
  )
}

function detectProvider(key) {
  if (key.startsWith("sk")) return "openai"
  if (key.startsWith("AI")) return "gemini"
  return null
}

function Welcome({ apiKey, setApiKey, onStart }) {
  const provider = detectProvider(apiKey.trim())
  const canStart = provider !== null && apiKey.trim().length > 10
  const hint = provider === "openai"
    ? "OpenAI key detected"
    : provider === "gemini"
    ? "Gemini key detected"
    : "Paste an OpenAI (sk-…) or Gemini (AIza…) key"

  return (
    <Card className="animate-in fade-in zoom-in-95 duration-300">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl sm:text-3xl">Hi there <Sparkles className="inline size-5 text-primary" /></CardTitle>
        <CardDescription className="text-base">
          A gentle {QUESTIONS.length}-question check-in to see how emotions and eating
          show up for you, plus some tips to try.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="api-key">API key</Label>
        <Input
          id="api-key"
          type="password"
          placeholder="sk-… or AIza…"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          autoComplete="off"
        />
        <p className={cn("text-xs", provider ? "text-primary" : "text-muted-foreground")}>
          {hint}
        </p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" disabled={!canStart} onClick={onStart}>
          Let's begin
        </Button>
      </CardFooter>
    </Card>
  )
}

function QuestionCard({ index, total, question, value, onSelect, onSetValue }) {
  const progress = ((index + (value != null ? 1 : 0)) / total) * 100
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {index + 1} of {total}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
        <CardTitle className="text-lg sm:text-xl pt-2 leading-snug">{question.text}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={value ?? ""}
          onValueChange={(v) => onSetValue(v, index)}
          className="gap-2"
        >
          {question.options.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`opt-${index}-${opt.value}`}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-card px-4 py-3 cursor-pointer transition-colors",
                "hover:bg-accent/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              )}
            >
              <RadioGroupItem
                id={`opt-${index}-${opt.value}`}
                value={opt.value}
                onClick={() => onSelect(opt.value, index)}
                className="mt-0.5"
              />
              <span className="text-sm font-normal leading-snug">
                <span className="text-muted-foreground font-medium mr-2">{opt.value}.</span>
                {opt.label}
              </span>
            </Label>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}

function Quiz({ answers, onSelect, onSetValue, onBack, current, setApi }) {
  return (
    <div className="space-y-3">
      <Carousel
        setApi={setApi}
        opts={{ watchDrag: false, duration: 22 }}
        className="w-full"
      >
        <CarouselContent>
          {QUESTIONS.map((q, i) => (
            <CarouselItem key={i}>
              <QuestionCard
                index={i}
                total={QUESTIONS.length}
                question={q}
                value={answers[i]}
                onSelect={onSelect}
                onSetValue={onSetValue}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="flex">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={current === 0}
          className="w-full"
        >
          <ArrowLeft /> Back
        </Button>
      </div>
    </div>
  )
}

function LoadingCard() {
  return (
    <Card className="animate-in fade-in zoom-in-95 duration-300">
      <CardHeader className="text-center">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          Reading your answers…
        </CardTitle>
        <CardDescription>One sec while the nutritionist has a look.</CardDescription>
      </CardHeader>
    </Card>
  )
}

function Result({ result, onRestart }) {
  return (
    <Card className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
      <CardHeader className="text-center space-y-3">
        <CardDescription>Your result</CardDescription>
        <CardTitle className="text-2xl sm:text-3xl">{result.level}</CardTitle>
        <div className="pt-1 space-y-2">
          <Progress value={result.score} />
          <div className="text-xs text-muted-foreground">{result.score} / 100</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm leading-relaxed text-center">{result.summary}</p>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Tips to try
          </h3>
          <ul className="space-y-2">
            {result.tips.map((tip, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm rounded-lg border bg-muted/40 px-3 py-2 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${150 + i * 80}ms`, animationFillMode: "both", animationDuration: "400ms" }}
              >
                <span className="text-primary font-semibold">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onRestart}>
          <RotateCcw /> Take it again
        </Button>
      </CardFooter>
    </Card>
  )
}

function ErrorCard({ message, onRetry, onRestart }) {
  return (
    <Card className="animate-in fade-in zoom-in-95 duration-300">
      <CardHeader>
        <CardTitle className="text-xl">Something went wrong</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onRestart}>Start over</Button>
        <Button className="flex-1" onClick={onRetry}>Try again</Button>
      </CardFooter>
    </Card>
  )
}

export default function App() {
  const [phase, setPhase] = useState("welcome")
  const [apiKey, setApiKey] = useState("")
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null))
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [api, setApi] = useState(null)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) return
    const sync = () => setCurrent(api.selectedScrollSnap())
    sync()
    api.on("select", sync)
    return () => { api.off("select", sync) }
  }, [api])

  const runSubmit = async (finalAnswers) => {
    setPhase("loading")
    setError(null)
    try {
      const data = await analyzeAnswers({
        provider: detectProvider(apiKey.trim()),
        apiKey,
        answers: finalAnswers,
        questions: QUESTIONS,
      })
      setResult(data)
      setPhase("result")
    } catch (e) {
      setError(e.message || "Couldn't reach the AI. Check your API key and try again.")
      setPhase("error")
    }
  }

  const onSetValue = (val, i) => {
    setAnswers((prev) => {
      if (prev[i] === val) return prev
      const next = [...prev]
      next[i] = val
      return next
    })
  }

  const onSelect = (val, i) => {
    const next = [...answers]
    next[i] = val
    setAnswers(next)
    if (i < QUESTIONS.length - 1) {
      setTimeout(() => api?.scrollNext(), 180)
    } else {
      setTimeout(() => runSubmit(next), 220)
    }
  }

  const onBack = () => api?.scrollPrev()

  const restart = () => {
    setAnswers(Array(QUESTIONS.length).fill(null))
    setResult(null)
    setError(null)
    setCurrent(0)
    api?.scrollTo(0, true)
    setPhase("welcome")
  }

  return (
    <Shell>
      {phase === "welcome" && (
        <Welcome
          apiKey={apiKey}
          setApiKey={setApiKey}
          onStart={() => setPhase("quiz")}
        />
      )}
      {phase === "quiz" && (
        <Quiz
          answers={answers}
          onSelect={onSelect}
          onSetValue={onSetValue}
          onBack={onBack}
          current={current}
          setApi={setApi}
        />
      )}
      {phase === "loading" && <LoadingCard />}
      {phase === "result" && result && <Result result={result} onRestart={restart} />}
      {phase === "error" && (
        <ErrorCard
          message={error}
          onRetry={() => runSubmit(answers)}
          onRestart={restart}
        />
      )}
    </Shell>
  )
}
