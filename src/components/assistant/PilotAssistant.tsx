import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles, Search, HelpCircle, X, Compass, BookOpen, Layers,
  ChevronRight, ArrowRight, ExternalLink, Lightbulb, CheckCircle2,
  ListOrdered, Play, RotateCcw, MessageSquare, Zap, Send, Settings,
  Bot, User, Key, Cpu, CornerDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScreenInspector } from './ScreenInspector';
import {
  APP_CONCEPTS,
  PAGE_GUIDES,
  WORKFLOW_GUIDES,
  searchAssistant,
  type AssistantAnswer,
  type WorkflowGuide
} from '@/lib/assistant/assistantKnowledge';
import { assistantService } from '@/services';
import { useTranslation } from '@/hooks/useTranslation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; path?: string }[];
  model?: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'How do I do bulk uniform issue to a class?',
  'What is the difference between warehouse and location?',
  'How do I promote students to the next grade?',
  'What does reorder level mean?',
  'How do purchase orders and receiving work?',
];

export function PilotAssistant() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [inspectorActive, setInspectorActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'inspect' | 'workflows'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowGuide | null>(null);

  // Groq API Key & Model Settings
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem('stockpilot_groq_api_key') || ''
  );
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem('stockpilot_groq_model') || 'openai/gpt-oss-120b'
  );
  const [showConfigModal, setShowConfigModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Current page guide based on location.pathname
  const currentPageGuide = useMemo(() => {
    return PAGE_GUIDES[location.pathname] || Object.values(PAGE_GUIDES).find(p => location.pathname.startsWith(p.path));
  }, [location.pathname]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Listen for custom trigger event (e.g. from Header or Cmd+K)
  useEffect(() => {
    function handleToggle() {
      setIsOpen(prev => !prev);
    }
    window.addEventListener('stockpilot:toggle-assistant' as any, handleToggle);
    return () => {
      window.removeEventListener('stockpilot:toggle-assistant' as any, handleToggle);
    };
  }, []);

  function handleStartInspector() {
    setIsOpen(false);
    setInspectorActive(true);
  }

  function handleSaveConfig() {
    setApiKey(tempApiKey.trim());
    localStorage.setItem('stockpilot_groq_api_key', tempApiKey.trim());
    localStorage.setItem('stockpilot_groq_model', selectedModel);
    setShowConfigModal(false);
  }

  async function handleSendMessage(promptText?: string) {
    const textToSend = (promptText || inputMessage).trim();
    if (!textToSend || isThinking) return;

    setInputMessage('');

    // Add user message to thread
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsThinking(true);

    try {
      const res = await assistantService.chat({
        message: textToSend,
        current_path: location.pathname,
        api_key: apiKey || undefined,
        model: selectedModel,
        history: newHistory.map(m => ({ role: m.role, content: m.content })),
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        actions: res.actions,
        model: res.model,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      // Local fallback in case of network issue
      const localResults = searchAssistant(textToSend, location.pathname);
      let fallbackText = "I encountered an error communicating with the AI service. Here is what I found in the local knowledge base:\n\n";

      if (localResults.length > 0) {
        const top = localResults[0];
        fallbackText += `**${top.title}**\n${top.explanation}\n\n${top.howToUse || ''}`;
      } else {
        fallbackText += "Could not reach AI. Please check your Groq API key in Settings.";
      }

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fallbackText,
          actions: localResults[0]?.actions || [],
          model: 'local-fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <>
      {/* Screen Inspector Overlay */}
      <ScreenInspector
        active={inspectorActive}
        onClose={() => setInspectorActive(false)}
        currentPath={location.pathname}
      />

      {/* Persistent Floating Dock Button */}
      {!isOpen && !inspectorActive && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200 border border-white/20 font-medium text-xs sm:text-sm select-none cursor-pointer"
            title={t('Open StockPilot Assistant')}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
            </span>
            <Sparkles className="h-4 w-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
            <span className="font-semibold tracking-tight">{t('Ask Pilot AI')}</span>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] text-cyan-100 border-white/30 bg-white/10 py-0">
              ⚡ Groq LLaMA
            </Badge>
          </button>
        </div>
      )}

      {/* Assistant Modal / Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-3.5 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm tracking-tight text-white">{t('StockPilot Copilot')}</h2>
                </div>
                <p className="text-[11px] text-slate-300 truncate max-w-[280px]">
                  {currentPageGuide ? currentPageGuide.title : t('Ask anything about StockPilot')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg"
                onClick={() => { setTempApiKey(apiKey); setShowConfigModal(true); }}
                title={t('Groq AI Settings')}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center border-b px-2 bg-muted/40 text-xs font-medium">
            <button
              onClick={() => { setActiveTab('chat'); setSelectedWorkflow(null); }}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              {t('Groq AI Copilot')}
            </button>
            <button
              onClick={() => { setActiveTab('inspect'); setSelectedWorkflow(null); }}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'inspect'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              {t('What is This?')}
            </button>
            <button
              onClick={() => { setActiveTab('workflows'); setSelectedWorkflow(null); }}
              className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'workflows'
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              {t('Workflows')}
            </button>
          </div>

          {/* Tab 1: AI Copilot Chat */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-background">
              {/* Chat Messages List */}
              <ScrollArea className="flex-1 p-3.5 space-y-3.5">
                {messages.length === 0 ? (
                  /* Welcome Screen */
                  <div className="py-4 space-y-4">
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-emerald-500/10 border border-cyan-500/20 text-center space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground">
                        {t('Hello! How can I help you in StockPilot?')}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                        {t('I can explain any feature, guide multi-step workflows, or navigate across modules.')}
                      </p>
                      {!apiKey && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => { setTempApiKey(apiKey); setShowConfigModal(true); }}
                            className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <Key className="h-3 w-3" />
                            {t('Configure your free Groq API key')} →
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick Suggested Prompts */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Lightbulb className="h-3 w-3 text-amber-500" />
                        {t('Try asking')}:
                      </p>
                      <div className="space-y-1.5">
                        {QUICK_PROMPTS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(p)}
                            className="w-full text-left p-2 rounded-lg border bg-card text-card-foreground text-xs hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group cursor-pointer"
                          >
                            <span className="group-hover:text-primary transition-colors">{p}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Conversation Threads */
                  <div className="space-y-3.5 pb-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div className={`space-y-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-xs'
                                : 'bg-muted/70 text-foreground border rounded-bl-xs whitespace-pre-line'
                            }`}
                          >
                            {msg.content}
                          </div>

                          {/* Action Buttons if available */}
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {msg.actions.map((act) => (
                                <Button
                                  key={act.label}
                                  size="sm"
                                  className="h-6 text-[11px] bg-cyan-600 hover:bg-cyan-700 text-white gap-1 shadow-2xs"
                                  onClick={() => {
                                    if (act.path) {
                                      if (act.path.startsWith('http')) {
                                        window.open(act.path, '_blank');
                                      } else {
                                        navigate(act.path);
                                        setIsOpen(false);
                                      }
                                    }
                                  }}
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  {act.label}
                                </Button>
                              ))}
                            </div>
                          )}

                          <span className="text-[10px] text-muted-foreground/70 px-1 block">
                            {msg.timestamp}
                          </span>
                        </div>

                        {msg.role === 'user' && (
                          <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Thinking Indicator */}
                    {isThinking && (
                      <div className="flex gap-2.5 items-center text-xs text-muted-foreground animate-in fade-in">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="p-2.5 rounded-2xl bg-muted/60 border flex items-center gap-1.5">
                          <span className="flex gap-1 items-center">
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" />
                          </span>
                          <span className="text-[11px] ml-1">{t('Groq LLaMA is thinking...')}</span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input Bar */}
              <div className="p-3 border-t bg-card/60 backdrop-blur-xs">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    className="h-9 text-xs flex-1 bg-background"
                    placeholder={t('Ask anything (e.g. "How do I issue school uniforms?")...')}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isThinking}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputMessage.trim() || isThinking}
                    className="h-9 px-3 bg-primary text-primary-foreground shrink-0 text-xs gap-1"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('Send')}</span>
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* Tab 2: What is This? (Screen Inspector) */}
          {activeTab === 'inspect' && (
            <ScrollArea className="flex-1 p-4 space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-900/30 to-slate-900/30 border border-cyan-500/30 text-center space-y-2.5">
                <div className="h-10 w-10 mx-auto rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40">
                  <Compass className="h-5 w-5 animate-pulse" />
                </div>
                <h3 className="font-bold text-sm text-foreground">{t('Interactive Screen Inspector')}</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  {t('Hover over any button, card, input, or table header on your screen to see what it is, why it matters, and how to use it.')}
                </p>
                <Button
                  onClick={handleStartInspector}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs h-8 px-4 shadow-md"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {t('Start Point & Learn')}
                </Button>
              </div>

              {/* Elements on This Page */}
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('Key UI Elements on this Screen')} ({currentPageGuide?.keyElements.length || 0})
                </p>

                {currentPageGuide?.keyElements.map((item, idx) => (
                  <Card key={idx} className="border shadow-2xs">
                    <CardContent className="p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
                          {item.name}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{item.whatItIs}</p>
                      <div className="bg-muted/40 p-2 rounded text-[11px] text-foreground/90 border border-border/50">
                        <strong>{t('How to use')}:</strong> {item.instructions}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Tab 3: Step-by-Step Guided Workflows */}
          {activeTab === 'workflows' && (
            <ScrollArea className="flex-1 p-4 space-y-4">
              {selectedWorkflow ? (
                /* Single Workflow Detail */
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedWorkflow(null)}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground -ml-2"
                  >
                    ← {t('Back to all workflows')}
                  </Button>

                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary/10 to-teal-500/10 border border-primary/20 space-y-1.5">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                      {selectedWorkflow.category}
                    </Badge>
                    <h3 className="font-bold text-sm text-foreground">{selectedWorkflow.title}</h3>
                    <p className="text-xs text-muted-foreground">{selectedWorkflow.summary}</p>
                    <p className="text-[11px] text-muted-foreground/80 font-mono">
                      ⏱ {selectedWorkflow.estimatedMinutes} {t('minutes')} • {selectedWorkflow.steps.length} {t('steps')}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedWorkflow.steps.map((st) => (
                      <div key={st.stepNumber} className="p-3 rounded-lg border bg-card text-card-foreground text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                              {st.stepNumber}
                            </span>
                            {st.title}
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed pl-7">
                          {st.description}
                        </p>
                        {st.tip && (
                          <div className="ml-7 bg-amber-500/10 border border-amber-500/20 p-2 rounded text-[11px] text-amber-900 dark:text-amber-200">
                            <strong>Tip:</strong> {st.tip}
                          </div>
                        )}
                        <div className="pl-7 pt-1">
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              navigate(st.targetPath);
                              setIsOpen(false);
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            {st.actionText || t('Go to Step')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* All Workflows List */
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-foreground">{t('Step-by-Step Interactive Workflows')}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('Pick a complete workflow below to follow exact steps from setup to execution.')}
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {WORKFLOW_GUIDES.map((wf) => (
                      <Card
                        key={wf.id}
                        className="cursor-pointer hover:border-primary/50 hover:shadow-xs transition-all"
                        onClick={() => setSelectedWorkflow(wf)}
                      >
                        <CardContent className="p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary">
                              {wf.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ~{wf.estimatedMinutes} mins
                            </span>
                          </div>
                          <h4 className="font-semibold text-xs text-foreground flex items-center justify-between">
                            <span>{wf.title}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {wf.summary}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium pt-1">
                            <span>{wf.steps.length} {t('guided steps')}</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          )}

          {/* Footer */}
          <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1 text-[11px]">
              <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
              {t('Powered by Groq Cloud')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              {t('Close')}
            </Button>
          </div>
        </div>
      )}

      {/* Groq Settings Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-amber-500" />
              {t('Groq AI Copilot Settings')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
              <p className="font-semibold">{t('100% Free Groq Model Integration')}</p>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {t('Groq provides high-speed LPU inference on open models completely free with generous rate limits. No credit card required.')}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('Select Free Groq Model')}</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai/gpt-oss-120b">
                    <strong>openai/gpt-oss-120b</strong> (Flagship 120B Model — 100% Free)
                  </SelectItem>
                  <SelectItem value="openai/gpt-oss-20b">
                    <strong>openai/gpt-oss-20b</strong> (Fast & Responsive 20B — 100% Free)
                  </SelectItem>
                  <SelectItem value="qwen/qwen3.8-27b">
                    <strong>qwen/qwen3.8-27b</strong> (Multilingual 27B Model — 100% Free)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t('Groq API Key')}</Label>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  {t('Get Free Key')} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <Input
                type="password"
                className="h-8 text-xs font-mono"
                placeholder="gsk_..."
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                {t('Saved locally in your browser, or configure GROQ_API_KEY in your server .env file.')}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowConfigModal(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-primary text-primary-foreground"
              onClick={handleSaveConfig}
            >
              {t('Save Configuration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
