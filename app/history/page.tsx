"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, ArrowLeft, Trash2, Copy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { format } from "date-fns"

interface PasswordHistoryItem {
  password: string
  strength: string
  timestamp: string
  settings: {
    length: number
    uppercase: boolean
    lowercase: boolean
    numbers: boolean
    symbols: boolean
    symbolGroups?: {
      [key: string]: boolean
    }
  }
}

export default function HistoryPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const [history, setHistory] = useState<PasswordHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to view your password history",
      })
      router.push("/login")
      return
    }

    // Load password history
    try {
      const savedHistory = localStorage.getItem("passwordHistory")
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory))
      }
    } catch (error) {
      console.error("Error loading password history:", error)
      toast({
        title: "Error",
        description: "Failed to load password history",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, router, toast])

  const copyToClipboard = (password: string) => {
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

  const deleteHistoryItem = (index: number) => {
    const newHistory = [...history]
    newHistory.splice(index, 1)
    setHistory(newHistory)
    localStorage.setItem("passwordHistory", JSON.stringify(newHistory))

    toast({
      title: "Deleted",
      description: "Password removed from history",
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.setItem("passwordHistory", JSON.stringify([]))

    toast({
      title: "Cleared",
      description: "Password history has been cleared",
    })
  }

  const reuseSettings = (settings: PasswordHistoryItem["settings"]) => {
    // Store settings in localStorage to be used on the main page
    localStorage.setItem("lastUsedSettings", JSON.stringify(settings))

    toast({
      title: "Settings Saved",
      description: "Password settings will be applied on the generator",
    })

    router.push("/")
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "Very Strong":
        return "bg-emerald-500"
      case "Strong":
        return "bg-green-500"
      case "Medium":
        return "bg-amber-500"
      case "Weak":
        return "bg-orange-500"
      default:
        return "bg-red-500"
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
              <Shield className="mr-2 h-8 w-8 text-emerald-500" />
              SecureGen
            </h1>
          </Link>
          <p className="text-slate-300">Your Password History</p>
        </motion.div>

        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Generator
          </Button>

          <Button
            variant="destructive"
            onClick={clearHistory}
            disabled={history.length === 0}
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear History
          </Button>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Password History</CardTitle>
              <CardDescription className="text-slate-300">Your recently generated passwords</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>No password history found</p>
                  <p className="mt-2 text-sm">Generate some passwords to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {history.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className="bg-slate-900 border-slate-700">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm text-slate-400">
                                  {format(new Date(item.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                                <div className="flex items-center mt-1">
                                  <div className={`h-3 w-3 rounded-full mr-2 ${getStrengthColor(item.strength)}`}></div>
                                  <p className="text-sm text-slate-300">{item.strength}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(item.password)}
                                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteHistoryItem(index)}
                                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="bg-slate-800 p-3 rounded-md font-mono text-white break-all mb-3">
                              {item.password}
                            </div>

                            <div className="text-xs text-slate-400 flex flex-wrap gap-2">
                              <span className="bg-slate-800 px-2 py-1 rounded">Length: {item.settings.length}</span>
                              {item.settings.uppercase && <span className="bg-slate-800 px-2 py-1 rounded">A-Z</span>}
                              {item.settings.lowercase && <span className="bg-slate-800 px-2 py-1 rounded">a-z</span>}
                              {item.settings.numbers && <span className="bg-slate-800 px-2 py-1 rounded">0-9</span>}
                              {item.settings.symbols && (
                                <span className="bg-slate-800 px-2 py-1 rounded">
                                  Symbols
                                  {item.settings.symbolGroups && (
                                    <span className="text-slate-500 ml-1">
                                      {Object.entries(item.settings.symbolGroups)
                                        .filter(([_, value]) => value)
                                        .map(([key]) => key.charAt(0).toUpperCase())
                                        .join("")}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reuseSettings(item.settings)}
                                className="text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Reuse these settings
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t border-slate-700 pt-4">
              <p className="text-sm text-slate-400">Password history is stored locally on your device</p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </main>
  )
}
