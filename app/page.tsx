"use client"

import { useState, useEffect } from "react"
import { Copy, RefreshCw, Shield, Eye, EyeOff, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

// Replace with your actual API URL when deployed
const API_URL = "https://securegen-api.example.com"

export default function Home() {
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const [password, setPassword] = useState("")
  const [passwordLength, setPasswordLength] = useState(16)
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [strengthScore, setStrengthScore] = useState(0)
  const [strengthText, setStrengthText] = useState("Medium")
  const [isLoading, setIsLoading] = useState(false)
  const [isLocalGeneration, setIsLocalGeneration] = useState(true)
  const [showPassword, setShowPassword] = useState(true)
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([])

  // First, add state variables for the symbol groups after the existing state declarations
  const [symbolGroups, setSymbolGroups] = useState({
    punctuation: true, // .,;:
    brackets: true, // [{<>}]
    math: true, // +=-_*
    special: true, // !@#$%^&
    other: true, // ~`|\/?"'
  })

  // Generate password locally as fallback if API is not available
  const generateLocalPassword = () => {
    let charset = ""
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz"
    if (includeNumbers) charset += "0123456789"

    // Handle symbols with specific groups
    if (includeSymbols) {
      if (symbolGroups.punctuation) charset += ".,;:"
      if (symbolGroups.brackets) charset += "[]{}()<>"
      if (symbolGroups.math) charset += "+-=_*"
      if (symbolGroups.special) charset += "!@#$%^&"
      if (symbolGroups.other) charset += "~`|\\/?\"'"
    }

    if (charset === "") {
      toast({
        title: "Error",
        description: "Please select at least one character set",
        variant: "destructive",
      })
      return ""
    }

    let result = ""
    const charactersLength = charset.length
    for (let i = 0; i < passwordLength; i++) {
      result += charset.charAt(Math.floor(Math.random() * charactersLength))
    }

    // Calculate strength with the enhanced algorithm
    const strengthResult = calculatePasswordStrength(result)
    setStrengthScore(strengthResult.score)
    setStrengthText(strengthResult.strength)
    setPasswordFeedback(strengthResult.feedback)

    return result
  }

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0
    const feedback: string[] = []

    // Base score from length
    if (pwd.length >= 16) {
      score += 25
    } else if (pwd.length >= 12) {
      score += 20
    } else if (pwd.length >= 8) {
      score += 10
    } else {
      score += 5
      feedback.push("Password is too short")
    }

    // Character variety
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd)

    if (hasUpper) score += 10
    if (hasLower) score += 10
    if (hasNumber) score += 10
    if (hasSymbol) score += 15

    if (!hasUpper) feedback.push("Add uppercase letters")
    if (!hasLower) feedback.push("Add lowercase letters")
    if (!hasNumber) feedback.push("Add numbers")
    if (!hasSymbol) feedback.push("Add symbols")

    // Check for variety
    const charVariety = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSymbol ? 1 : 0)
    if (charVariety < 3) {
      feedback.push("Use more types of characters")
    }

    // Check for patterns
    if (/(.)\1{2,}/.test(pwd)) {
      score -= 10
      feedback.push("Avoid repeated characters")
    }

    if (/^[A-Za-z]+$/.test(pwd) || /^[0-9]+$/.test(pwd)) {
      score -= 15
      feedback.push("Mix character types")
    }

    // Check for sequential characters
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(pwd)) {
      score -= 10
      feedback.push("Avoid sequential characters")
    }

    if (/123|234|345|456|567|678|789|890/.test(pwd)) {
      score -= 10
      feedback.push("Avoid sequential numbers")
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score))

    // Determine strength category
    let strength = "Weak"
    if (score >= 80) strength = "Very Strong"
    else if (score >= 60) strength = "Strong"
    else if (score >= 40) strength = "Medium"
    else if (score >= 20) strength = "Weak"
    else strength = "Very Weak"

    return { score, strength, feedback }
  }

  const generatePassword = async () => {
    if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
      toast({
        title: "Error",
        description: "Please select at least one character set",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      if (isLocalGeneration) {
        const localPassword = generateLocalPassword()
        setPassword(localPassword)

        // Save to history if user is logged in
        if (user && localPassword) {
          savePasswordToHistory(localPassword, strengthText)
        }
      } else {
        const response = await fetch(`${API_URL}/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            length: passwordLength,
            uppercase: includeUppercase,
            lowercase: includeLowercase,
            numbers: includeNumbers,
            symbols: includeSymbols,
            symbolGroups: includeSymbols ? symbolGroups : null,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to generate password")
        }

        const data = await response.json()
        setPassword(data.password)

        // Calculate strength with our enhanced algorithm
        const strengthResult = calculatePasswordStrength(data.password)
        setStrengthScore(strengthResult.score)
        setStrengthText(strengthResult.strength)
        setPasswordFeedback(strengthResult.feedback)

        // Save to history if user is logged in
        if (user && data.password) {
          savePasswordToHistory(data.password, strengthResult.strength)
        }
      }
    } catch (error) {
      console.error("Error generating password:", error)
      // Fallback to local generation if API fails
      const localPassword = generateLocalPassword()
      setPassword(localPassword)
      setIsLocalGeneration(true)

      // Save to history if user is logged in
      if (user && localPassword) {
        savePasswordToHistory(localPassword, strengthText)
      }

      toast({
        title: "API Unavailable",
        description: "Using local password generation instead",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const savePasswordToHistory = async (pwd: string, strength: string) => {
    try {
      // In a real app, this would be a server action or API call
      // For this example, we'll use localStorage
      const history = JSON.parse(localStorage.getItem("passwordHistory") || "[]")
      history.unshift({
        password: pwd,
        strength: strength,
        timestamp: new Date().toISOString(),
        settings: {
          length: passwordLength,
          uppercase: includeUppercase,
          lowercase: includeLowercase,
          numbers: includeNumbers,
          symbols: includeSymbols,
        },
      })

      // Keep only the last 10 passwords
      if (history.length > 10) {
        history.pop()
      }

      localStorage.setItem("passwordHistory", JSON.stringify(history))
    } catch (error) {
      console.error("Error saving password to history:", error)
    }
  }

  const copyToClipboard = () => {
    if (!password) return

    navigator.clipboard.writeText(password).then(
      () => {
        toast({
          title: "Copied!",
          description: "Password copied to clipboard",
        })
      },
      (err) => {
        console.error("Could not copy text: ", err)
        toast({
          title: "Error",
          description: "Failed to copy password",
          variant: "destructive",
        })
      },
    )
  }

  const viewHistory = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to view your password history",
      })
      router.push("/login")
      return
    }

    router.push("/history")
  }

  // Generate password on initial load
  useEffect(() => {
    generatePassword()
    // Check if API is available
    fetch(`${API_URL}/health`)
      .then((response) => {
        if (response.ok) {
          setIsLocalGeneration(false)
        }
      })
      .catch(() => {
        setIsLocalGeneration(true)
      })
  }, [])

  const getStrengthColor = () => {
    if (strengthScore >= 80) return "bg-emerald-500"
    if (strengthScore >= 60) return "bg-green-500"
    if (strengthScore >= 40) return "bg-amber-500"
    if (strengthScore >= 20) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
            <Shield className="mr-2 h-8 w-8 text-emerald-500" />
            SecureGen
          </h1>
          <p className="text-slate-300">Generate secure, customizable passwords</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Password Generator</CardTitle>
                  <CardDescription className="text-slate-300">Customize your password settings below</CardDescription>
                </div>
                {user ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={viewHistory}
                    className="text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <History className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/login")}
                    className="text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    Login
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <div className="bg-slate-900 p-4 rounded-lg flex items-center justify-between break-all group">
                  <p className="text-xl font-mono text-white">
                    {showPassword
                      ? password || "Generate a password"
                      : password
                        ? "•".repeat(password.length)
                        : "Generate a password"}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!password}
                      className="text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyToClipboard}
                      disabled={!password}
                      className="text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Strength: {strengthText}</span>
                    <span className="text-sm text-slate-300">{strengthScore}/100</span>
                  </div>
                  <Progress value={strengthScore} className={`h-2 ${getStrengthColor()}`} />

                  {passwordFeedback.length > 0 && (
                    <div className="mt-2 text-sm text-slate-300 bg-slate-900/50 p-2 rounded">
                      <p className="font-semibold mb-1">Suggestions:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        {passwordFeedback.map((feedback, index) => (
                          <li key={index}>{feedback}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900">
                  <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-white">Password Length: {passwordLength}</Label>
                    </div>
                    <Slider
                      value={[passwordLength]}
                      min={4}
                      max={32}
                      step={1}
                      onValueChange={(value) => setPasswordLength(value[0])}
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-3">
                    <motion.div
                      className="flex items-center justify-between"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="uppercase" className="text-white">
                        Uppercase Letters (A-Z)
                      </Label>
                      <Switch
                        id="uppercase"
                        checked={includeUppercase}
                        onCheckedChange={setIncludeUppercase}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="lowercase" className="text-white">
                        Lowercase Letters (a-z)
                      </Label>
                      <Switch
                        id="lowercase"
                        checked={includeLowercase}
                        onCheckedChange={setIncludeLowercase}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="numbers" className="text-white">
                        Numbers (0-9)
                      </Label>
                      <Switch
                        id="numbers"
                        checked={includeNumbers}
                        onCheckedChange={setIncludeNumbers}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                    </motion.div>

                    <motion.div
                      className="flex items-center justify-between"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Label htmlFor="symbols" className="text-white">
                        Symbols (!@#$%^&*)
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
                          onClick={() => setIncludeSymbols(!includeSymbols)}
                          title={includeSymbols ? "Hide symbol options" : "Show symbol options"}
                        >
                          <span className="text-xs">{includeSymbols ? "−" : "+"}</span>
                        </Button>
                        <Switch
                          id="symbols"
                          checked={includeSymbols}
                          onCheckedChange={(checked) => {
                            setIncludeSymbols(checked)
                          }}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </div>
                    </motion.div>

                    {includeSymbols && (
                      <motion.div
                        className="ml-6 mt-2 space-y-3 border-l-2 border-slate-700 pl-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <p className="text-sm text-slate-300 mb-2">Select symbol groups:</p>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="punctuation" className="text-sm text-slate-300">
                            Punctuation (.,;:)
                          </Label>
                          <Switch
                            id="punctuation"
                            checked={symbolGroups.punctuation}
                            onCheckedChange={(checked) => setSymbolGroups({ ...symbolGroups, punctuation: checked })}
                            className="data-[state=checked]:bg-emerald-500 h-4 w-7"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="brackets" className="text-sm text-slate-300">
                            Brackets ([]{"{<>}"}])
                          </Label>
                          <Switch
                            id="brackets"
                            checked={symbolGroups.brackets}
                            onCheckedChange={(checked) => setSymbolGroups({ ...symbolGroups, brackets: checked })}
                            className="data-[state=checked]:bg-emerald-500 h-4 w-7"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="math" className="text-sm text-slate-300">
                            Math operators (+-=_*)
                          </Label>
                          <Switch
                            id="math"
                            checked={symbolGroups.math}
                            onCheckedChange={(checked) => setSymbolGroups({ ...symbolGroups, math: checked })}
                            className="data-[state=checked]:bg-emerald-500 h-4 w-7"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="special" className="text-sm text-slate-300">
                            Special (!@#$%^&)
                          </Label>
                          <Switch
                            id="special"
                            checked={symbolGroups.special}
                            onCheckedChange={(checked) => setSymbolGroups({ ...symbolGroups, special: checked })}
                            className="data-[state=checked]:bg-emerald-500 h-4 w-7"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="other" className="text-sm text-slate-300">
                            Other (~`|\/?"')
                          </Label>
                          <Switch
                            id="other"
                            checked={symbolGroups.other}
                            onCheckedChange={(checked) => setSymbolGroups({ ...symbolGroups, other: checked })}
                            className="data-[state=checked]:bg-emerald-500 h-4 w-7"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="advanced" className="space-y-4 pt-4">
                  <div className="space-y-2 text-sm text-slate-300">
                    <p>Advanced settings will be available in the next update.</p>
                    <p>Coming soon:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Custom character sets</li>
                      <li>Required character types</li>
                      <li>Exclude similar characters</li>
                      <li>Password templates</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={generatePassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Generate New Password
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <div className="text-center text-sm text-slate-400">
          <p>{isLocalGeneration ? "Using local password generation" : "Connected to SecureGen API"}</p>
          <p className="mt-2">© {new Date().getFullYear()} SecureGen. All rights reserved.</p>
        </div>
      </div>
    </main>
  )
}
