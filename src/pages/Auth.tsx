import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import PasswordStrength, { getPasswordStrength } from "@/components/PasswordStrength";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Pickaxe, Loader2, Mail, Lock, Sparkles, Search, MessageSquare, BarChart3, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const floatingIcons = [
  { Icon: Search, x: "10%", y: "20%", delay: 0 },
  { Icon: MessageSquare, x: "85%", y: "15%", delay: 0.5 },
  { Icon: BarChart3, x: "15%", y: "75%", delay: 1 },
  { Icon: Sparkles, x: "80%", y: "70%", delay: 1.5 },
  { Icon: Pickaxe, x: "50%", y: "10%", delay: 0.8 },
];

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notRobot, setNotRobot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateCaptcha = useCallback(() => {
    if (!notRobot) {
      toast({ title: "Verificação necessária", description: "Marque a caixa 'Não sou robô' para continuar.", variant: "destructive" });
      return false;
    }
    return true;
  }, [notRobot]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCaptcha()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCaptcha()) return;
    const { isValid } = getPasswordStrength(password);
    if (!isValid) {
      toast({ title: "Senha fraca", description: "Sua senha não atende todos os requisitos de segurança.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data.error || "Erro ao cadastrar. Tente novamente mais tarde.";
        const isDisabled = errorMsg.includes("desabilitados") || errorMsg.includes("cadastros");
        const isEmailInUse = errorMsg.includes("já está em uso") || errorMsg.includes("already been registered");
        toast({
          title: isDisabled ? "Cadastro indisponível" : isEmailInUse ? "Email já cadastrado" : "Erro no cadastro",
          description: isDisabled
            ? "No momento, novos cadastros não estão sendo aceitos. Entre em contato com o administrador."
            : isEmailInUse
            ? "Este email já possui uma conta. Tente fazer login."
            : errorMsg,
          variant: "destructive",
        });
      } else {
        toast({ title: "Cadastro realizado!", description: "Você já pode fazer login." });
      }
    } catch (err: unknown) {
      console.error("Signup error:", err);
      toast({ title: "Erro", description: "Erro ao tentar cadastrar. Tente novamente.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />

        {/* Floating icons */}
        {floatingIcons.map(({ Icon, x, y, delay }, i) => (
          <motion.div
            key={i}
            className="absolute text-primary-foreground/15"
            style={{ left: x, top: y }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
          >
            <Icon className="h-10 w-10" />
          </motion.div>
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/20 backdrop-blur-sm border border-primary-foreground/10">
                <Pickaxe className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-primary-foreground tracking-tight">Lead Miner</h1>
                <p className="text-sm text-primary-foreground/70 font-medium">Prospecção inteligente</p>
              </div>
            </div>

            <h2 className="text-4xl xl:text-5xl font-extrabold text-primary-foreground leading-tight mb-6">
              Minere leads.
              <br />
              Converta clientes.
            </h2>

            <p className="text-lg text-primary-foreground/80 leading-relaxed max-w-md mb-10">
              Extraia dados do Google Maps, pontue oportunidades e dispare mensagens via WhatsApp — tudo automatizado.
            </p>

            <div className="space-y-4">
              {[
                "Mineração por cidade e nicho",
                "Scoring automático de oportunidade",
                "Disparo em massa via WhatsApp",
              ].map((item, i) => (
                <motion.div
                  key={item}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
                    <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-primary-foreground/90 font-medium">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar ao início
          </button>
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 pb-8">
          <motion.div
            className="w-full max-w-sm space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" as const }}
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center gap-2 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Pickaxe className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Lead Miner</h1>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
              <p className="text-muted-foreground text-sm">Entre na sua conta ou crie uma nova</p>
            </div>

            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="w-full h-11 bg-muted">
                <TabsTrigger value="login" className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 space-y-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {/* Captcha */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="captcha-login"
                        checked={notRobot}
                        onCheckedChange={(checked) => setNotRobot(checked === true)}
                      />
                      <Label htmlFor="captcha-login" className="text-sm font-medium cursor-pointer">
                        Não sou robô
                      </Label>
                    </div>
                    <ShieldCheck className={`h-5 w-5 transition-colors ${notRobot ? "text-primary" : "text-muted-foreground/40"}`} />
                  </div>
                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading || !notRobot}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar na conta"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 space-y-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha segura"
                        className="pl-10 pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>
                  {/* Captcha */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="captcha-signup"
                        checked={notRobot}
                        onCheckedChange={(checked) => setNotRobot(checked === true)}
                      />
                      <Label htmlFor="captcha-signup" className="text-sm font-medium cursor-pointer">
                        Não sou robô
                      </Label>
                    </div>
                    <ShieldCheck className={`h-5 w-5 transition-colors ${notRobot ? "text-primary" : "text-muted-foreground/40"}`} />
                  </div>
                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading || !notRobot}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-center text-muted-foreground">
              Ao continuar, você concorda com os{" "}
              <a href="#/terms" target="_blank" className="underline hover:text-foreground transition-colors">
                termos de uso
              </a>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
